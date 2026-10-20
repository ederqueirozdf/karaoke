const DB_NAME = "karaoke-offline-videos";
const STORE_NAME = "videos";

export type OfflineVideo = {
  key: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
};

function normalizeSongKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildSongVideoKey(title: string, artist: string) {
  const titleKey = normalizeSongKey(title) || "titulo";
  const artistKey = normalizeSongKey(artist) || "artista";
  return `song-${titleKey}-${artistKey}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB não está disponível neste navegador."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Não foi possível abrir o banco de vídeos locais."));
    };
  });
}

export async function saveVideoForSong(title: string, artist: string, file: File) {
  const key = buildSongVideoKey(title, artist);
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({
      id: key,
      name: file.name,
      mimeType: file.type || "video/mp4",
      size: file.size,
      data: file,
      updatedAt: Date.now(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Erro ao salvar o vídeo local."));
  });

  return { key, name: file.name, size: file.size };
}

export async function getVideoForSong(title: string, artist: string): Promise<OfflineVideo | null> {
  const key = buildSongVideoKey(title, artist);

  try {
    const db = await openDatabase();
    const record = await new Promise<{ id: string; name: string; size: number; mimeType: string; data: Blob } | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve((request.result as { id: string; name: string; size: number; mimeType: string; data: Blob } | undefined) ?? null);
      };

      request.onerror = () => reject(request.error ?? new Error("Erro ao buscar vídeo local."));
    });

    if (!record) return null;

    return {
      key: record.id,
      name: record.name,
      size: record.size,
      mimeType: record.mimeType,
      url: URL.createObjectURL(record.data),
    };
  } catch {
    return null;
  }
}

export async function deleteVideoForSong(title: string, artist: string) {
  const key = buildSongVideoKey(title, artist);

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Erro ao remover vídeo local."));
    });
  } catch {
    // Ignored: if there is no saved local video, there is nothing to remove.
  }
}
