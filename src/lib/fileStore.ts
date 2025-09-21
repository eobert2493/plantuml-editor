// Lightweight IndexedDB-backed file store for PlantUML documents

export interface FileMetadata {
  id: string;
  name: string;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  size: number; // bytes, content length
}

export interface FileRecord extends FileMetadata {
  content: string;
}

const DB_NAME = 'plantuml-files-db';
const DB_VERSION = 1;
const STORE_META = 'files';
const STORE_BODY = 'fileBodies';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        const filesStore = db.createObjectStore(STORE_META, { keyPath: 'id' });
        filesStore.createIndex('by_name', 'name', { unique: false });
        filesStore.createIndex('by_updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_BODY)) {
        db.createObjectStore(STORE_BODY, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function withStores<T>(mode: IDBTransactionMode, stores: string[], fn: (tx: IDBTransaction) => Promise<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    fn(tx).then((result) => {
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }).catch(reject);
  });
}

export async function listFiles(): Promise<FileMetadata[]> {
  return withStores('readonly', [STORE_META], async (tx) => {
    const store = tx.objectStore(STORE_META);
    return new Promise<FileMetadata[]>((resolve, reject) => {
      const items: FileMetadata[] = [];
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const value = cursor.value as FileMetadata;
          items.push(value);
          cursor.continue();
        } else {
          items.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(items);
        }
      };
      request.onerror = () => reject(request.error);
    });
  });
}

export async function getFile(id: string): Promise<FileRecord | null> {
  return withStores('readonly', [STORE_META, STORE_BODY], async (tx) => {
    const metaStore = tx.objectStore(STORE_META);
    const bodyStore = tx.objectStore(STORE_BODY);
    const metaReq = metaStore.get(id);
    const bodyReq = bodyStore.get(id);
    return new Promise<FileRecord | null>((resolve, reject) => {
      let meta: FileMetadata | undefined;
      let body: { id: string; content: string } | undefined;
      metaReq.onsuccess = () => {
        meta = metaReq.result as FileMetadata | undefined;
        if (body !== undefined) finalize();
      };
      metaReq.onerror = () => reject(metaReq.error);
      bodyReq.onsuccess = () => {
        body = bodyReq.result as { id: string; content: string } | undefined;
        if (meta !== undefined) finalize();
      };
      bodyReq.onerror = () => reject(bodyReq.error);
      function finalize() {
        if (!meta) return resolve(null);
        resolve({ ...(meta as FileMetadata), content: body?.content ?? '' });
      }
    });
  });
}

export async function createFile(name: string, content: string): Promise<FileRecord> {
  const now = Date.now();
  const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto) ? (globalThis.crypto as any).randomUUID() : `${now}-${Math.random().toString(36).slice(2)}`;
  // Ensure unique name by appending increment if duplicates exist
  const db = await openDb();
  const txCheck = db.transaction([STORE_META], 'readonly');
  const existingNames: string[] = await new Promise((resolve, reject) => {
    const names: string[] = [];
    const req = txCheck.objectStore(STORE_META).openCursor();
    req.onsuccess = () => {
      const cursor = req.result as IDBCursorWithValue | null;
      if (cursor) {
        names.push((cursor.value as FileMetadata).name);
        cursor.continue();
      } else {
        resolve(names);
      }
    };
    req.onerror = () => reject(req.error);
  });
  let uniqueName = name;
  if (existingNames.includes(uniqueName)) {
    const base = name.replace(/(\.puml)$/i, '');
    const ext = name.endsWith('.puml') ? '.puml' : '';
    let i = 2;
    while (existingNames.includes(`${base} (${i})${ext}`)) i++;
    uniqueName = `${base} (${i})${ext}`;
  }
  const meta: FileMetadata = { id, name: uniqueName, createdAt: now, updatedAt: now, size: content.length };
  await withStores('readwrite', [STORE_META, STORE_BODY], async (tx) => {
    await requestAsPromise(tx.objectStore(STORE_META).add(meta));
    await requestAsPromise(tx.objectStore(STORE_BODY).add({ id, content }));
    return Promise.resolve();
  });
  return { ...meta, content };
}

export async function updateFileContent(id: string, content: string): Promise<void> {
  const now = Date.now();
  await withStores('readwrite', [STORE_META, STORE_BODY], async (tx) => {
    const metaStore = tx.objectStore(STORE_META);
    const existing = await requestAsPromise(metaStore.get(id)) as FileMetadata | undefined;
    if (!existing) return;
    const updated: FileMetadata = { ...existing, updatedAt: now, size: content.length };
    await requestAsPromise(metaStore.put(updated));
    await requestAsPromise(tx.objectStore(STORE_BODY).put({ id, content }));
    return Promise.resolve();
  });
}

export async function renameFile(id: string, name: string): Promise<void> {
  await withStores('readwrite', [STORE_META], async (tx) => {
    const metaStore = tx.objectStore(STORE_META);
    const existing = await requestAsPromise(metaStore.get(id)) as FileMetadata | undefined;
    if (!existing) return;
    const updated: FileMetadata = { ...existing, name, updatedAt: Date.now() };
    await requestAsPromise(metaStore.put(updated));
    return Promise.resolve();
  });
}

export async function deleteFile(id: string): Promise<void> {
  await withStores('readwrite', [STORE_META, STORE_BODY], async (tx) => {
    await requestAsPromise(tx.objectStore(STORE_META).delete(id));
    await requestAsPromise(tx.objectStore(STORE_BODY).delete(id));
    return Promise.resolve();
  });
}

export async function duplicateFile(id: string): Promise<FileRecord | null> {
  const existing = await getFile(id);
  if (!existing) return null;
  const baseName = existing.name.replace(/(\.puml)$/i, '');
  const newName = `${baseName} Copy.puml`;
  return createFile(newName, existing.content);
}

export async function exportFile(id: string): Promise<{ name: string; content: string } | null> {
  const file = await getFile(id);
  if (!file) return null;
  return { name: file.name, content: file.content };
}

export async function ensureDefault(initialContent: string): Promise<FileRecord> {
  const files = await listFiles();
  if (files.length > 0) {
    const first = files[0];
    const full = await getFile(first.id);
    return full as FileRecord;
  }
  return createFile('Untitled.puml', initialContent);
}

function requestAsPromise<T = unknown>(req: IDBRequest): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}


