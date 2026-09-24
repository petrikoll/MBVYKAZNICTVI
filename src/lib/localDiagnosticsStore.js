const DATABASE_NAME = 'mb-local-diagnostics-v1';

function createDiagnosticsStore({ indexedDB = globalThis.indexedDB, databaseName = DATABASE_NAME } = {}) {
  let connection;

  function open() {
    if (!connection) connection = new Promise((resolve, reject) => {
      if (!indexedDB) { reject(new Error('Místní úložiště není dostupné.')); return; }
      const request = indexedDB.open(databaseName, 1);
      let expired = false;
      const timeout = setTimeout(() => { expired = true; reject(new Error('Místní úložiště neodpovídá.')); }, 3000);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('events', { keyPath: 'id' });
        store.createIndex('chronological', ['timestamp', 'id']);
      };
      request.onsuccess = () => {
        clearTimeout(timeout);
        const db = request.result;
        if (expired) { db.close(); return; }
        db.onversionchange = () => { db.close(); connection = null; };
        resolve(db);
      };
      request.onerror = request.onblocked = () => {
        clearTimeout(timeout);
        expired = true;
        reject(request.error || new Error('Místní úložiště je blokované.'));
      };
    });
    return connection;
  }

  async function transact(events, { cutoff, maxEvents }, collect) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('events', 'readwrite');
      const store = transaction.objectStore('events');
      const result = [];
      const timeout = setTimeout(() => {
        try { transaction.abort(); } catch { /* Already complete. */ }
        reject(new Error('Místní úložiště neodpovídá.'));
      }, 3000);
      transaction.oncomplete = () => { clearTimeout(timeout); resolve(result); };
      transaction.onabort = transaction.onerror = () => {
        clearTimeout(timeout);
        reject(transaction.error || new Error('Místní zápis se nezdařil.'));
      };
      events.forEach((event) => store.put(event));
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        let excess = Math.max(0, countRequest.result - maxEvents);
        const cursorRequest = store.index('chronological').openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) return;
          if (cursor.value.timestamp < cutoff || excess > 0) {
            cursor.delete();
            excess = Math.max(0, excess - 1);
            cursor.continue();
          } else if (collect) {
            result.push(cursor.value);
            cursor.continue();
          }
          // Ordinary writes stop at the first retained event. Only an explicit
          // download walks the history; clicks never rescan all 2,000 entries.
        };
      };
    });
  }

  return {
    append: (events, limits) => transact(events, limits, false),
    read: (limits) => transact([], limits, true)
  };
}

export { createDiagnosticsStore };
