import type { CustomPalette } from "../types/studio";

const STORAGE_KEY = "reticula_custom_palette_v1";

export function normalizeHexColor(input: string): string | null {
  const trimmed = input.trim();
  const match6 = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
  if (match6) {
    return `#${match6[1].toUpperCase()}`;
  }
  const match3 = trimmed.match(/^#?([0-9a-fA-F]{3})$/);
  if (match3) {
    const [r, g, b] = match3[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function parsePaletteFromText(content: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  const pushColor = (hex: string | null) => {
    if (!hex || seen.has(hex)) return;
    seen.add(hex);
    found.push(hex);
  };

  // 1. Match #RRGGBB and #RGB tokens
  const hexMatches = content.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g) || [];
  for (const token of hexMatches) {
    pushColor(normalizeHexColor(token));
  }

  // 2. Match rgb(r, g, b) / rgba(r, g, b, a)
  const rgbRegex = /rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})/gi;
  let m: RegExpExecArray | null;
  while ((m = rgbRegex.exec(content)) !== null) {
    pushColor(rgbToHex(Number(m[1]), Number(m[2]), Number(m[3])));
  }

  // 3. Match GIMP .gpl / plain space-separated RGB triplets per line (e.g. "212 163 89 Color")
  if (found.length === 0) {
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("GIMP")) continue;
      const gplMatch = trimmed.match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})(?:\s+.*)?$/);
      if (gplMatch) {
        const r = Number(gplMatch[1]);
        const g = Number(gplMatch[2]);
        const b = Number(gplMatch[3]);
        if (r <= 255 && g <= 255 && b <= 255) {
          pushColor(rgbToHex(r, g, b));
        }
      } else {
        // Also check bare 6-digit hex tokens separated by comma/space/newline
        const bareTokens = trimmed.split(/[\s,;]+/);
        for (const tok of bareTokens) {
          if (/^[0-9a-fA-F]{6}$/.test(tok)) {
            pushColor(normalizeHexColor(tok));
          }
        }
      }
    }
  }

  return found.slice(0, 16);
}

async function extractPaletteFromImageFile(file: File, maxColors = 8): Promise<string[]> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("No se pudo leer la imagen."));
    reader.onerror = () => reject(new Error("Error al leer la imagen de paleta."));
    reader.readAsDataURL(file);
  });

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No se pudo cargar la imagen de paleta."));
    img.src = dataUrl;
  });

  const w = 72;
  const h = 72;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Contexto 2D no disponible.");
  ctx.drawImage(img, 0, 0, w, h);

  const pixels = ctx.getImageData(0, 0, w, h).data;
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const qr = Math.round(r / 24) * 24;
    const qg = Math.round(g / 24) * 24;
    const qb = Math.round(b / 24) * 24;
    const key = `${qr},${qg},${qb}`;
    const prev = buckets.get(key);
    if (prev) {
      prev.r += r;
      prev.g += g;
      prev.b += b;
      prev.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  const sorted = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .map((b) => [b.r / b.count, b.g / b.count, b.b / b.count] as [number, number, number]);

  const picked: [number, number, number][] = [];
  for (const col of sorted) {
    if (
      picked.every(
        (p) => Math.hypot(p[0] - col[0], p[1] - col[1], p[2] - col[2]) > 38
      )
    ) {
      picked.push(col);
    }
    if (picked.length >= maxColors) break;
  }

  return picked.map(([r, g, b]) => rgbToHex(r, g, b));
}

export async function uploadPaletteFile(file: File): Promise<CustomPalette> {
  const cleanName = file.name.replace(/\.[^.]+$/, "") || "Paleta subida";

  if (file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".svg")) {
    const colors = await extractPaletteFromImageFile(file, 8);
    if (colors.length === 0) {
      throw new Error("No se pudieron detectar colores válidos en la imagen.");
    }
    return { name: cleanName, colors };
  }

  const text = await file.text();
  const colors = parsePaletteFromText(text);
  if (colors.length === 0) {
    throw new Error(
      "No se encontraron códigos de color (#HEX, RGB o .GPL) en el archivo."
    );
  }
  return { name: cleanName, colors };
}

export function loadSavedCustomPalette(): CustomPalette | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomPalette;
    if (!parsed || !Array.isArray(parsed.colors)) return null;
    const valid = parsed.colors
      .map((c) => normalizeHexColor(c))
      .filter((c): c is string => Boolean(c));
    if (valid.length === 0) return null;
    return {
      name: parsed.name || "Mi paleta",
      colors: valid.slice(0, 16),
    };
  } catch {
    return null;
  }
}

export function saveCustomPalette(palette: CustomPalette | null): void {
  try {
    if (typeof window === "undefined") return;
    if (!palette || palette.colors.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
    }
  } catch {
    // Ignore storage quota issues
  }
}
