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
    // Quantize into 24-step buckets
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

  // Compute variance of luminance inside the zone (uniformity = cleaner typography backdrop)
  let variance = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const d = lum[y * gridW + x] - avgLum;
      variance += d * d;
    }
  }
  const stdDev = count > 0 ? Math.sqrt(variance / count) : 20;

  // Lower energy + lower stdDev = higher aesthetic cleanliness score
  const score = 100 - energy * 1.4 - stdDev * 0.7;

  return { x: xPct, y: yPct, w: wPct, h: hPct, avgLum, energy, score };
}

function pickFontsForHierarchy(fonts: FontAsset[]) {
  const custom = fonts.filter((f) => f.isCustom);
  const displayOrSerif = fonts.filter(
    (f) => f.category === "serif" || f.category === "display"
  );
  const sansOrMono = fonts.filter(
    (f) => f.category === "sans" || f.category === "mono"
  );

  const primary =
    custom[0]?.name || displayOrSerif[0]?.name || fonts[0]?.name || "Playfair Display";
  const secondary =
    custom[1]?.name ||
    sansOrMono[0]?.name ||
    fonts[1]?.name ||
    "Plus Jakarta Sans";
  const caption =
    custom[2]?.name ||
    fonts.find((f) => f.category === "mono")?.name ||
    secondary;

  return { primary, secondary, caption, hasCustom: custom.length > 0 };
}

function estimateLines(text: string, fontSizePx: number, widthPct: number): number {
  const boxWidthPx = (widthPct / 100) * 1080;
  const avgCharPx = fontSizePx * 0.54;
  const charsPerLine = Math.max(8, Math.floor(boxWidthPx / avgCharPx));
  const paragraphs = (text || "Texto").split("\n");
  let lines = 0;
  for (const p of paragraphs) {
    lines += Math.max(1, Math.ceil(p.length / charsPerLine));
  }
  return Math.min(6, lines);
}

function buildStackPlacements(
  layers: TextLayer[],
  format: CanvasFormat,
  region: ZoneStats,
  textAlign: "left" | "center" | "right",
  fontSet: { primary: string; secondary: string; caption: string },
  forceDarkInk?: boolean,
  spacingScale = 1
): { placements: AIPlacement[]; color: string; scrim: ScrimType; scrimOpacity: number } {
  const canvasH = format === "1080x1920" ? 1920 : 1350;
  const isDarkBg = forceDarkInk === undefined ? region.avgLum < 138 : !forceDarkInk;
  const textColor = isDarkBg ? "#F8F7F4" : "#14161A";
  const subtleColor = isDarkBg ? "#E6E3DC" : "#2D3138";
  const shadowStrength = isDarkBg ? (region.energy > 14 ? 0.45 : 0.25) : 0;

  let scrim: ScrimType = "none";
  let scrimOpacity = 0;
  if (isDarkBg && region.energy > 12) {
    scrim = region.y < 40 ? "top" : "bottom";
    scrimOpacity = Math.min(0.42, 0.18 + region.energy * 0.008);
  }

  let cursorY = region.y;
  const maxAllowedY = format === "1080x1920" ? 78 : 88;
  const placements: AIPlacement[] = [];

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const isHeadline = layer.role === "headline" || i === 0;
    const isCaption = layer.role === "caption";

    const fontFamily = isHeadline
      ? fontSet.primary
      : isCaption
      ? fontSet.caption
      : fontSet.secondary;

    const fontSize = isHeadline
      ? Math.round(74 * spacingScale)
      : isCaption
      ? Math.round(21 * spacingScale)
      : Math.round(31 * spacingScale);

    const lineHeight = isHeadline ? 1.02 : isCaption ? 1.2 : 1.35;
    const letterSpacing = isHeadline ? -0.02 : isCaption ? 0.14 : 0.01;
    const fontWeight = isHeadline ? 600 : 500;

    // If caption is last layer and region is at the top, keep caption cleanly stacked or pinned at bottom safe zone
    let layerY = cursorY;
    if (isCaption && region.y < 35 && layers.length >= 3) {
      layerY = format === "1080x1920" ? 76 : 86;
    } else {
      layerY = Math.min(maxAllowedY, cursorY);
      const lines = estimateLines(layer.text, fontSize, region.w);
      const blockHeightPct = ((lines * fontSize * lineHeight) / canvasH) * 100;
      cursorY = layerY + blockHeightPct + 2.4 * spacingScale;
    }

    placements.push({
      layerId: layer.id,
      x: Number(region.x.toFixed(1)),
      y: Number(layerY.toFixed(1)),
      widthPct: Number(region.w.toFixed(1)),
      fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      textAlign,
      color: isHeadline ? textColor : subtleColor,
      shadowStrength,
    });
  }

  return { placements, color: textColor, scrim, scrimOpacity };
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

  // Render exact framing matching the user's crop/zoom/pan/rotation
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
  for (let i = 0; i < gridW * gridH; i++) {
    const p = i * 4;
    lum[i] = 0.299 * imgData[p] + 0.587 * imgData[p + 1] + 0.114 * imgData[p + 2];
  }

  // Compute local gradient magnitude (visual detail / clutter)
  const grad = new Float32Array(gridW * gridH);
  for (let y = 1; y < gridH - 1; y++) {
    for (let x = 1; x < gridW - 1; x++) {
      const idx = y * gridW + x;
      const gx = Math.abs(lum[idx + 1] - lum[idx - 1]);
      const gy = Math.abs(lum[idx + gridW] - lum[idx - gridW]);
      grad[idx] = gx + gy;
    }
  }

  // Detect main focal subject region (highest visual detail density)
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
  const fontSet = pickFontsForHierarchy(fonts);

  const topSafeY = format === "1080x1920" ? 16 : 8;
  const bottomSafeY = format === "1080x1920" ? 56 : 62;

  const candidates: { id: string; label: string; region: ZoneStats; align: "left" | "center" | "right" }[] = [
    {
      id: "top-left",
      label: "Espacio negativo superior",
      region: measureRegion(lum, grad, gridW, gridH, 8, topSafeY, 78, 28),
      align: "left",
    },
    {
      id: "top-center",
      label: "Encabezado centrado limpio",
      region: measureRegion(lum, grad, gridW, gridH, 11, topSafeY, 78, 28),
      align: "center",
    },
    {
      id: "side-left",
      label: "Columna editorial izquierda",
      region: measureRegion(lum, grad, gridW, gridH, 8, 26, 46, 42),
      align: "left",
    },
    {
      id: "side-right",
      label: "Columna asimétrica derecha",
      region: measureRegion(lum, grad, gridW, gridH, 46, 26, 46, 42),
      align: "right",
    },
    {
      id: "bottom-left",
      label: "Bloque inferior equilibrado",
      region: measureRegion(lum, grad, gridW, gridH, 8, bottomSafeY, 78, 24),
      align: "left",
    },
  ];

  // Rank candidate zones by visual calmness (highest score = cleanest negative space)
  const ranked = [...candidates].sort((a, b) => b.region.score - a.region.score);
  const best = ranked[0];
  const second = ranked.find((c) => c.id !== best.id && Math.abs(c.region.y - best.region.y) > 14) || ranked[1];
  const third = ranked.find((c) => c.id !== best.id && c.id !== second.id) || ranked[2];

  // Build 3 executable clean-aesthetic recommendations
  const stackBest = buildStackPlacements(layers, format, best.region, best.align, fontSet);
  const stackAiry = buildStackPlacements(
    layers,
    format,
    { ...best.region, w: Math.min(72, best.region.w) },
    best.align,
    fontSet,
    undefined,
    0.92
  );
  const stackContrast = buildStackPlacements(
    layers,
    format,
    second.region,
    second.align,
    fontSet,
    second.region.avgLum > 140
  );

  const fontNote = fontSet.hasCustom
    ? `usando tu fuente "${fontSet.primary}"`
    : `con "${fontSet.primary}"`;

  const recommendations: AestheticRecommendation[] = [
    {
      id: "local-rec-1",
      title: `Aprovechar ${best.label.toLowerCase()}`,
      description: `Zona de menor ruido visual detectada en tu foto. Ubica el bloque ${fontNote} con contraste automático.`,
      category: "ubicacion",
      recommendedScrim: stackBest.scrim,
      scrimOpacity: stackBest.scrimOpacity,
      placements: stackBest.placements,
    },
    {
      id: "local-rec-2",
      title: "Respiración editorial limpia",
      description: "Reduce ancho de caja y escala un 8% para dejar más aire alrededor del sujeto principal.",
      category: "respiracion",
      recommendedScrim: stackAiry.scrim,
      scrimOpacity: stackAiry.scrimOpacity,
      placements: stackAiry.placements,
    },
    {
      id: "local-rec-3",
      title: second.region.avgLum >= 140 ? "Tinta oscura sobre zona clara" : "Lectura luminosa con velo sutil",
      description:
        second.region.avgLum >= 140
          ? "Usa tipografía oscura de alto contraste sobre el área luminosa sin oscurecer la imagen."
          : "Aplica degradado protector suave y texto marfil para despegar las letras del fondo.",
      category: "contraste",
      recommendedScrim: second.region.avgLum >= 140 ? "none" : second.region.y < 40 ? "top" : "bottom",
      scrimOpacity: second.region.avgLum >= 140 ? 0 : 0.34,
      placements: stackContrast.placements,
    },
  ];

  if (customColors.length > 0) {
    const sortedByContrast = [...customColors].sort(
      (a, b) =>
        Math.abs(hexLuminance(b) - best.region.avgLum) -
        Math.abs(hexLuminance(a) - best.region.avgLum)
    );
    const headlineColor = sortedByContrast[0];
    const secondaryColor = sortedByContrast[1] || headlineColor;
    const palettePlacements = stackBest.placements.map((p, idx) => ({
      ...p,
      color: idx === 0 ? headlineColor : secondaryColor,
    }));
    recommendations.unshift({
      id: "local-rec-palette",
      title: "Aplicar tu paleta de colores subida",
      description: `Combina los tonos de tu paleta (${headlineColor}${secondaryColor !== headlineColor ? ` y ${secondaryColor}` : ""}) con mayor contraste sobre esta imagen.`,
      category: "contraste",
      recommendedScrim: stackBest.scrim,
      scrimOpacity: stackBest.scrimOpacity,
      placements: palettePlacements,
    });
  }

  // Build 2 complete strategic layout proposals
  const prop1 = buildStackPlacements(layers, format, best.region, best.align, fontSet);
  const prop2 = buildStackPlacements(layers, format, third.region, third.align, fontSet);

  const proposals: LayoutProposal[] = [
    {
      id: "local-prop-1",
      title: best.label,
      rationale: `Calculado localmente por menor densidad de bordes en esta área (${Math.round(best.region.avgLum)} lum) ${fontNote}.`,
      recommendedScrim: prop1.scrim,
      scrimOpacity: prop1.scrimOpacity,
      placements: prop1.placements,
    },
    {
      id: "local-prop-2",
      title: third.label,
      rationale: "Alternativa equilibrada fuera de la zona central de mayor detalle fotográfico.",
      recommendedScrim: prop2.scrim,
      scrimOpacity: prop2.scrimOpacity,
      placements: prop2.placements,
    },
  ];

  return {
    paletteColors,
    focalZone: {
      x: bestSubject.x,
      y: bestSubject.y,
      width: bestSubject.width,
      height: bestSubject.height,
      label: "Área de mayor detalle",
    },
    recommendations,
    proposals,
  };
}
