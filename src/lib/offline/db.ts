/**
 * A very small IndexedDB wrapper. Hand-rolled rather than pulled in, because
 * the cleaner app only needs three stores and this keeps the offline bundle
 * tiny — it has to load on a two-bar connection.
 */
const DB_NAME = 'proper-crm';
const DB_VERSION = 1;

export const STORE_QUEUE = 'queue';
export const STORE_CACHE = 'cache';

let dbPromise: Promise<IDBDatabase> | null = null;

export function isSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const store = db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the local database'));
  });

  return dbPromise;
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local database error'));
  });
}

export async function put<T>(store: string, value: T): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  await promisify(tx.objectStore(store).put(value));
}

export async function remove(store: string, key: IDBValidKey): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  await promisify(tx.objectStore(store).delete(key));
}

export async function getAll<T>(store: string): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(store, 'readonly');
  return promisify(tx.objectStore(store).getAll() as IDBRequest<T[]>);
}

export async function get<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDb();
  const tx = db.transaction(store, 'readonly');
  return promisify(tx.objectStore(store).get(key) as IDBRequest<T | undefined>);
}

export async function clear(store: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  await promisify(tx.objectStore(store).clear());
}
