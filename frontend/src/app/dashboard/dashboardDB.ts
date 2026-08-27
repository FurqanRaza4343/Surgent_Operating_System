// Single shared IndexedDB database + version for every dashboard feature
// that needs client-side storage (doctors, patients, ...). Deliberately
// centralized instead of each feature managing its own indexedDB.open() call
// against the SAME database name — two independent opens with different
// version numbers race (whichever bumps the version first "wins" that
// upgrade, and the other feature's store never gets created; opening at a
// version LOWER than the current one throws VersionError outright). One
// open, one version, one place that lists every store — add a new store
// here when a new feature needs one, bump DB_VERSION by 1.
const DB_NAME = "aesthetixai_dashboard";
const DB_VERSION = 2;
const STORES = ["doctors", "patients"];
const KEY = "all";

function openDashboardDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      for (const store of STORES) {
        if (!req.result.objectStoreNames.contains(store)) {
          req.result.createObjectStore(store);
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // Fires (instead of onsuccess/onerror) when another tab holds an open
    // connection at an older version and blocks this one's upgrade — without
    // this it just hangs forever with neither callback ever firing.
    req.onblocked = () => reject(new Error("IndexedDB open blocked by another tab"));
  });
}

export async function loadAll<T>(store: string): Promise<T | undefined> {
  const db = await openDashboardDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(KEY);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAll<T>(store: string, value: T): Promise<void> {
  const db = await openDashboardDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
