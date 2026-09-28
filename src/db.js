const DB_NAME = "zhixu-learning-library";
const DB_VERSION = 1;
const STORES = ["notes", "files", "folders", "checkins"];

let databasePromise;

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      for (const store of STORES) {
        if (!request.result.objectStoreNames.contains(store)) {
          request.result.createObjectStore(store, { keyPath: "id" });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("无法打开本地数据库"));
    request.onblocked = () => reject(new Error("数据库正在升级，请关闭其他已打开的知识库页面"));
  });
  return databasePromise;
}

export async function getAll(store) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, "readonly").objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getById(store, id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, "readonly").objectStore(store).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function put(store, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    transaction.objectStore(store).put(value);
    transaction.oncomplete = () => resolve(value);
    transaction.onerror = () => reject(transaction.error ?? new Error("写入本地数据失败"));
    transaction.onabort = () => reject(transaction.error ?? new Error("写入本地数据失败"));
  });
}

export async function remove(store, id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    transaction.objectStore(store).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("删除本地数据失败"));
  });
}

export async function replaceAll(data) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES, "readwrite");
    for (const store of STORES) {
      const objectStore = transaction.objectStore(store);
      objectStore.clear();
      for (const record of data[store] ?? []) objectStore.put(record);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("导入备份失败"));
    transaction.onabort = () => reject(transaction.error ?? new Error("导入备份失败"));
  });
}

export { STORES };
