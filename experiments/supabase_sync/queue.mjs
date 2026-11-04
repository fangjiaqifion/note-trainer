// Experimental only: no access to game accounts or real student records.
export function createQueue({storage, key, send}) {
  let pending = null;
  function load() {
    const raw = storage.getItem(key);
    if (raw === null) return [];
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== 'string')) {
      throw new Error('Invalid sync queue');
    }
    return rows;
  }
  function enqueue(row) {
    if (!row || typeof row.id !== 'string' || !row.id) throw new Error('Missing event ID');
    const rows = load();
    const existing = rows.find(item => item.id === row.id);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(row)) throw new Error('Event ID conflict');
      return;
    }
    storage.setItem(key, JSON.stringify([...rows, row]));
  }
  async function sync() {
    if (pending) return pending;
    pending = (async () => {
      const batch = load();
      if (!batch.length) return 0;
      // Acknowledgements must identify exactly the persisted event IDs.
      const ack = await send(batch);
      if (!Array.isArray(ack) || ack.length !== batch.length ||
          new Set(ack).size !== batch.length || batch.some(row => !ack.includes(row.id))) {
        throw new Error('Incomplete server acknowledgement');
      }
      const sent = new Set(ack);
      // Re-read after the request: answers added during upload must remain queued.
      const current = load();
      storage.setItem(key, JSON.stringify(current.filter(row => !sent.has(row.id))));
      return batch.length;
    })();
    try { return await pending; } finally { pending = null; }
  }
  return {enqueue, sync, list: load};
}
