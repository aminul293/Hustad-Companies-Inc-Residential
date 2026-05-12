/**
 * PHOTO STORAGE LAYER (v2)
 * Handles local persistence of image blobs using IndexedDB.
 * This prevents SessionState/LocalStorage from growing too large.
 */

const DB_NAME = "hustad_photos_db";
const STORE_NAME = "photos";
const DB_VERSION = 1;

/**
 * Initialize IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a blob to IndexedDB
 */
export async function savePhotoBlob(photoId: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(blob, photoId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve a blob from IndexedDB
 */
export async function getPhotoBlob(photoId: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(photoId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("IndexedDB error:", err);
    return null;
  }
}

/**
 * Delete a photo from IndexedDB
 */
export async function deletePhotoBlob(photoId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(photoId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Convert Base64 to Blob
 */
export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(";base64,");
  const contentType = parts[0].split(":")[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Convert Blob to Base64 (for legacy fallback if needed)
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Object URL Management ──────────────────────────────────────────────────

const objectUrls = new Map<string, string>();

/**
 * Gets a temporary Object URL for an IndexedDB blob.
 * Memoizes for performance during a session.
 */
export async function getPhotoObjectURL(photoId: string): Promise<string | null> {
  if (objectUrls.has(photoId)) return objectUrls.get(photoId)!;

  const blob = await getPhotoBlob(photoId);
  if (!blob) return null;

  const url = URL.createObjectURL(blob);
  objectUrls.set(photoId, url);
  return url;
}

/**
 * Clean up object URLs to prevent memory leaks
 */
export function revokePhotoObjectURL(photoId: string) {
  const url = objectUrls.get(photoId);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrls.delete(photoId);
  }
}
