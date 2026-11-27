import type { FontAsset, FontFamilyGroup } from "../types/studio";

const DB_NAME = "reticula_studio_fonts_db";
const STORE_NAME = "custom_fonts";

interface StoredFontRecord {
  id: string;
  name: string;
  fileName: string;
  formatLabel: string;
  category?: FontFamilyGroup;
  buffer: ArrayBuffer;
}

export function inferFontCategory(name: string): FontFamilyGroup {
  const lower = name.toLowerCase();
  if (/(mono|code|courier|consolas|jetbrains|fira|terminal|typewriter)/.test(lower)) {
    return "mono";
  }
  if (/(serif|garamond|playfair|bodoni|didot|times|lora|baskerville|georgia|caslon|merriweather|slab)/.test(lower)) {
    return "serif";
  }
  if (/(sans|grotesk|jakarta|montserrat|inter|roboto|lato|poppins|dm\s|helvetica|arial|open\s|nunito|raleway|work\s)/.test(lower)) {
    return "sans";
  }
  return "display";
}

function openFontDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function cleanFontDisplayName(fileName: string): string {
  const withoutExt = fileName.replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/, "");
  return withoutExt
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFormatLabel(fileName: string): string {
  const match = fileName.match(/\.(ttf|otf|woff2?)$/i);
  return match ? match[1].toUpperCase() : "FONT";
}

export async function registerFontBuffer(
  id: string,
  displayName: string,
  buffer: ArrayBuffer
): Promise<string> {
  const uniqueFamilyName = `Custom_${id.replace(/[^a-zA-Z0-9]/g, "")}`;
  const fontFace = new FontFace(uniqueFamilyName, buffer.slice(0));
  await fontFace.load();
  document.fonts.add(fontFace);
  return `"${uniqueFamilyName}", "${displayName}", sans-serif`;
}

export async function uploadCustomFontFile(file: File): Promise<FontAsset> {
  const validExt = /\.(ttf|otf|woff|woff2)$/i.test(file.name);
  if (!validExt) {
    throw new Error("Formato no compatible. Sube archivos .TTF, .OTF, .WOFF o .WOFF2.");
  }

  const buffer = await file.arrayBuffer();
  const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const name = cleanFontDisplayName(file.name) || "Fuente Personalizada";
  const formatLabel = getFormatLabel(file.name);
  const category = inferFontCategory(name);
  const family = await registerFontBuffer(id, name, buffer);

  try {
    const db = await openFontDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const record: StoredFontRecord = {
      id,
      name,
      fileName: file.name,
      formatLabel,
      category,
      buffer,
    };
    store.put(record);
  } catch {
    // Non-fatal if storage is blocked in private mode
  }

  return {
    id,
    name,
    family,
    category,
    isCustom: true,
    fileName: file.name,
    formatLabel,
  };
}

export async function loadSavedCustomFonts(): Promise<FontAsset[]> {
  try {
    const db = await openFontDb();
    const records: StoredFontRecord[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as StoredFontRecord[]) || []);
      req.onerror = () => reject(req.error);
    });

    const loaded: FontAsset[] = [];
    for (const rec of records) {
      try {
        const family = await registerFontBuffer(rec.id, rec.name, rec.buffer);
        loaded.push({
          id: rec.id,
          name: rec.name,
          family,
          category: rec.category || inferFontCategory(rec.name),
          isCustom: true,
          fileName: rec.fileName,
          formatLabel: rec.formatLabel,
        });
      } catch {
        // Ignore corrupted font buffer
      }
    }
    return loaded;
  } catch {
    return [];
  }
}

export async function updateSavedCustomFontCategory(
  id: string,
  category: FontFamilyGroup
): Promise<void> {
  try {
    const db = await openFontDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result as StoredFontRecord | undefined;
        if (record) {
          record.category = category;
          store.put(record);
        }
        resolve();
      };
      getReq.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

export async function deleteSavedCustomFont(id: string): Promise<void> {
  try {
    const db = await openFontDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
  } catch {
    // Ignore
  }
}
