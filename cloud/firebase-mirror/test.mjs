import test from 'node:test';
import assert from 'node:assert/strict';
import { mirrorNextOutboxEvent } from './mirror-core.mjs';

function makeMocks({ rows = [], remote = {}, fails = false } = {}) {
  const entries = rows.map(x => ({ ...x, mirrored_at: null, attempts: 0 }));
  const data = new Map(Object.entries(remote));
  let writes = 0;
  const client = {
    async query(statement, args = []) {
      const s = statement.toLowerCase().trim();
      if (s === 'begin' || s === 'commit' || s === 'rollback') return { rows: [] };
      if (s.startsWith('select id,')) return { rows: entries.filter(x => !x.mirrored_at).slice(0, 1) };
      if (s.includes('set mirrored_at = now()')) {
        const row = entries.find(x => x.id === args[0]);
        row.mirrored_at = 'now';
        row.attempts++;
        return { rows: [] };
      }
      if (s.includes('set attempts = attempts + 1')) {
        const row = entries.find(x => x.id === args[0]);
        row.attempts++;
        row.last_error = args[1];
        return { rows: [] };
      }
      throw new Error('Unexpected SQL: ' + statement);
    },
    release() {}
  };
  const pool = { connect: async () => client };
  const firestore = {
    collection(name) {
      assert.equal(name, 'schedule_mirrors');
      return { doc: (id) => ({ id }) };
    },
    async runTransaction(operation) {
      if (fails) throw new Error('Firestore unavailable');
      const writesToCommit = [];
      const tx = {
        get: async ref => ({
          exists: data.has(ref.id),
          data: () => data.get(ref.id)
        }),
        set: (ref, value) => { writesToCommit.push([ref.id, value]); }
      };
      const result = await operation(tx);
      for (const [id, value] of writesToCommit) {
        writes++;
        data.set(id, value);
      }
      return result;
    }
  };
  return { pool, firestore, entries, data, getWrites: () => writes };
}

const example = (revision = 1) => ({
  id: revision,
  user_id: 'f0000000-0000-4000-8000-000000000001',
  revision: String(revision),
  document: { tasks: [{ id: 'a', name: '基礎工事' }], project: {}, ranks: [] }
});

test('mirrors a pending schedule to Firestore', async () => {
  const env = makeMocks({ rows: [example()] });
  const result = await mirrorNextOutboxEvent(env);
  assert.equal(result.status, 'written');
  assert.equal(env.entries[0].mirrored_at, 'now');
  assert.equal(env.data.get(example().user_id).revision, 1);
  assert.equal(env.getWrites(), 1);
});

test('does not overwrite a newer revision in Firebase', async () => {
  const row = example(1);
  const env = makeMocks({
    rows: [row],
    remote: { [row.user_id]: { revision: 2, document: { tasks: [{ id: 'newer' }] } } }
  });
  const result = await mirrorNextOutboxEvent(env);
  assert.equal(result.status, 'already-current');
  assert.equal(env.data.get(row.user_id).revision, 2);
  assert.equal(env.getWrites(), 0);
  assert.equal(env.entries[0].mirrored_at, 'now');
});

test('preserves pending event when Firebase is unavailable', async () => {
  const env = makeMocks({ rows: [example()], fails: true });
  await assert.rejects(() => mirrorNextOutboxEvent(env), /Firestore unavailable/);
  assert.equal(env.entries[0].mirrored_at, null);
  assert.equal(env.entries[0].attempts, 1);
});

test('empty outbox makes no writes', async () => {
  const env = makeMocks();
  const result = await mirrorNextOutboxEvent(env);
  assert.equal(result.status, 'empty');
  assert.equal(env.getWrites(), 0);
});

test('rejects documents too large for a reliable single-document mirror', async () => {
  const row = example();
  row.document.tasks[0].name = 'あ'.repeat(260000);
  const env = makeMocks({ rows: [row] });
  await assert.rejects(() => mirrorNextOutboxEvent(env), /750 KiB/);
  assert.equal(env.entries[0].mirrored_at, null);
  assert.equal(env.getWrites(), 0);
});
