// Everything lives in this phone's IndexedDB. Nothing is sent anywhere.
const NAME = 'slipbook'
const VERSION = 1
const STORES = ['kv', 'items', 'invoices', 'proofs']

let dbPromise

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        db.createObjectStore('kv', { keyPath: 'key' })
        db.createObjectStore('items', { keyPath: 'id' })
        db.createObjectStore('invoices', { keyPath: 'id' })
        db.createObjectStore('proofs', { keyPath: 'id' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function run(store, mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = fn(t.objectStore(store))
        t.oncomplete = () => resolve(req ? req.result : undefined)
        t.onerror = () => reject(t.error)
        t.onabort = () => reject(t.error)
      }),
  )
}

export const getAll = (store) => run(store, 'readonly', (s) => s.getAll())
export const getOne = (store, id) => run(store, 'readonly', (s) => s.get(id))
export const putOne = (store, obj) => run(store, 'readwrite', (s) => s.put(obj))
export const delOne = (store, id) => run(store, 'readwrite', (s) => s.delete(id))

export async function exportAll() {
  const [kv, items, invoices, proofs] = await Promise.all(STORES.map(getAll))
  return { kv, items, invoices, proofs }
}

// Wipes the database and fills it with `data` (or leaves it empty).
export async function replaceAll(data = {}) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORES, 'readwrite')
    STORES.forEach((name) => {
      const store = t.objectStore(name)
      store.clear()
      ;(data[name] || []).forEach((row) => store.put(row))
    })
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

// Asks the browser not to clear our data when the phone is low on space.
export async function askPersist() {
  try {
    await navigator.storage?.persist?.()
  } catch {
    // Not supported, nothing to do.
  }
}
