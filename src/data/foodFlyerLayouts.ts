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
  preferredBodyCategory: "sans" | "serif";
  preferredCaptionCategory: "mono" | "sans";
  recommendedScrim: ScrimType;
  scrimOpacity: number;
  headlineUppercase?: boolean;
  /** Preferred candidate zone weights evaluated against real image pixels */
  zoneStrategy: "top-hook-bottom-cta" | "top-center-stacked" | "left-flatlay" | "right-flatlay" | "bottom-anchor";
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
 * Curated database of proven social-media food flyer text-placement architectures
 * (1080x1350 Feed 4:5 & 1080x1920 Stories/Reels 9:16), synthesizing F/Z-pattern
 * scanning, Instagram UI safe-zone margins, dark-moody editorial hierarchy, and
 * flat-lay negative-space framing.
 */
export const FOOD_FLYER_PATTERNS: FoodFlyerPattern[] = [
  {
    id: "food-z-hook-cta",
    name: "Patrón Z · Gancho Superior + CTA Inferior",
    sourceInsight: "Estándar de flyers gastronómicos: lectura en Z con gancho arriba, plato protagonista al centro y llamado a la acción abajo.",
    bestFor: "Promos 2x1, lanzamientos de hamburguesas, pizzas o combos con foto centrada.",
    idealLighting: "any",
    preferredHeadlineCategory: "display",
    preferredBodyCategory: "sans",
    preferredCaptionCategory: "mono",
    recommendedScrim: "top",
    scrimOpacity: 0.34,
    headlineUppercase: true,
    zoneStrategy: "top-hook-bottom-cta",
    accentHint: "#F4B942",
    feedZones: {
      headline: { x: 8, y: 7, widthPct: 84, align: "center" },
      subtitle: { x: 12, y: 18, widthPct: 76, align: "center" },
      caption: { x: 10, y: 86, widthPct: 80, align: "center" },
    },
    storyZones: {
      headline: { x: 8, y: 16, widthPct: 84, align: "center" },
      subtitle: { x: 12, y: 26, widthPct: 76, align: "center" },
      caption: { x: 10, y: 75, widthPct: 80, align: "center" },
    },
  },
  {
    id: "food-dark-moody-editorial",
    name: "Gourmet Nocturno · Dark & Moody",
    sourceInsight: "Arquitectura en 3 niveles para alta cocina, cortes o coctelería: kicker superior espaciado, título serif de alto contraste y detalle discreto.",
    bestFor: "Fotografía culinaria oscura o iluminación direccional (claroscuro).",
    idealLighting: "dark",
    preferredHeadlineCategory: "serif",
    preferredBodyCategory: "sans",
    preferredCaptionCategory: "mono",
    recommendedScrim: "radial",
    scrimOpacity: 0.32,
    headlineUppercase: false,
    zoneStrategy: "top-center-stacked",
    accentHint: "#E8C589",
    feedZones: {
      headline: { x: 8, y: 11, widthPct: 80, align: "left" },
      subtitle: { x: 8, y: 24, widthPct: 68, align: "left" },
      caption: { x: 8, y: 87, widthPct: 70, align: "left" },
    },
    storyZones: {
      headline: { x: 8, y: 18, widthPct: 82, align: "left" },
      subtitle: { x: 8, y: 29, widthPct: 72, align: "left" },
      caption: { x: 8, y: 76, widthPct: 72, align: "left" },
    },
  },
  {
    id: "food-flatlay-left",
    name: "Plano Cenital · Columna Izquierda",
    sourceInsight: "Aprovecha el espacio negativo izquierdo en tomas cenitales (flat-lay) o mesas servidas para apilar menú y precio sin tapar el plato.",
    bestFor: "Mesas con varios platos, brunch, sushi o tablas vistas desde arriba.",
    idealLighting: "any",
    preferredHeadlineCategory: "display",
    preferredBodyCategory: "sans",
    preferredCaptionCategory: "sans",
    recommendedScrim: "none",
    scrimOpacity: 0,
    headlineUppercase: false,
    zoneStrategy: "left-flatlay",
    accentHint: "#FFFFFF",
    feedZones: {
      headline: { x: 7, y: 14, widthPct: 48, align: "left" },
      subtitle: { x: 7, y: 31, widthPct: 45, align: "left" },
      caption: { x: 7, y: 84, widthPct: 48, align: "left" },
    },
    storyZones: {
      headline: { x: 7, y: 20, widthPct: 50, align: "left" },
      subtitle: { x: 7, y: 34, widthPct: 48, align: "left" },
      caption: { x: 7, y: 74, widthPct: 50, align: "left" },
    },
  },
  {
    id: "food-flatlay-right",
    name: "Asimetría Derecha · Menú & Precio",
    sourceInsight: "Alineación a la derecha en la zona de respiro opuesta al plato principal para destacar nombre del menú, ingredientes y pedido.",
    bestFor: "Platos encuadrados a la izquierda con fondo limpio hacia la derecha.",
    idealLighting: "any",
    preferredHeadlineCategory: "serif",
    preferredBodyCategory: "sans",
    preferredCaptionCategory: "mono",
    recommendedScrim: "none",
    scrimOpacity: 0,
    headlineUppercase: false,
    zoneStrategy: "right-flatlay",
    accentHint: "#FFFFFF",
    feedZones: {
      headline: { x: 45, y: 14, widthPct: 48, align: "right" },
      subtitle: { x: 47, y: 31, widthPct: 46, align: "right" },
      caption: { x: 45, y: 84, widthPct: 48, align: "right" },
    },
    storyZones: {
      headline: { x: 43, y: 20, widthPct: 50, align: "right" },
      subtitle: { x: 45, y: 34, widthPct: 48, align: "right" },
      caption: { x: 43, y: 74, widthPct: 50, align: "right" },
    },
  },
  {
    id: "food-cafe-bakery-light",
    name: "Cafetería & Pastelería Luminosa",
    sourceInsight: "Estética editorial clara sobre mármol, lino o madera clara: tinta oscura de alto contraste sin velos pesados para conservar frescura.",
    bestFor: "Cafés, pastelería, ensaladas, brunch diurno y mesas luminosas.",
    idealLighting: "bright",
    preferredHeadlineCategory: "serif",
    preferredBodyCategory: "sans",
    preferredCaptionCategory: "mono",
    recommendedScrim: "none",
    scrimOpacity: 0,
    headlineUppercase: false,
    zoneStrategy: "top-center-stacked",
    accentHint: "#1E1A17",
    feedZones: {
      headline: { x: 10, y: 8, widthPct: 80, align: "center" },
      subtitle: { x: 14, y: 20, widthPct: 72, align: "center" },
      caption: { x: 14, y: 87, widthPct: 72, align: "center" },
    },
    storyZones: {
      headline: { x: 10, y: 17, widthPct: 80, align: "center" },
      subtitle: { x: 14, y: 27, widthPct: 72, align: "center" },
      caption: { x: 14, y: 75, widthPct: 72, align: "center" },
    },
  },
  {
    id: "food-bottom-delivery-hero",
    name: "Plato Protagonista Arriba + Bloque Delivery Abajo",
    sourceInsight: "Deja el 60% superior completamente despejado para tomas macro del alimento y concentra título, oferta y pedido en el tercio inferior seguro.",
    bestFor: "Fotos con detalle jugoso en la mitad superior y superficie libre abajo.",
    idealLighting: "any",
    preferredHeadlineCategory: "display",
    preferredBodyCategory: "sans",
    preferredCaptionCategory: "mono",
    recommendedScrim: "bottom",
    scrimOpacity: 0.42,
    headlineUppercase: true,
    zoneStrategy: "bottom-anchor",
    accentHint: "#FFFFFF",
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
];

export const FOOD_FLYER_AI_SUMMARY = FOOD_FLYER_PATTERNS.map(
  (p) => `- ${p.name}: ${p.sourceInsight} (${p.bestFor})`
).join("\n");
