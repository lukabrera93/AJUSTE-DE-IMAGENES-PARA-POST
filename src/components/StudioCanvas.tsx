import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Eye,
  Grid3X3,
  Lock,
  Move,
  Pencil,
  Redo2,
  RotateCcw,
  RotateCw,
  Sparkles,
  Undo2,
  Unlock,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type {
  CanvasFormat,
  ImageSettings,
  PreviewSession,
  StudioDocumentState,
  TextLayer,
} from "../types/studio";

interface StudioCanvasProps {
  docState: StudioDocumentState;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onChangeFormat: (format: CanvasFormat) => void;
  onUpdateLayer: (id: string, patch: Partial<TextLayer>, commitHistory?: boolean) => void;
  onUpdateImage: (patch: Partial<ImageSettings>, commitLabel?: string) => void;
  onCommitEdit: (label?: string) => void;
  showGuides: boolean;
  onToggleGuides: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyPositionLabel: string;
  onUndo: () => void;
  onRedo: () => void;
  onTriggerAnalyze: () => void;
  isAnalyzing: boolean;
  previewSession: PreviewSession | null;
  isComparingOriginal: boolean;
  onToggleCompareOriginal: () => void;
  onConfirmPreview: () => void;
  onDiscardPreview: () => void;
}

export function StudioCanvas({
  docState,
  selectedLayerId,
  onSelectLayer,
  onChangeFormat,
  onUpdateLayer,
  onUpdateImage,
  onCommitEdit,
  showGuides,
  onToggleGuides,
  canUndo,
  canRedo,
  historyPositionLabel,
  onUndo,
  onRedo,
  onTriggerAnalyze,
  isAnalyzing,
  previewSession,
  isComparingOriginal,
  onToggleCompareOriginal,
  onConfirmPreview,
  onDiscardPreview,
}: StudioCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState({ width: 320, height: 400 });
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [snapGuide, setSnapGuide] = useState<{ centerX?: boolean; centerY?: boolean; leftMargin?: boolean }>({});
  const [imageBroken, setImageBroken] = useState(false);
  const [isImageMoveMode, setIsImageMoveMode] = useState(false);
  const [imgNaturalRatio, setImgNaturalRatio] = useState<number | null>(null);

  const activeDoc =
    previewSession && !isComparingOriginal ? previewSession.candidateState : docState;

  const isPreviewMode = Boolean(previewSession);
  const isImageLocked = Boolean(activeDoc.image.locked);

  useEffect(() => {
    if (docState.image.locked && isImageMoveMode) {
      setIsImageMoveMode(false);
    }
  }, [docState.image.locked, isImageMoveMode]);

  useEffect(() => {
    setImageBroken(false);
    setImgNaturalRatio(null);
  }, [activeDoc.image.src]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const computeSize = () => {
      const rect = el.getBoundingClientRect();
      const isNarrow = rect.width < 320;
      const padX = isNarrow ? 12 : rect.width < 640 ? 20 : 44;
      const padY = isNarrow ? 12 : rect.width < 640 ? 20 : 36;
      const availW = Math.max(120, rect.width - padX);
      const availH = Math.max(160, rect.height - padY);

      const aspect = activeDoc.format === "1080x1920" ? 1080 / 1920 : 1080 / 1350;

      let w = availW;
      let h = w / aspect;
      if (h > availH) {
        h = availH;
        w = h * aspect;
      }
      setBoardSize({ width: Math.floor(w), height: Math.floor(h) });
    };

    computeSize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(computeSize) : null;
    ro?.observe(el);
    window.addEventListener("resize", computeSize);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", computeSize);
    };
  }, [activeDoc.format]);

  const scale = boardSize.width / 1080;

  // Text Layer Dragging
  const dragRef = useRef<{
    layerId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    widthPct: number;
    moved: boolean;
  } | null>(null);

  // Image Free Dragging
  const imageDragRef = useRef<{
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
    moved: boolean;
  } | null>(null);

  const handleLayerPointerDown = (e: React.PointerEvent, layer: TextLayer) => {
    if (isPreviewMode || isImageMoveMode || editingLayerId === layer.id) return;
    e.stopPropagation();
    onSelectLayer(layer.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      layerId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: layer.x,
      origY: layer.y,
      widthPct: layer.widthPct,
      moved: false,
    };
  };

  const handleLayerPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    const dxPx = e.clientX - drag.startX;
    const dyPx = e.clientY - drag.startY;
    if (Math.abs(dxPx) > 2 || Math.abs(dyPx) > 2) {
      drag.moved = true;
    }

    const dxPct = (dxPx / boardSize.width) * 100;
    const dyPct = (dyPx / boardSize.height) * 100;

    let nextX = Math.max(2, Math.min(98 - drag.widthPct, drag.origX + dxPct));
    const nextY = Math.max(2, Math.min(94, drag.origY + dyPct));

    const centerPct = nextX + drag.widthPct / 2;
    let snappedCenter = false;
    let snappedLeft = false;

    if (Math.abs(centerPct - 50) < 1.6) {
      nextX = 50 - drag.widthPct / 2;
      snappedCenter = true;
    } else if (Math.abs(nextX - 8) < 1.4) {
      nextX = 8;
      snappedLeft = true;
    }

    setSnapGuide({ centerX: snappedCenter, leftMargin: snappedLeft });
    onUpdateLayer(drag.layerId, { x: Number(nextX.toFixed(1)), y: Number(nextY.toFixed(1)) }, false);
  };

  const handleLayerPointerUp = () => {
    if (dragRef.current?.moved) {
      onCommitEdit("Posición de texto ajustada");
    }
    dragRef.current = null;
    setSnapGuide({});
  };

  // Board / Background Image Pointer Dragging
  const handleBoardPointerDown = (e: React.PointerEvent) => {
    if (isPreviewMode) return;
    if (editingLayerId) {
      setEditingLayerId(null);
      onCommitEdit("Edición de texto");
    }
    onSelectLayer(null);
    if (isImageLocked) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    imageDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origPanX: docState.image.panX,
      origPanY: docState.image.panY,
      moved: false,
    };
  };

  const handleBoardPointerMove = (e: React.PointerEvent) => {
    if (isImageLocked) return;
    const imgDrag = imageDragRef.current;
    if (!imgDrag) return;

    const dxPx = e.clientX - imgDrag.startX;
    const dyPx = e.clientY - imgDrag.startY;
    if (Math.abs(dxPx) > 2 || Math.abs(dyPx) > 2) {
      imgDrag.moved = true;
    }

    // Matching pan formula: offset = (pan / 100) * boardSize * 0.5 => deltaPan = (dx / boardSize) * 200
    let nextPanX = Math.max(-150, Math.min(150, imgDrag.origPanX + (dxPx / boardSize.width) * 200));
    let nextPanY = Math.max(-150, Math.min(150, imgDrag.origPanY + (dyPx / boardSize.height) * 200));

    let snapX = false;
    let snapY = false;
    if (Math.abs(nextPanX) < 3.5) {
      nextPanX = 0;
      snapX = true;
    }
    if (Math.abs(nextPanY) < 3.5) {
      nextPanY = 0;
      snapY = true;
    }

    setSnapGuide({ centerX: snapX, centerY: snapY });
    onUpdateImage({
      panX: Math.round(nextPanX),
      panY: Math.round(nextPanY),
    });
  };

  const handleBoardPointerUp = () => {
    if (imageDragRef.current?.moved) {
      onCommitEdit("Imagen reubicada");
    }
    imageDragRef.current = null;
    setSnapGuide({});
  };

  const handleBoardWheel = (e: React.WheelEvent) => {
    if (isPreviewMode || isImageLocked) return;
    if (!isImageMoveMode && !e.ctrlKey && !e.altKey) return;
    const delta = e.deltaY < 0 ? 0.06 : -0.06;
    const nextZoom = Math.max(0.3, Math.min(3, Number((docState.image.zoom + delta).toFixed(2))));
    onUpdateImage({ zoom: nextZoom });
  };

  const renderScrimStyle = (): React.CSSProperties | null => {
    const { scrimType, scrimOpacity } = activeDoc.image;
    if (scrimType === "none" || scrimOpacity <= 0) return null;

    if (scrimType === "full") {
      return { background: `rgba(0, 0, 0, ${scrimOpacity})` };
    }
    if (scrimType === "top") {
      return {
        background: `linear-gradient(to bottom, rgba(0,0,0,${Math.min(0.85, scrimOpacity * 1.15)}) 0%, rgba(0,0,0,${scrimOpacity * 0.45}) 32%, rgba(0,0,0,0) 58%)`,
      };
    }
    if (scrimType === "bottom") {
      return {
        background: `linear-gradient(to top, rgba(0,0,0,${Math.min(0.88, scrimOpacity * 1.2)}) 0%, rgba(0,0,0,${scrimOpacity * 0.45}) 32%, rgba(0,0,0,0) 58%)`,
      };
    }
    return {
      background: `radial-gradient(circle at center, rgba(0,0,0,0) 20%, rgba(0,0,0,${Math.min(0.85, scrimOpacity * 1.2)}) 100%)`,
    };
  };

  const scrimStyle = renderScrimStyle();

  // Compute exact unclipped image dimensions matching drawBaseImageToCanvas 1:1
  const canvasRatio = activeDoc.format === "1080x1920" ? 1080 / 1920 : 1080 / 1350;
  const effectiveRatio = imgNaturalRatio || canvasRatio;
  let baseWidthPct = 100;
  let baseHeightPct = 100;
  if (effectiveRatio > canvasRatio) {
    baseHeightPct = 100;
    baseWidthPct = (effectiveRatio / canvasRatio) * 100;
  } else {
    baseWidthPct = 100;
    baseHeightPct = (canvasRatio / effectiveRatio) * 100;
  }
  const panOffsetX = (activeDoc.image.panX / 100) * boardSize.width * 0.5;
  const panOffsetY = (activeDoc.image.panY / 100) * boardSize.height * 0.5;

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-neutral-100 dark:bg-[#0B0D10]">
      {/* Workspace Toolbar */}
      <div className="shrink-0 px-2.5 lg:px-4 py-2 border-b border-neutral-200 dark:border-neutral-800/90 bg-white/85 dark:bg-[#111419]/85 backdrop-blur-sm flex flex-wrap items-center justify-between gap-2">
        {/* Format Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-[#181C24] border border-neutral-200/80 dark:border-neutral-800">
          <button
            type="button"
            disabled={isPreviewMode}
            onClick={() => onChangeFormat("1080x1350")}
            className={`px-2 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors tabular-nums whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
              activeDoc.format === "1080x1350"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            1080×1350
          </button>
          <button
            type="button"
            disabled={isPreviewMode}
            onClick={() => onChangeFormat("1080x1920")}
            className={`px-2 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors tabular-nums whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
              activeDoc.format === "1080x1920"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            1080×1920
          </button>
        </div>

        {/* Center/Right Canvas Tools */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#181C24] border border-neutral-200/80 dark:border-neutral-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo || isPreviewMode}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-800 disabled:opacity-35 transition-colors cursor-pointer whitespace-nowrap"
              title="Retroceder modificación (Atrás)"
              aria-label="Retroceder modificación"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Retroceder</span>
            </button>
            <span className="text-[10px] font-mono tabular-nums text-neutral-500 dark:text-neutral-400 px-1 select-none">
              {historyPositionLabel}
            </span>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo || isPreviewMode}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-800 disabled:opacity-35 transition-colors cursor-pointer whitespace-nowrap"
              title="Avanzar modificación (Adelante)"
              aria-label="Avanzar modificación"
            >
              <span className="hidden sm:inline">Avanzar</span>
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            disabled={isPreviewMode || isImageLocked}
            onClick={() => setIsImageMoveMode((m) => !m)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
              isImageMoveMode && !isImageLocked
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
            title={
              isImageLocked
                ? "Desbloquea la imagen para moverla"
                : "Activar modo libre para mover, escalar y rotar la imagen"
            }
          >
            <Move className="w-3.5 h-3.5" />
            <span>Mover imagen</span>
          </button>

          <button
            type="button"
            disabled={isPreviewMode}
            onClick={() => {
              const nextLocked = !docState.image.locked;
              if (nextLocked) setIsImageMoveMode(false);
              onUpdateImage(
                { locked: nextLocked },
                nextLocked ? "Imagen bloqueada" : "Imagen desbloqueada"
              );
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
              isImageLocked
                ? "border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
            title={
              isImageLocked
                ? "Desbloquear imagen para moverla de nuevo"
                : "Bloquear imagen para editar texto sin moverla por error"
            }
            aria-pressed={isImageLocked}
          >
            {isImageLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{isImageLocked ? "Bloqueada" : "Bloquear"}</span>
          </button>

          <button
            type="button"
            onClick={onToggleGuides}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showGuides
                ? "border-blue-600/40 bg-blue-600/10 text-blue-600 dark:text-blue-400"
                : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
            title="Mostrar guías de zonas seguras"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Zonas seguras</span>
          </button>

          <button
            type="button"
            disabled={isAnalyzing}
            onClick={onTriggerAnalyze}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-white disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAnalyzing ? "Analizando..." : "Recomendar ubicación"}</span>
          </button>
        </div>
      </div>

      {/* Dedicated Image Manipulation Sub-bar when Mover imagen mode is active */}
      {isImageMoveMode && !isImageLocked && !isPreviewMode && (
        <div className="shrink-0 px-3 py-1.5 border-b border-blue-500/30 bg-blue-600/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300">
            Arrastra la imagen libremente sobre el lienzo (rueda para zoom)
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() =>
                onUpdateImage(
                  { zoom: Math.max(0.3, Number((docState.image.zoom - 0.1).toFixed(2))) },
                  "Escala de imagen"
                )
              }
              className="p-1.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 cursor-pointer"
              title="Alejar imagen"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono tabular-nums px-1 text-neutral-700 dark:text-neutral-200">
              {docState.image.zoom.toFixed(2)}×
            </span>
            <button
              type="button"
              onClick={() =>
                onUpdateImage(
                  { zoom: Math.min(3, Number((docState.image.zoom + 0.1).toFixed(2))) },
                  "Escala de imagen"
                )
              }
              className="p-1.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 cursor-pointer"
              title="Acercar imagen"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateImage(
                  { rotation: Math.max(-180, (docState.image.rotation || 0) - 15) },
                  "Rotación de imagen"
                )
              }
              className="p-1.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 cursor-pointer"
              title="Rotar -15°"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateImage(
                  { rotation: Math.min(180, (docState.image.rotation || 0) + 15) },
                  "Rotación de imagen"
                )
              }
              className="p-1.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 cursor-pointer"
              title="Rotar +15°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateImage(
                  { zoom: 1, panX: 0, panY: 0, rotation: 0 },
                  "Imagen centrada"
                )
              }
              className="px-2 py-1 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 cursor-pointer"
            >
              Centrar
            </button>
            <button
              type="button"
              onClick={() => {
                setIsImageMoveMode(false);
                onUpdateImage({ locked: true }, "Imagen bloqueada");
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-[11px] font-semibold cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              <span>Bloquear aquí</span>
            </button>
            <button
              type="button"
              onClick={() => setIsImageMoveMode(false)}
              className="px-2.5 py-1 rounded-md bg-blue-600 text-white text-[11px] font-semibold cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Interactive Stage Viewport */}
      <div
        ref={stageRef}
        onClick={() => {
          onSelectLayer(null);
          if (editingLayerId) {
            setEditingLayerId(null);
            onCommitEdit("Edición de texto");
          }
        }}
        className="relative flex-1 flex items-center justify-center overflow-hidden p-2 sm:p-4 select-none min-h-0"
      >
        {/* Artboard Container */}
        <div
          onPointerDown={handleBoardPointerDown}
          onPointerMove={handleBoardPointerMove}
          onPointerUp={handleBoardPointerUp}
          onPointerCancel={handleBoardPointerUp}
          onWheel={handleBoardWheel}
          style={{
            width: boardSize.width,
            height: boardSize.height,
            backgroundColor: activeDoc.image.canvasBgColor || "#0F1115",
            touchAction: "none",
          }}
          className={`relative overflow-hidden shadow-2xl transition-[box-shadow] ${
            isPreviewMode
              ? "ring-2 ring-blue-500 shadow-blue-950/30 cursor-default"
              : isImageLocked
              ? "cursor-default ring-1 ring-amber-500/35"
              : isImageMoveMode
              ? "cursor-grab active:cursor-grabbing ring-2 ring-blue-500"
              : "cursor-grab active:cursor-grabbing ring-1 ring-black/10 dark:ring-white/10"
          }`}
        >
          {/* Base Image (Unclipped natural aspect ratio centered, matching canvasExport 1:1) */}
          {imageBroken ? (
            <div className="absolute inset-0 bg-neutral-800 flex flex-col items-center justify-center text-neutral-400 text-xs p-6 text-center pointer-events-none">
              <span>No se pudo mostrar la imagen</span>
            </div>
          ) : (
            <img
              src={activeDoc.image.src}
              alt={activeDoc.image.name}
              referrerPolicy="no-referrer"
              onLoad={(e) => {
                if (e.currentTarget.naturalWidth && e.currentTarget.naturalHeight) {
                  setImgNaturalRatio(
                    e.currentTarget.naturalWidth / e.currentTarget.naturalHeight
                  );
                }
              }}
              onError={() => setImageBroken(true)}
              className="absolute max-w-none pointer-events-none select-none"
              style={{
                left: "50%",
                top: "50%",
                width: `${baseWidthPct}%`,
                height: `${baseHeightPct}%`,
                transform: `translate(calc(-50% + ${panOffsetX}px), calc(-50% + ${panOffsetY}px)) rotate(${activeDoc.image.rotation || 0}deg) scale(${activeDoc.image.zoom})`,
                transformOrigin: "center center",
                filter: `brightness(${activeDoc.image.brightness}%) contrast(${activeDoc.image.contrast}%)`,
              }}
            />
          )}

          {/* Protective Scrim */}
          {scrimStyle && (
            <div className="absolute inset-0 pointer-events-none" style={scrimStyle} />
          )}

          {/* Safe Zone Guides */}
          {showGuides && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/20" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/20" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/20" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/20" />
              <div className="absolute inset-[6%] border border-dashed border-white/35" />

              {activeDoc.format === "1080x1920" && (
                <>
                  <div className="absolute inset-x-0 top-0 h-[14%] bg-amber-500/15 border-b border-amber-400/50 flex items-end justify-center pb-1">
                    <span className="text-[10px] font-medium text-amber-200 tracking-wide">
                      Zona UI Superior
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-[18%] bg-amber-500/15 border-t border-amber-400/50 flex items-start justify-center pt-1">
                    <span className="text-[10px] font-medium text-amber-200 tracking-wide">
                      Zona UI Inferior
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Snap Guides during Drag */}
          {snapGuide.centerX && (
            <div className="absolute inset-y-0 left-1/2 w-px bg-blue-400 z-20 pointer-events-none" />
          )}
          {snapGuide.centerY && (
            <div className="absolute inset-x-0 top-1/2 h-px bg-blue-400 z-20 pointer-events-none" />
          )}
          {snapGuide.leftMargin && (
            <div className="absolute inset-y-0 left-[8%] w-px bg-blue-400 z-20 pointer-events-none" />
          )}

          {/* AI Focal Subject Indicator in Preview Mode */}
          {isPreviewMode && !isComparingOriginal && previewSession?.focalZone && (
            <div
              className="absolute border border-dashed border-amber-300/75 bg-amber-400/5 pointer-events-none z-10"
              style={{
                left: `${previewSession.focalZone.x}%`,
                top: `${previewSession.focalZone.y}%`,
                width: `${previewSession.focalZone.width}%`,
                height: `${previewSession.focalZone.height}%`,
              }}
            >
              <span className="inline-block bg-black/75 text-amber-200 text-[10px] px-1.5 py-0.5">
                Sujeto: {previewSession.focalZone.label}
              </span>
            </div>
          )}

          {/* Text Layers */}
          {activeDoc.layers.map((layer) => {
            const isSelected = !isPreviewMode && !isImageMoveMode && selectedLayerId === layer.id;
            const isEditing = !isPreviewMode && !isImageMoveMode && editingLayerId === layer.id;
            const scaledFontSize = Math.max(8, layer.fontSize * scale);
            const shadowCss =
              layer.shadowStrength > 0.02
                ? `0 ${Math.round(4 * scale * layer.shadowStrength)}px ${Math.round(18 * scale * layer.shadowStrength)}px rgba(0,0,0,${Math.min(0.88, layer.shadowStrength * 0.85)})`
                : "none";

            return (
              <div
                key={layer.id}
                onPointerDown={(e) => handleLayerPointerDown(e, layer)}
                onPointerMove={handleLayerPointerMove}
                onPointerUp={handleLayerPointerUp}
                onPointerCancel={handleLayerPointerUp}
                onDoubleClick={(e) => {
                  if (isPreviewMode || isImageMoveMode) return;
                  e.stopPropagation();
                  onSelectLayer(layer.id);
                  setEditingLayerId(layer.id);
                }}
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  width: `${layer.widthPct}%`,
                  fontFamily: layer.fontFamily,
                  fontSize: `${scaledFontSize}px`,
                  fontWeight: layer.fontWeight,
                  letterSpacing: `${layer.letterSpacing}em`,
                  lineHeight: layer.lineHeight,
                  textAlign: layer.textAlign,
                  color: layer.color,
                  textShadow: shadowCss,
                  textTransform: layer.uppercase ? "uppercase" : "none",
                  touchAction: "none",
                }}
                className={`absolute z-20 transition-shadow ${
                  isPreviewMode || isImageMoveMode
                    ? "pointer-events-none"
                    : isSelected
                    ? "cursor-move ring-1 ring-blue-400 bg-blue-500/5"
                    : "cursor-pointer hover:ring-1 hover:ring-white/45"
                } ${isImageMoveMode ? "opacity-75" : ""}`}
              >
                {isEditing ? (
                  <textarea
                    autoFocus
                    value={layer.text}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      onUpdateLayer(layer.id, { text: e.target.value }, false)
                    }
                    onBlur={() => {
                      setEditingLayerId(null);
                      onCommitEdit("Edición de texto");
                    }}
                    rows={Math.max(1, layer.text.split("\n").length)}
                    className="w-full bg-black/35 backdrop-blur-[2px] outline-none resize-none p-0.5 m-0 border border-blue-400 rounded"
                    style={{
                      fontFamily: "inherit",
                      fontSize: "inherit",
                      fontWeight: "inherit",
                      letterSpacing: "inherit",
                      lineHeight: "inherit",
                      textAlign: "inherit",
                      color: "inherit",
                      textTransform: layer.uppercase ? "uppercase" : "none",
                    }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap break-words">
                    {layer.text || "Escribe aquí..."}
                  </div>
                )}

                {isSelected && !isEditing && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLayerId(layer.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute -top-6 left-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-sans font-medium shadow-md cursor-pointer"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    <span>Editar</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dedicated Non-Overlapping Preview Confirmation Strip */}
      {previewSession && (
        <div className="shrink-0 border-t border-blue-500/30 bg-white dark:bg-[#141820] px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 z-20">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              Previsualizando: {previewSession.title}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
              {isComparingOriginal
                ? "Mostrando tu diseño anterior para comparar"
                : previewSession.subtitle}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onToggleCompareOriginal}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer min-h-[36px] ${
                isComparingOriginal
                  ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              {isComparingOriginal ? (
                <RotateCcw className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
              <span>{isComparingOriginal ? "Ver propuesta" : "Comparar actual"}</span>
            </button>

            <button
              type="button"
              onClick={onDiscardPreview}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer min-h-[36px]"
            >
              <X className="w-3.5 h-3.5" />
              <span>Descartar</span>
            </button>

            <button
              type="button"
              onClick={onConfirmPreview}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer min-h-[36px]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
