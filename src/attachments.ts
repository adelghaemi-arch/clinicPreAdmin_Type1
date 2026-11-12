import type { IntakeAttachment } from "./types";

export const MAX_FILE_SIZE = 2 * 1024 * 1024;
export const MAX_FILES = 5;
const DB_NAME = "nabz-clinic-files-v1";
const STORE = "files";
let database: Promise<IDBDatabase> | null = null;

interface StoredAttachment {
  id: string;
  patientId: string;
  appointmentId: string;
  blob: Blob;
}

function openDatabase(): Promise<IDBDatabase> {
  if (database) return database;
  database = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("storage-unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        database = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      database = null;
      reject(request.error || new Error("storage-unavailable"));
    };
    request.onblocked = () => {
      database = null;
      reject(new Error("storage-blocked"));
    };
  });
  return database;
}

async function transact(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<unknown> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    let result: unknown;
    request.onsuccess = () => {
      result = request.result;
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () =>
      reject(transaction.error || request.error || new Error("storage-failed"));
    transaction.onabort = () =>
      reject(transaction.error || new Error("storage-failed"));
  });
}

export async function storeAttachment(
  id: string,
  patientId: string,
  appointmentId: string,
  file: File,
) {
  const record: StoredAttachment = { id, patientId, appointmentId, blob: file };
  await transact("readwrite", (store) => store.put(record));
}

export async function loadAttachment(id: string): Promise<Blob | null> {
  const result = (await transact("readonly", (store) => store.get(id))) as
    | StoredAttachment
    | undefined;
  return result?.blob || null;
}

export async function removeAttachment(id: string) {
  await transact("readwrite", (store) => store.delete(id));
}

export function safeLegacyUrl(file: IntakeAttachment) {
  return file.dataUrl &&
    /^data:(image\/(png|jpeg|webp)|application\/pdf);base64,/i.test(file.dataUrl)
    ? file.dataUrl
    : undefined;
}

/** Validate both the extension and the actual leading bytes; never trust MIME alone. */
export async function detectFileType(file: File): Promise<string | null> {
  const extension = file.name.toLowerCase().split(".").pop() || "";
  const expected: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  if (!expected[extension]) return null;
  if (file.type && !["application/pdf", "image/png", "image/jpeg", "image/webp", "application/octet-stream"].includes(file.type)) {
    return null;
  }
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = String.fromCharCode(...bytes);
  if (extension === "pdf" && ascii.startsWith("%PDF-")) return "application/pdf";
  if (extension === "png" && bytes[0] === 0x89 && ascii.slice(1, 4) === "PNG") return "image/png";
  if (["jpg", "jpeg"].includes(extension) && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (extension === "webp" && ascii.slice(0, 4) === "RIFF" && ascii.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}
