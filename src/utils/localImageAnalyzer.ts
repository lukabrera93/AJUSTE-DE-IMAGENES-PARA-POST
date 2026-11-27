import type {
  AestheticRecommendation,
  AIPlacement,
  AnalysisResult,
  CanvasFormat,
  FontAsset,
  ImageSettings,
  LayoutProposal,
  ScrimType,
  TextLayer,
} from "../types/studio";
import {
  FOOD_FLYER_PATTERNS,
  type FoodFlyerPattern,
} from "../data/foodFlyerLayouts";
import { resolveFontFamilyGroup } from "./studioDefaults";

interface ZoneStats {
  x: number; // %
  y: number; // %
  w: number; // %
  h: number; // %
  avgLum: number; // 0..255
  energy: number; // edge/detail variance (lower = cleaner negative space)
  score: number;
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

function hexLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return 128;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function colorDist(a: [number, number, number], b: [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function extractPalette(pixels: Uint8ClampedArray): string[] {
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < pixels.length; i += 16) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const qr = Math.round(r / 28) * 28;
    const qg = Math.round(g / 28) * 28;
    const qb = Math.round(b / 28) * 28;
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
    if (picked.every((p) => colorDist(p, col) > 48)) {
      picked.push(col);
    }
    if (picked.length >= 4) break;
  }

  while (picked.length < 4) {
    const fallback: [number, number, number][] = [
      [245, 243, 238],
      [24, 26, 32],
      [212, 163, 89],
      [130, 148, 165],
    ];
    picked.push(fallback[picked.length]);
  }

  return picked.map(([r, g, b]) => rgbToHex(r, g, b));
}

function measureRegion(
  lum: Float32Array,
  grad: Float32Array,
  gridW: number,
  gridH: number,
  xPct: number,
  yPct: number,
  wPct: number,
  hPct: number
): ZoneStats {
  const x0 = Math.max(0, Math.floor((xPct / 100) * gridW));
  const y0 = Math.max(0, Math.floor((yPct / 100) * gridH));
  const x1 = Math.min(gridW, Math.ceil(((xPct + wPct) / 100) * gridW));
  const y1 = Math.min(gridH, Math.ceil(((yPct + hPct) / 100) * gridH));

  let sumLum = 0;
  let sumGrad = 0;
  let count = 0;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = y * gridW + x;
      sumLum += lum[idx];
      sumGrad += grad[idx];
      count++;
    }
  }

  const avgLum = count > 0 ? sumLum / count : 128;
  const energy = count > 0 ? sumGrad / count : 20;

  let variance = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const d = lum[y * gridW + x] - avgLum;
      variance += d * d;
    }
  }
  const stdDev = count > 0 ? Math.sqrt(variance / count) : 20;

  const score = 100 - energy * 1.4 - stdDev * 0.7;

  return { x: xPct, y: yPct, w: wPct, h: hPct, avgLum, energy, score };
}

function pickFontByCategory(
  fonts: FontAsset[],
  preferred: "display" | "serif" | "sans" | "mono",
  fallbackName: string
): { name: string; isCustom: boolean } {
  const customExact = fonts.find(
    (f) => f.isCustom && resolveFontFamilyGroup(f) === preferred
  );
  if (customExact) return { name: customExact.name, isCustom: true };

  const customAny = fonts.find((f) => f.isCustom);
  if (customAny && preferred === "display") {
    return { name: customAny.name, isCustom: true };
  }

  const builtinMatch = fonts.find((f) => resolveFontFamilyGroup(f) === preferred);
  if (builtinMatch) return { name: builtinMatch.name, isCustom: builtinMatch.isCustom };

  return { name: fonts[0]?.name || fallbackName, isCustom: Boolean(fonts[0]?.isCustom) };
}

function buildPatternPlacements(
  pattern: FoodFlyerPattern,
  layers: TextLayer[],
  format: CanvasFormat,
  fonts: FontAsset[],
  zoneLum: number,
  zoneEnergy: number,
  scaleFactor = 1,
  forceDarkInk?: boolean
): {
  placements: AIPlacement[];
  scrim: ScrimType;
  scrimOpacity: number;
  primaryFontName: string;
  usedCustomFont: boolean;
} {
  const zones = format === "1080x1920" ? pattern.storyZones : pattern.feedZones;
  const isDarkSurface = forceDarkInk === undefined ? zoneLum < 142 : !forceDarkInk;
  const textColor = isDarkSurface ? "#F8F7F4" : "#181512";
  const subtitleColor = isDarkSurface ? "#ECE7DE" : "#2F2A24";

  const headlineFont = pickFontByCategory(fonts, pattern.preferredHeadlineCategory, "Oswald");
  const bodyFont = pickFontByCategory(fonts, pattern.preferredBodyCategory, "Montserrat");
  const captionFont = pickFontByCategory(fonts, pattern.preferredCaptionCategory, "JetBrains Mono");

  let scrim: ScrimType = pattern.recommendedScrim;
  let scrimOpacity = pattern.scrimOpacity;
  if (!isDarkSurface && forceDarkInk) {
    scrim = "none";
    scrimOpacity = 0;
  } else if (isDarkSurface && scrim === "none" && zoneEnergy > 14) {
    scrim = zones.headline.y > 50 ? "bottom" : "top";
    scrimOpacity = Math.min(0.38, 0.16 + zoneEnergy * 0.008);
  }

  const shadowStrength = isDarkSurface ? (zoneEnergy > 14 ? 0.48 : 0.28) : 0;

  const placements: AIPlacement[] = layers.map((layer, idx) => {
    const isHeadline = layer.role === "headline" || idx === 0;
    const isCaption = layer.role === "caption" || idx >= 2;
    const targetZone = isHeadline
      ? zones.headline
      : isCaption
      ? zones.caption
      : zones.subtitle;

    const chosenFont = isHeadline
      ? headlineFont.name
      : isCaption
      ? captionFont.name
      : bodyFont.name;

    const baseSize = isHeadline ? 82 : isCaption ? 22 : 31;
    const fontSize = Math.max(18, Math.round(baseSize * scaleFactor));
    const letterSpacing = isHeadline
      ? pattern.preferredHeadlineCategory === "display"
        ? 0.01
        : -0.02
      : isCaption
      ? 0.14
      : 0.01;

    return {
      layerId: layer.id,
      x: targetZone.x,
      y: targetZone.y + (idx > 2 ? (idx - 2) * 8 : 0),
      widthPct: targetZone.widthPct,
      fontFamily: chosenFont,
      fontSize,
      fontWeight: isHeadline ? 700 : 500,
      letterSpacing,
      lineHeight: isHeadline ? 0.98 : isCaption ? 1.2 : 1.32,
      textAlign: targetZone.align,
      color: isHeadline ? textColor : subtitleColor,
      shadowStrength,
    };
  });

  return {
    placements,
    scrim,
    scrimOpacity,
    primaryFontName: headlineFont.name,
    usedCustomFont: headlineFont.isCustom || bodyFont.isCustom,
  };
}

export async function analyzeImageLocally(
  image: ImageSettings,
  format: CanvasFormat,
  fonts: FontAsset[],
  layers: TextLayer[],
  customColors: string[] = []
): Promise<AnalysisResult> {
  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No se pudo leer la imagen para analizarla."));
    img.src = image.src;
  });

  const gridW = 108;
  const gridH = format === "1080x1920" ? 192 : 135;

  const canvas = document.createElement("canvas");
  canvas.width = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Contexto 2D no disponible.");

  ctx.fillStyle = image.canvasBgColor || "#0F1115";
  ctx.fillRect(0, 0, gridW, gridH);

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = gridW / gridH;
  let drawW = gridW;
  let drawH = gridH;
  if (imgRatio > canvasRatio) {
    drawH = gridH;
    drawW = gridH * imgRatio;
  } else {
    drawW = gridW;
    drawH = gridW / imgRatio;
  }
  drawW *= image.zoom;
  drawH *= image.zoom;
  const centerX = gridW / 2 + (image.panX / 100) * gridW * 0.5;
  const centerY = gridH / 2 + (image.panY / 100) * gridH * 0.5;
  const rad = ((image.rotation || 0) * Math.PI) / 180;

  ctx.save();
  ctx.filter = `brightness(${image.brightness}%) contrast(${image.contrast}%)`;
  ctx.translate(centerX, centerY);
  if (rad !== 0) {
    ctx.rotate(rad);
  }
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  const imgData = ctx.getImageData(0, 0, gridW, gridH).data;
  const lum = new Float32Array(gridW * gridH);
  let lumTotal = 0;
  for (let i = 0; i < gridW * gridH; i++) {
    const p = i * 4;
    const v = 0.299 * imgData[p] + 0.587 * imgData[p + 1] + 0.114 * imgData[p + 2];
    lum[i] = v;
    lumTotal += v;
  }
  const overallLum = lumTotal / (gridW * gridH);

  const grad = new Float32Array(gridW * gridH);
  for (let y = 1; y < gridH - 1; y++) {
    for (let x = 1; x < gridW - 1; x++) {
      const idx = y * gridW + x;
      const gx = Math.abs(lum[idx + 1] - lum[idx - 1]);
      const gy = Math.abs(lum[idx + gridW] - lum[idx - gridW]);
      grad[idx] = gx + gy;
    }
  }

  let bestSubject = { x: 25, y: 30, width: 50, height: 40, energy: -1 };
  for (let sy = 15; sy <= 60; sy += 10) {
    for (let sx = 10; sx <= 55; sx += 10) {
      const r = measureRegion(lum, grad, gridW, gridH, sx, sy, 38, 34);
      if (r.energy > bestSubject.energy) {
        bestSubject = { x: sx, y: sy, width: 38, height: 34, energy: r.energy };
      }
    }
  }

  const paletteColors = extractPalette(imgData);

  const topSafeY = format === "1080x1920" ? 16 : 8;
  const bottomSafeY = format === "1080x1920" ? 56 : 62;

  const zoneTop = measureRegion(lum, grad, gridW, gridH, 8, topSafeY, 82, 26);
  const zoneBottom = measureRegion(lum, grad, gridW, gridH, 8, bottomSafeY, 82, 24);
  const zoneLeft = measureRegion(lum, grad, gridW, gridH, 7, 16, 46, 56);
  const zoneRight = measureRegion(lum, grad, gridW, gridH, 47, 16, 46, 56);

  // Score every food-flyer pattern from our social-media database against this photo
  const scoredPatterns = FOOD_FLYER_PATTERNS.map((pattern) => {
    let zone: ZoneStats = zoneTop;
    if (pattern.zoneStrategy === "left-flatlay") zone = zoneLeft;
    else if (pattern.zoneStrategy === "right-flatlay") zone = zoneRight;
    else if (pattern.zoneStrategy === "bottom-anchor") zone = zoneBottom;
    else if (pattern.zoneStrategy === "top-hook-bottom-cta") {
      zone = {
        ...zoneTop,
        score: (zoneTop.score * 0.6 + zoneBottom.score * 0.4),
      };
    }

    let lightingBonus = 0;
    if (pattern.idealLighting === "dark" && overallLum < 115) lightingBonus = 14;
    if (pattern.idealLighting === "bright" && overallLum >= 135) lightingBonus = 14;
    if (pattern.idealLighting === "dark" && overallLum >= 145) lightingBonus = -12;
    if (pattern.idealLighting === "bright" && overallLum < 105) lightingBonus = -12;

    return {
      pattern,
      zone,
      totalScore: zone.score + lightingBonus,
    };
  }).sort((a, b) => b.totalScore - a.totalScore);

  const topMatch = scoredPatterns[0];
  const secondMatch =
    scoredPatterns.find((m) => m.pattern.zoneStrategy !== topMatch.pattern.zoneStrategy) ||
    scoredPatterns[1];
  const thirdMatch =
    scoredPatterns.find(
      (m) =>
        m.pattern.id !== topMatch.pattern.id &&
        m.pattern.id !== secondMatch.pattern.id
    ) || scoredPatterns[2];

  const topBuild = buildPatternPlacements(
    topMatch.pattern,
    layers,
    format,
    fonts,
    topMatch.zone.avgLum,
    topMatch.zone.energy
  );

  const airyBuild = buildPatternPlacements(
    secondMatch.pattern,
    layers,
    format,
    fonts,
    secondMatch.zone.avgLum,
    secondMatch.zone.energy,
    0.9
  );

  const contrastBuild = buildPatternPlacements(
    thirdMatch.pattern,
    layers,
    format,
    fonts,
    thirdMatch.zone.avgLum,
    thirdMatch.zone.energy,
    1,
    thirdMatch.zone.avgLum >= 142
  );

  const fontLabel = topBuild.usedCustomFont
    ? `priorizando tu fuente "${topBuild.primaryFontName}"`
    : `con "${topBuild.primaryFontName}"`;

  const recommendations: AestheticRecommendation[] = [
    {
      id: "local-rec-1",
      title: topMatch.pattern.name,
      description: `${topMatch.pattern.sourceInsight} Aplicado ${fontLabel}.`,
      category: "ubicacion",
      patternSource: `Base gastronomía · ${topMatch.pattern.bestFor}`,
      recommendedScrim: topBuild.scrim,
      scrimOpacity: topBuild.scrimOpacity,
      placements: topBuild.placements,
    },
    {
      id: "local-rec-2",
      title: `Respiro visual · ${secondMatch.pattern.name}`,
      description: `Reduce la escala un 10% y aprovecha la zona más limpia sin cubrir el foco del plato.`,
      category: "respiracion",
      patternSource: `Base gastronomía · ${secondMatch.pattern.bestFor}`,
      recommendedScrim: airyBuild.scrim,
      scrimOpacity: airyBuild.scrimOpacity,
      placements: airyBuild.placements,
    },
    {
      id: "local-rec-3",
      title:
        thirdMatch.zone.avgLum >= 142
          ? "Tinta oscura editorial sobre foto clara"
          : "Alto contraste gastronómico con velo",
      description:
        thirdMatch.zone.avgLum >= 142
          ? "Conserva la frescura de la luz natural usando tipografía oscura sin oscurecer el plato."
          : "Degradado direccional sutil para despegar precios, título y CTA en pantallas móviles.",
      category: "contraste",
      patternSource: `Base gastronomía · ${thirdMatch.pattern.name}`,
      recommendedScrim: contrastBuild.scrim,
      scrimOpacity: contrastBuild.scrimOpacity,
      placements: contrastBuild.placements,
    },
  ];

  if (customColors.length > 0) {
    const sortedByContrast = [...customColors].sort(
      (a, b) =>
        Math.abs(hexLuminance(b) - topMatch.zone.avgLum) -
        Math.abs(hexLuminance(a) - topMatch.zone.avgLum)
    );
    const headlineColor = sortedByContrast[0];
    const secondaryColor = sortedByContrast[1] || headlineColor;
    const palettePlacements = topBuild.placements.map((p, idx) => ({
      ...p,
      color: idx === 0 ? headlineColor : secondaryColor,
    }));
    recommendations.unshift({
      id: "local-rec-palette",
      title: "Tu paleta de colores + Flyer Gastronómico",
      description: `Combina tus tonos (${headlineColor}${secondaryColor !== headlineColor ? ` y ${secondaryColor}` : ""}) sobre la mejor zona libre de la foto.`,
      category: "contraste",
      patternSource: `Paleta subida · ${topMatch.pattern.name}`,
      recommendedScrim: topBuild.scrim,
      scrimOpacity: topBuild.scrimOpacity,
      placements: palettePlacements,
    });
  }

  const prop2Build = buildPatternPlacements(
    secondMatch.pattern,
    layers,
    format,
    fonts,
    secondMatch.zone.avgLum,
    secondMatch.zone.energy
  );

  const proposals: LayoutProposal[] = [
    {
      id: "local-prop-1",
      title: topMatch.pattern.name,
      rationale: `${topMatch.pattern.bestFor} Detectada menor carga visual en esta zona (${Math.round(topMatch.zone.avgLum)} lum).`,
      patternSource: topMatch.pattern.name,
      recommendedScrim: topBuild.scrim,
      scrimOpacity: topBuild.scrimOpacity,
      placements: topBuild.placements,
    },
    {
      id: "local-prop-2",
      title: secondMatch.pattern.name,
      rationale: `${secondMatch.pattern.sourceInsight}`,
      patternSource: secondMatch.pattern.name,
      recommendedScrim: prop2Build.scrim,
      scrimOpacity: prop2Build.scrimOpacity,
      placements: prop2Build.placements,
    },
  ];

  return {
    paletteColors,
    focalZone: {
      x: bestSubject.x,
      y: bestSubject.y,
      width: bestSubject.width,
      height: bestSubject.height,
      label: "Foco principal",
    },
    recommendations,
    proposals,
  };
}
