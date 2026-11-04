/**
 * Cloud persistence repository for Building Schedule.
 * Designed for a configured Supabase client and Auth session.
 * NO browser LocalStorage writes to project data are made by this adapter.
 *
 * Integration is intentionally not switched on until a real database project
 * is configured and RLS / save / reload / migration tests pass.
 */
export function createCloudScheduleRepository(supabase) {
  if (!supabase?.auth || !supabase?.from || !supabase?.rpc) {
    throw new TypeError('A configured Supabase client is required.');
  }

  async function currentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data?.user) throw new Error('Sign in before accessing cloud schedules.');
    return data.user;
  }

  function assertDocument(document) {
    if (!document || typeof document !== 'object' || !Array.isArray(document.tasks)) {
      throw new TypeError('Expected schedule document containing a tasks array.');
    }
    return structuredClone(document);
  }

  // Postgres JSONB does not preserve object key insertion order.
  function normalizeJSON(value) {
    if (Array.isArray(value)) return value.map(normalizeJSON);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalizeJSON(value[key])]));
    }
    return value;
  }

  async function load() {
    const user = await currentUser();
    const { data, error } = await supabase
      .from('user_schedules')
      .select('document,revision,updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return data === null ? null : {
      document: assertDocument(data.document),
      revision: Number(data.revision),
      updatedAt: data.updated_at
    };
  }

  // First-time initialization only. Never overwrite a pre-existing cloud record.
  async function createEmpty() {
    const user = await currentUser();
    const initial = { tasks: [], project: {}, ranks: [], schemaVersion: 1 };
    const { data, error } = await supabase
      .from('user_schedules')
      .insert({ user_id: user.id, document: initial, revision: 0 })
      .select('document,revision,updated_at')
      .single();
    if (error) throw error;
    return { document: assertDocument(data.document), revision: Number(data.revision), updatedAt: data.updated_at };
  }

  // Do not auto-merge conflicting edits. Caller must show a conflict UI.
  async function save(document, expectedRevision) {
    assertDocument(document);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      throw new TypeError('expectedRevision must be the last server revision.');
    }
    await currentUser();
    const { data, error } = await supabase.rpc('save_my_schedule', {
      expected_revision: expectedRevision,
      next_document: document
    });
    if (error) throw error;
    return { revision: Number(data) };
  }

  /**
   * Explicit one-time import path. Always confirm with the user before calling.
   * Caller MUST keep the original LocalStorage and backup intact until verified.
   * Requires a newly initialized, empty cloud schedule.
   */
  async function importFromDevice(document, shouldConfirm) {
    const safeDocument = assertDocument(document);
    const existing = await load();
    if (existing && existing.document.tasks.length) {
      throw new Error('Cloud schedule already contains tasks. Import must not overwrite it.');
    }
    if (typeof shouldConfirm !== 'function' || !(await shouldConfirm({
      localCount: safeDocument.tasks.length,
      cloudCount: existing?.document.tasks.length ?? 0
    }))) return { imported: false };
    const current = existing ?? await createEmpty();
    const result = await save(safeDocument, current.revision);
    const verify = await load();
    if (!verify || verify.revision !== result.revision ||
        JSON.stringify(normalizeJSON(verify.document)) !== JSON.stringify(normalizeJSON(safeDocument))) {
      throw new Error('Import verification failed. Keep device backup and retry.');
    }
    return { imported: true, revision: result.revision, document: verify.document };
  }

  return { currentUser, load, createEmpty, save, importFromDevice };
}
