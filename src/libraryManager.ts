const DB_NAME = 'StringifyDB';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

export interface SongEntry {
  name: string;
  audioData: ArrayBuffer;
}

let dbInstance: IDBDatabase | null = null;

export async function initLibrary(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve();
    };
    
    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };
  });
}

export async function saveSong(name: string, arrayBuffer: ArrayBuffer): Promise<void> {
  if (!dbInstance) await initLibrary();
  return new Promise((resolve, reject) => {
    const tx = dbInstance!.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entry: SongEntry = { name, audioData: arrayBuffer };
    
    const request = store.put(entry);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSongList(): Promise<string[]> {
  if (!dbInstance) await initLibrary();
  return new Promise((resolve, reject) => {
    const tx = dbInstance!.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    
    request.onsuccess = () => resolve(request.result as string[]);
    request.onerror = () => reject(request.error);
  });
}

export async function getSongData(name: string): Promise<ArrayBuffer | null> {
  if (!dbInstance) await initLibrary();
  return new Promise((resolve, reject) => {
    const tx = dbInstance!.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(name);
    
    request.onsuccess = () => {
      const result = request.result as SongEntry | undefined;
      resolve(result ? result.audioData : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSong(name: string): Promise<void> {
  if (!dbInstance) await initLibrary();
  return new Promise((resolve, reject) => {
    const tx = dbInstance!.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(name);
    
    request.onsuccess = () => {
      // Also cleanup local storage chart
      try {
        localStorage.removeItem(`chart_${name}`);
      } catch (e) {}
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}
