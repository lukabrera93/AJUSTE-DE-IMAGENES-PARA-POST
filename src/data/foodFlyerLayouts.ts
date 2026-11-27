import type { ScrimType, TextAlign } from "../types/studio";

export interface FoodFlyerZoneSpec {
  x: number;
  y: number;
  widthPct: number;
  align: TextAlign;
}

export interface FoodFlyerPattern {
  id: string;
  name: string;
  sourceInsight: string;
  bestFor: string;
  idealLighting: "dark" | "bright" | "any";
  preferredHeadlineCategory: "display" | "serif" | "sans";
  preferredBodyCategory: "sans" | "serif" | "script";
  preferredCaptionCategory: "mono" | "sans" | "script";
  recommendedScrim: ScrimType;
  scrimOpacity: number;
  headlineUppercase?: boolean;
  /** Signature dark-surface headline tint (e.g. Champagne Gold #EAD07E) */
  headlineAccentHex?: string;
  /** Preferred candidate zone weights evaluated against real image pixels */
  zoneStrategy:
    | "top-hook-bottom-cta"
    | "top-center-stacked"
    | "top-left-editorial"
    | "top-right-bold"
    | "mid-left-column"
    | "center-reel-hook"
    | "left-flatlay"
    | "right-flatlay"
    | "bottom-anchor";
  accentHint: string;
  feedZones: {
    headline: FoodFlyerZoneSpec;
    subtitle: FoodFlyerZoneSpec;
    caption: FoodFlyerZoneSpec;
  };
  storyZones: {
    headline: FoodFlyerZoneSpec;
    subtitle: FoodFlyerZoneSpec;
    caption: FoodFlyerZoneSpec;
  };
}

/**
 * Curated Gastronomy & Visual System Database modeled from the @elaljibe.marambaia
 * screenshot references: Didone Serif in Champagne Gold (#EAD07E), Script accents,
 * clean Sans-Serif kickers/subtitles in #FFFFFF, 3-column info footers, asymmetric
 * left/right dish framing, and centered Reel cover hooks.
 */
export const FOOD_FLYER_PATTERNS: FoodFlyerPattern[] = [
  {
    id: "aljibe-editorial-gold-top",
    name: "Titular Dorado Arriba + Pie 3 Datos",
    sourceInsight:
      "Inspirado en Descubrir / Domingo / Koygua'i: titular Serif Didone en dorado (#EAD07E) centrado arriba, bajada limpia debajo y datos al pie sobre degradado oscuro.",
    bestFor: "Platos centrados con aire en el tercio superior.",
    idealLighting: "dark",
    preferredHeadlineCategory: "serif",
    preferredBodyCategory: "sans",
    preferredCaptionCategory: "sans",
    recommendedScrim: "top",
    scrimOpacity: 0.44,
    headlineUppercase: false,
    headlineAccentHex: "#EAD07E",
    zoneStrategy: "top-center-stacked",
    accentHint: "#EAD07E",
    feedZones: {
      headline: { x: 8, y: 8, widthPct: 84, align: "center" },
      subtitle: { x: 14, y: 20, widthPct: 72, align: "center" },
      caption: { x: 10, y: 88, widthPct: 80, align: "center" },
    },
    storyZones: {
      headline: { x: 8, y: 16, widthPct: 84, align: "center" },
      subtitle: { x: 14, y: 27, widthPct: 72, align: "center" },
      caption: { x: 10, y: 76, widthPct: 80, align: "center" },
    },
  },
  {
    id: "aljibe-script-accent-pair",
    name: "Editorial Dorado + Acento Caligráfico",
    sourceInsight:
      "Inspirado en Suprema Cordon Bleu / Semana especial / 5 Motivos Sabor: titular Didone en dorado (#EAD07E) combinado con subtítulo cursivo blanco y pie ordenado.",
    bestFor: "Especialidades de la casa, platos estrella y fechas especiales.",
    idealLighting: "dark",
    preferredHeadlineCategory: "serif",
    preferredBodyCategory: "script",
    preferredCaptionCategory: "sans",
    recommendedScrim: "top",
    scrimOpacity: 0.42,
    headlineUppercase: false,
    headlineAccentHex: "#EAD07E",
    zoneStrategy: "top-center-stacked",
    accentHint: "#EAD07E",
    feedZones: {
      headline: { x: 8, y: 7, widthPct: 84, align: "center" },
      subtitle: { x: 14, y: 17, widthPct: 72, align: "center" },
      caption: { x: 10, y: 88, widthPct: 80, align: "center" },
    },
    storyZones: {
      headline: { x: 8, y: 15, widthPct: 84, align: "center" },
      subtitle: { x: 14, y: 24, widthPct: 72, align: "center" },
      caption: { x: 10, y: 76, widthPct: 80, align: "center" },
    },
  },
  {
    id: "aljibe-top-left-editorial",
    name: "Encabezado Izquierdo · Menú Ejecutivo",
    sourceInsight:
      "Inspirado en Pappardelle Salteado / Chop Suey / Espagueti parisieno: titular arriba a la izquierda, descripción breve debajo y barra inferior limpia.",
    bestFor: "Menús ejecutivos y platos fotografiados en ángulo hacia la derecha.",
    idealLighting: "any",
    preferredHeadlineCategory: "serif",
    preferredBodyCategory: "sans",
    preferredCaptionCategory: "sans",
    recommendedScrim: "top",
    scrimOpacity: 0.4,
    headlineUppercase: true,
    headlineAccentHex: "#EAD07E",
    zoneStrategy: "top-left-editorial",
    accentHint: "#EAD07E",
    feedZones: {
      headline: { x: 7, y: 8, widthPct: 74, align: "left" },
      subtitle: { x: 7, y: 20, widthPct: 60, align: "left" },
      caption: { x: 7, y: 88, widthPct: 86, align: "left" },
    },
    storyZones: {
      headline: { x: 7, y: 16, widthPct: 76, align: "left" },
      subtitle: { x: 7, y: 27, widthPct: 64, align: "left" },
      caption: { x: 7, y: 76, widthPct: 86, align: "left" },
    },
  },
  {
    id: "aljibe-top-right-bold",
    name: "Bloque Bold Derecha · Plato a la Izquierda",
    sourceInsight:
      "Inspirado en Chupín Gratinado / Chop Suey en plato oscuro: titular Display blanco compacto arriba a la derecha despejando todo el plato del primer plano.",
    bestFor: "Platos ubicados abajo-izquierda con fondo oscuro arriba a la derecha.",
    idealLighting: "dark",
    preferredHeadlineCategory: "display",
    preferredBodyCategory: "sans",
    preferredCaptionCategory: "sans",
    recommendedScrim: "top",
    scrimOpacity: 0.36,
    headlineUppercase: true,
    headlineAccentHex: "#FFFFFF",
    zoneStrategy: "top-right-bold",
    accentHint: "#FFFFFF",
    feedZones: {
      headline: { x: 34, y: 7, widthPct: 58, align: "right" },
      subtitle: { x: 42, y: 22, widthPct: 50, align: "right" },
      caption: { x: 32, y: 88, widthPct: 60, align: "right" },
    },
    storyZones: {
      headline: { x: 32, y: 16, widthPct: 60, align: "right" },
      subtitle: { x: 40, y: 29, widthPct: 52, align: "right" },
      caption: { x: 32, y: 76, widthPct: 60, align: "right" },
    },
  },
  {
    id: "aljibe-mid-left-column",
    name: "Columna Media Izquierda · Plato a la Derecha",
    sourceInsight:
      "Inspirado en Feijoada de El Aljibe y Pausa del mediodía: bloque apilado en el lateral izquierdo a media altura dejando libre el bowl o plato derecho.",
    bestFor: "Bowls y platos servidos hacia la derecha con fondo libre a la izquierda.",
    idealLighting: "any",
    preferredHeadlineCategory: "serif",
    preferredBodyCategory: "sans",
    preferredCaptionCategory: "sans",
    recommendedScrim: "radial",
    scrimOpacity: 0.28,
    headlineUppercase: false,
    headlineAccentHex: "#EAD07E",
    zoneStrategy: "mid-left-column",
    accentHint: "#EAD07E",
    feedZones: {
      headline: { x: 7, y: 34, widthPct: 45, align: "left" },
      subtitle: { x: 7, y: 50, widthPct: 42, align: "left" },
      caption: { x: 7, y: 86, widthPct: 56, align: "left" },
    },
    storyZones: {
      headline: { x: 7, y: 30, widthPct: 48, align: "left" },
      subtitle: { x: 7, y: 44, widthPct: 45, align: "left" },
      caption: { x: 7, y: 75, widthPct: 58, align: "left" },
    },
  },
  {
    id: "aljibe-reel-center-hook",
    name: "Gancho Central · Portada Reel / Carrusel",
    sourceInsight:
      "Inspirado en Hay sabores que merecen disfrutarse de cerca y El domingo comienza con una buena elección: frase Sans blanca centrada con sombra suave sobre el plato.",
    bestFor: "Portadas de Reels, carruseles y tomas cenitales cercanas.",
    idealLighting: "any",
    preferredHeadlineCategory: "sans",
    preferredBodyCategory: "sans",
    preferredCaptionCategory: "mono",
    recommendedScrim: "radial",
    scrimOpacity: 0.22,
    headlineUppercase: false,
    headlineAccentHex: "#FFFFFF",
    zoneStrategy: "center-reel-hook",
    accentHint: "#FFFFFF",
    feedZones: {
      headline: { x: 10, y: 42, widthPct: 80, align: "center" },
      subtitle: { x: 14, y: 55, widthPct: 72, align: "center" },
      caption: { x: 14, y: 88, widthPct: 72, align: "center" },
    },
    storyZones: {
      headline: { x: 10, y: 43, widthPct: 80, align: "center" },
      subtitle: { x: 14, y: 55, widthPct: 72, align: "center" },
      caption: { x: 14, y: 76, widthPct: 72, align: "center" },
    },
  },
  {
    id: "aljibe-bottom-price-bar",
    name: "Plato Protagonista Arriba + Cierre Precio/Reserva",
    sourceInsight:
      "Inspirado en Antes de despedir esta selección / Buffet Dominical: deja lucir el plato arriba y concentra título, oferta Gs. y horario en el tercio inferior.",
    bestFor: "Promociones con precio destacado, combos y reservas.",
    idealLighting: "any",
    preferredHeadlineCategory: "display",
    preferredBodyCategory: "sans",
    preferredCaptionCategory: "mono",
    recommendedScrim: "bottom",
    scrimOpacity: 0.44,
    headlineUppercase: true,
    headlineAccentHex: "#EAD07E",
    zoneStrategy: "bottom-anchor",
    accentHint: "#EAD07E",
    feedZones: {
      headline: { x: 8, y: 62, widthPct: 84, align: "left" },
      subtitle: { x: 8, y: 74, widthPct: 76, align: "left" },
      caption: { x: 8, y: 87, widthPct: 78, align: "left" },
    },
    storyZones: {
      headline: { x: 8, y: 54, widthPct: 84, align: "left" },
      subtitle: { x: 8, y: 65, widthPct: 76, align: "left" },
      caption: { x: 8, y: 75, widthPct: 78, align: "left" },
    },
  },
  {
    id: "food-cafe-bakery-light",
    name: "Tarjeta Clara · Tinta Oscura sin Velo",
    sourceInsight:
      "Inspirado en el flyer amarillo Reservá: tinta café/grafito oscura (#2D2218) sobre fondos claros o cálidos sin velos oscuros para mantener frescura.",
    bestFor: "Fondos claros, cremas, amarillos pastel o mesas bien iluminadas.",
    idealLighting: "bright",
    preferredHeadlineCategory: "serif",
    preferredBodyCategory: "sans",
    preferredCaptionCategory: "mono",
    recommendedScrim: "none",
    scrimOpacity: 0,
    headlineUppercase: false,
    zoneStrategy: "top-center-stacked",
    accentHint: "#2D2218",
    feedZones: {
      headline: { x: 10, y: 10, widthPct: 80, align: "center" },
      subtitle: { x: 14, y: 23, widthPct: 72, align: "center" },
      caption: { x: 12, y: 86, widthPct: 76, align: "center" },
    },
    storyZones: {
      headline: { x: 10, y: 18, widthPct: 80, align: "center" },
      subtitle: { x: 14, y: 29, widthPct: 72, align: "center" },
      caption: { x: 12, y: 75, widthPct: 76, align: "center" },
    },
  },
];
