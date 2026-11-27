import type { FontAsset, StudioDocumentState, TextLayer } from "../types/studio";
import sampleArchImg from "../assets/images/sample_architecture_editorial_1795775734892.jpg";
import sampleBotanicalImg from "../assets/images/sample_botanical_stilllife_1795775735335.jpg";
import sampleNightImg from "../assets/images/sample_urban_night_story_1795775735593.jpg";

export const BUILTIN_FONTS: FontAsset[] = [
  {
    id: "builtin-playfair",
    name: "Playfair Display",
    family: '"Playfair Display", Georgia, serif',
    category: "serif",
    isCustom: false,
  },
  {
    id: "builtin-cormorant",
    name: "Cormorant Garamond",
    family: '"Cormorant Garamond", Georgia, serif',
    category: "serif",
    isCustom: false,
  },
  {
    id: "builtin-bricolage",
    name: "Bricolage Grotesque",
    family: '"Bricolage Grotesque", sans-serif',
    category: "display",
    isCustom: false,
  },
  {
    id: "builtin-jakarta",
    name: "Plus Jakarta Sans",
    family: '"Plus Jakarta Sans", sans-serif',
    category: "sans",
    isCustom: false,
  },
  {
    id: "builtin-oswald",
    name: "Oswald",
    family: '"Oswald", sans-serif',
    category: "display",
    isCustom: false,
  },
  {
    id: "builtin-dmsans",
    name: "DM Sans",
    family: '"DM Sans", sans-serif',
    category: "sans",
    isCustom: false,
  },
  {
    id: "builtin-lora",
    name: "Lora",
    family: '"Lora", Georgia, serif',
    category: "serif",
    isCustom: false,
  },
  {
    id: "builtin-jetbrains",
    name: "JetBrains Mono",
    family: '"JetBrains Mono", monospace',
    category: "mono",
    isCustom: false,
  },
];

export interface SampleImageItem {
  id: string;
  title: string;
  formatHint: "1080x1350" | "1080x1920";
  src: string;
  palette: string[];
}

export const SAMPLE_IMAGES: SampleImageItem[] = [
  {
    id: "sample-arch",
    title: "Pabellón Brutalista",
    formatHint: "1080x1350",
    src: sampleArchImg,
    palette: ["#D8B994", "#1B1E22", "#9AB0C1", "#5E5346"],
  },
  {
    id: "sample-botanical",
    title: "Cerámica & Olivo",
    formatHint: "1080x1350",
    src: sampleBotanicalImg,
    palette: ["#EAE4D7", "#3D3932", "#8A8472", "#C4B9A5"],
  },
  {
    id: "sample-night",
    title: "Café Nocturno",
    formatHint: "1080x1920",
    src: sampleNightImg,
    palette: ["#0D1218", "#F4A24E", "#2C2824", "#E6D5BE"],
  },
];

export const INITIAL_LAYERS: TextLayer[] = [
  {
    id: "layer-headline",
    role: "headline",
    text: "Luz, sombra y proporción.",
    x: 8,
    y: 10,
    widthPct: 78,
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: 84,
    fontWeight: 600,
    letterSpacing: -0.02,
    lineHeight: 1.02,
    textAlign: "left",
    color: "#F8F7F4",
    shadowStrength: 0.35,
    uppercase: false,
  },
  {
    id: "layer-subtitle",
    role: "subtitle",
    text: "Colección Arquitectura de Otoño — Edición Limitada",
    x: 8,
    y: 26,
    widthPct: 68,
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    fontSize: 32,
    fontWeight: 500,
    letterSpacing: 0.01,
    lineHeight: 1.35,
    textAlign: "left",
    color: "#EFECE6",
    shadowStrength: 0.3,
    uppercase: false,
  },
  {
    id: "layer-caption",
    role: "caption",
    text: "MADRID · NOVIEMBRE",
    x: 8,
    y: 88,
    widthPct: 60,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 22,
    fontWeight: 500,
    letterSpacing: 0.14,
    lineHeight: 1.2,
    textAlign: "left",
    color: "#FFFFFF",
    shadowStrength: 0.4,
    uppercase: true,
  },
];

export const INITIAL_STUDIO_STATE: StudioDocumentState = {
  format: "1080x1350",
  image: {
    src: SAMPLE_IMAGES[0].src,
    name: SAMPLE_IMAGES[0].title,
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
    canvasBgColor: "#0F1115",
    brightness: 100,
    contrast: 100,
    scrimType: "top",
    scrimOpacity: 0.28,
    locked: false,
  },
  layers: INITIAL_LAYERS,
};

export function getCanvasDimensions(format: "1080x1350" | "1080x1920") {
  return format === "1080x1920"
    ? { width: 1080, height: 1920 }
    : { width: 1080, height: 1350 };
}

export async function imageSrcToOptimizedBase64(
  src: string,
  maxDimension = 720
): Promise<{ base64: string; mimeType: string }> {
  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No se pudo cargar la imagen para análisis."));
    img.src = src;
  });

  const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Contexto 2D no disponible.");
  }
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.76);
  return {
    base64: dataUrl,
    mimeType: "image/jpeg",
  };
}
