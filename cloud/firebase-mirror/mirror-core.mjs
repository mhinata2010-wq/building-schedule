/**
 * Durable Supabase -> Cloud Firestore mirror worker (server-only).
 * SQL transaction locks an outbox event until Firestore has acknowledged it.
 * Firestore transaction uses monotonic revision to prevent stale overwrite.
 * Never import this worker in GitHub Pages or expose its DB credentials.
 */
export async function mirrorNextOutboxEvent({ pool, firestore }) {
  if (!pool?.connect || !firestore?.runTransaction || !firestore?.collection) {
    throw new TypeError('Requires trusted PostgreSQL pool and Firebase Admin Firestore.');
  }
  const client = await pool.connect();
  let current = null;
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;
    const { rows } = await client.query(
      'select id, user_id::text as user_id, revision::text as revision, document ' +
      'from private.schedule_mirror_outbox where mirrored_at is null ' +
      'order by id limit 1 for update skip locked'
    );
    if (!rows.length) {
      await client.query('COMMIT');
      transactionOpen = false;
      return { status: 'empty' };
    }
    current = rows[0];
    const revision = Number(current.revision);
    if (!Number.isSafeInteger(revision) || revision < 0) {
      throw new Error('Unsupported revision in mirror event.');
    }
    if (!current.document || !Array.isArray(current.document.tasks)) {
      throw new Error('Invalid mirror document: missing tasks array.');
    }
    // Firestore Standard allows at most 1 MiB per document. Guard conservatively.
    const documentSize = new TextEncoder().encode(JSON.stringify(current.document)).length;
    if (documentSize > 750 * 1024) {
      throw new Error('Mirror document exceeds 750 KiB guard; split schedule into task documents.');
    }

    const ref = firestore.collection('schedule_mirrors').doc(current.user_id);
    const outcome = await firestore.runTransaction(async tx => {
      const previous = await tx.get(ref);
      const previousRevision = previous.exists ? Number(previous.data().revision) : -1;
      if (previousRevision >= revision) return 'already-current';
      tx.set(ref, {
        source: 'supabase',
        userId: current.user_id,
        revision,
        document: current.document,
        mirroredAt: new Date().toISOString()
      });
      return 'written';
    });
    await client.query(
      'update private.schedule_mirror_outbox ' +
      'set mirrored_at = now(), attempts = attempts + 1, last_error = null where id = $1',
      [current.id]
    );
    await client.query('COMMIT');
    transactionOpen = false;
    return { status: outcome, userId: current.user_id, revision };
  } catch (error) {
    if (transactionOpen) {
      try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
    }
    if (current?.id !== undefined) {
      try {
        await client.query(
          'update private.schedule_mirror_outbox ' +
          'set attempts = attempts + 1, last_error = $2 where id = $1 and mirrored_at is null',
          [current.id, String(error?.message || error).slice(0, 500)]
        );
      } catch { /* original failure remains primary */ }
    }
    throw error;
  } finally {
    client.release();
  }
}
