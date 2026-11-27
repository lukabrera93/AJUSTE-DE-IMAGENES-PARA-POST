import { writePsd, type Layer, type Psd, type RGB } from "ag-psd";
import type { StudioDocumentState, TextLayer } from "../types/studio";
import { getCanvasDimensions } from "./studioDefaults";

export interface ExportOptions {
  scale: 1 | 2;
  mimeType: "image/png" | "image/jpeg" | "application/psd";
  quality?: number;
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  letterSpacingPx: number
): string[] {
  const paragraphs = text.split("\n");
  const allLines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      allLines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(candidate);
      const extraSpacing = Math.max(0, candidate.length - 1) * letterSpacingPx;
      const width = metrics.width + extraSpacing;

      if (width > maxWidth && currentLine) {
        allLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }
    if (currentLine) {
      allLines.push(currentLine);
    }
  }

  return allLines;
}

function drawTextWithTracking(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  letterSpacingPx: number
) {
  if (Math.abs(letterSpacingPx) < 0.25) {
    ctx.fillText(line, x, y);
    return;
  }

  let cursorX = x;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    ctx.fillText(ch, cursorX, y);
    cursorX += ctx.measureText(ch).width + letterSpacingPx;
  }
}

function measureTrackedLineWidth(
  ctx: CanvasRenderingContext2D,
  line: string,
  letterSpacingPx: number
): number {
  if (!line) return 0;
  if (Math.abs(letterSpacingPx) < 0.25) {
    return ctx.measureText(line).width;
  }
  let total = 0;
  for (let i = 0; i < line.length; i++) {
    total += ctx.measureText(line[i]).width;
    if (i < line.length - 1) total += letterSpacingPx;
  }
  return total;
}

function drawScrim(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scrimType: StudioDocumentState["image"]["scrimType"],
  scrimOpacity: number
) {
  if (scrimType === "none" || scrimOpacity <= 0) return;

  if (scrimType === "full") {
    ctx.fillStyle = `rgba(0, 0, 0, ${scrimOpacity})`;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (scrimType === "top") {
    const grad = ctx.createLinearGradient(0, 0, 0, height * 0.58);
    grad.addColorStop(0, `rgba(0, 0, 0, ${Math.min(0.85, scrimOpacity * 1.15)})`);
    grad.addColorStop(0.55, `rgba(0, 0, 0, ${scrimOpacity * 0.45})`);
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (scrimType === "bottom") {
    const grad = ctx.createLinearGradient(0, height * 0.42, 0, height);
    grad.addColorStop(0, "rgba(0, 0, 0, 0)");
    grad.addColorStop(0.45, `rgba(0, 0, 0, ${scrimOpacity * 0.45})`);
    grad.addColorStop(1, `rgba(0, 0, 0, ${Math.min(0.88, scrimOpacity * 1.2)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (scrimType === "radial") {
    const grad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      width * 0.12,
      width * 0.5,
      height * 0.5,
      height * 0.65
    );
    grad.addColorStop(0, "rgba(0, 0, 0, 0)");
    grad.addColorStop(1, `rgba(0, 0, 0, ${Math.min(0.85, scrimOpacity * 1.2)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  canvasWidth: number,
  canvasHeight: number,
  scale: number
) {
  const displayText = layer.uppercase ? layer.text.toUpperCase() : layer.text;
  if (!displayText.trim()) return;

  const fontSizePx = layer.fontSize * scale;
  const boxX = (layer.x / 100) * canvasWidth;
  const boxY = (layer.y / 100) * canvasHeight;
  const boxW = (layer.widthPct / 100) * canvasWidth;
  const letterSpacingPx = layer.letterSpacing * fontSizePx;
  const lineHeightPx = fontSizePx * layer.lineHeight;

  ctx.save();
  ctx.font = `${layer.fontWeight} ${fontSizePx}px ${layer.fontFamily}`;
  ctx.fillStyle = layer.color;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  if (layer.shadowStrength > 0.02) {
    ctx.shadowColor = `rgba(0, 0, 0, ${Math.min(0.85, layer.shadowStrength * 0.85)})`;
    ctx.shadowBlur = 18 * scale * layer.shadowStrength;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4 * scale * layer.shadowStrength;
  }

  const lines = wrapLines(ctx, displayText, boxW, letterSpacingPx);
  let currentY = boxY;

  for (const line of lines) {
    const lineWidth = measureTrackedLineWidth(ctx, line, letterSpacingPx);
    let drawX = boxX;
    if (layer.textAlign === "center") {
      drawX = boxX + (boxW - lineWidth) / 2;
    } else if (layer.textAlign === "right") {
      drawX = boxX + (boxW - lineWidth);
    }

    drawTextWithTracking(ctx, line, drawX, currentY, letterSpacingPx);
    currentY += lineHeightPx;
  }

  ctx.restore();
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Error al cargar la imagen base para exportar."));
    img.src = src;
  });
  return img;
}

function drawBaseImageToCanvas(
  img: HTMLImageElement,
  doc: StudioDocumentState,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo inicializar el motor de exportación.");

  ctx.fillStyle = "#0F1115";
  ctx.fillRect(0, 0, width, height);

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = width / height;

  let drawW = width;
  let drawH = height;
  if (imgRatio > canvasRatio) {
    drawH = height;
    drawW = height * imgRatio;
  } else {
    drawW = width;
    drawH = width / imgRatio;
  }

  drawW *= doc.image.zoom;
  drawH *= doc.image.zoom;

  const offsetX = (width - drawW) / 2 + (doc.image.panX / 100) * width * 0.5;
  const offsetY = (height - drawH) / 2 + (doc.image.panY / 100) * height * 0.5;

  ctx.save();
  ctx.filter = `brightness(${doc.image.brightness}%) contrast(${doc.image.contrast}%)`;
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
  ctx.restore();

  return canvas;
}

export async function renderCompositionCanvas(
  doc: StudioDocumentState,
  scale: 1 | 2
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;

  const base = getCanvasDimensions(doc.format);
  const width = base.width * scale;
  const height = base.height * scale;

  const img = await loadImageElement(doc.image.src);
  const canvas = drawBaseImageToCanvas(img, doc, width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo inicializar el motor de exportación.");

  drawScrim(ctx, width, height, doc.image.scrimType, doc.image.scrimOpacity);

  for (const layer of doc.layers) {
    drawTextLayer(ctx, layer, width, height, scale);
  }

  return canvas;
}

export async function renderCompositionToDataUrl(
  doc: StudioDocumentState,
  options: { scale: 1 | 2; mimeType: "image/png" | "image/jpeg"; quality?: number }
): Promise<string> {
  const canvas = await renderCompositionCanvas(doc, options.scale);
  return canvas.toDataURL(options.mimeType, options.quality ?? 0.95);
}

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(clean.slice(0, 2), 16) || 0,
    g: parseInt(clean.slice(2, 4), 16) || 0,
    b: parseInt(clean.slice(4, 6), 16) || 0,
  };
}

function extractPrimaryFontName(fontFamily: string): string {
  const first = fontFamily.split(",")[0] || "Arial";
  return first.replace(/["']/g, "").trim() || "Arial";
}

function getSafeFilePrefix(doc: StudioDocumentState): string {
  return (
    (doc.image.name || "reticula-diseno")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "reticula"
  );
}

export async function downloadPsdComposition(
  doc: StudioDocumentState,
  scale: 1 | 2
): Promise<void> {
  await document.fonts.ready;

  const base = getCanvasDimensions(doc.format);
  const width = base.width * scale;
  const height = base.height * scale;

  const img = await loadImageElement(doc.image.src);
  const baseImageCanvas = drawBaseImageToCanvas(img, doc, width, height);
  const compositeCanvas = await renderCompositionCanvas(doc, scale);

  const children: Layer[] = [
    {
      name: `Imagen base · ${doc.image.name || "Fondo"}`,
      top: 0,
      left: 0,
      bottom: height,
      right: width,
      canvas: baseImageCanvas,
    },
  ];

  // Separate scrim layer when active
  if (doc.image.scrimType !== "none" && doc.image.scrimOpacity > 0.01) {
    const scrimCanvas = document.createElement("canvas");
    scrimCanvas.width = width;
    scrimCanvas.height = height;
    const scrimCtx = scrimCanvas.getContext("2d");
    if (scrimCtx) {
      drawScrim(scrimCtx, width, height, doc.image.scrimType, doc.image.scrimOpacity);
      children.push({
        name: "Velo de legibilidad",
        top: 0,
        left: 0,
        bottom: height,
        right: width,
        canvas: scrimCanvas,
      });
    }
  }

  // Individual editable text layers + rendered raster representation
  const roleNames: Record<TextLayer["role"], string> = {
    headline: "Título",
    subtitle: "Subtítulo",
    caption: "Etiqueta",
    custom: "Texto",
  };

  for (let i = 0; i < doc.layers.length; i++) {
    const layer = doc.layers[i];
    const displayText = (layer.uppercase ? layer.text.toUpperCase() : layer.text).trim();
    if (!displayText) continue;

    const layerCanvas = document.createElement("canvas");
    layerCanvas.width = width;
    layerCanvas.height = height;
    const layerCtx = layerCanvas.getContext("2d");
    if (layerCtx) {
      drawTextLayer(layerCtx, layer, width, height, scale);
    }

    const fontSizePx = layer.fontSize * scale;
    const boxX = Math.round((layer.x / 100) * width);
    const boxY = Math.round((layer.y / 100) * height);
    const boxW = Math.round((layer.widthPct / 100) * width);
    const boxH = Math.max(Math.round(fontSizePx * 2), Math.round(height - boxY));
    const fontName = extractPrimaryFontName(layer.fontFamily);
    const shortSnippet = displayText.replace(/\s+/g, " ").slice(0, 24);

    const psdLayer: Layer = {
      name: `${roleNames[layer.role]} · ${shortSnippet}`,
      top: 0,
      left: 0,
      bottom: height,
      right: width,
      canvas: layerCanvas,
      text: {
        text: displayText.replace(/\n/g, "\r"),
        shapeType: "box",
        boxBounds: [0, 0, boxH, boxW],
        transform: [1, 0, 0, 1, boxX, boxY],
        antiAlias: "smooth",
        style: {
          font: { name: fontName },
          fontSize: fontSizePx,
          fauxBold: layer.fontWeight >= 600,
          autoLeading: false,
          leading: fontSizePx * layer.lineHeight,
          tracking: Math.round(layer.letterSpacing * 1000),
          fillColor: hexToRgb(layer.color),
        },
        paragraphStyle: {
          justification: layer.textAlign,
        },
      },
      effects:
        layer.shadowStrength > 0.04
          ? {
              dropShadow: [
                {
                  enabled: true,
                  color: { r: 0, g: 0, b: 0 },
                  opacity: Math.min(0.85, layer.shadowStrength * 0.8),
                  angle: 90,
                  distance: { value: Math.round(4 * scale * layer.shadowStrength), units: "Pixels" },
                  size: { value: Math.round(16 * scale * layer.shadowStrength), units: "Pixels" },
                },
              ],
            }
          : undefined,
    };

    children.push(psdLayer);
  }

  const psdDoc: Psd = {
    width,
    height,
    channels: 3,
    bitsPerChannel: 8,
    colorMode: 3,
    canvas: compositeCanvas,
    children,
  };

  const arrayBuffer = writePsd(psdDoc, {
    generateThumbnail: true,
    noBackground: true,
  });

  const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const prefix = getSafeFilePrefix(doc);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${prefix}-${width}x${height}.psd`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function downloadComposition(
  doc: StudioDocumentState,
  options: ExportOptions
): Promise<void> {
  if (options.mimeType === "application/psd") {
    await downloadPsdComposition(doc, options.scale);
    return;
  }

  const dataUrl = await renderCompositionToDataUrl(doc, {
    scale: options.scale,
    mimeType: options.mimeType,
    quality: options.quality,
  });
  const ext = options.mimeType === "image/png" ? "png" : "jpg";
  const base = getCanvasDimensions(doc.format);
  const w = base.width * options.scale;
  const h = base.height * options.scale;
  const prefix = getSafeFilePrefix(doc);

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${prefix}-${w}x${h}.${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
