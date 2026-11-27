import { useEffect, useState } from "react";
import { Download, Layers, X } from "lucide-react";
import type { StudioDocumentState } from "../types/studio";
import { downloadComposition, renderCompositionToDataUrl } from "../utils/canvasExport";
import { getCanvasDimensions } from "../utils/studioDefaults";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  docState: StudioDocumentState;
}

type ExportFormatType = "image/png" | "image/jpeg" | "application/psd";

export function ExportModal({ isOpen, onClose, docState }: ExportModalProps) {
  const [scale, setScale] = useState<1 | 2>(1);
  const [mimeType, setMimeType] = useState<ExportFormatType>("image/png");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dims = getCanvasDimensions(docState.format);
  const outW = dims.width * scale;
  const outH = dims.height * scale;

  const hasScrim = docState.image.scrimType !== "none" && docState.image.scrimOpacity > 0.01;
  const activeTextLayersCount = docState.layers.filter((l) => l.text.trim().length > 0).length;
  const totalPsdLayers = 1 + (hasScrim ? 1 : 0) + activeTextLayersCount;

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsGenerating(true);
    setErrorMsg(null);

    renderCompositionToDataUrl(docState, {
      scale: 1,
      mimeType: "image/jpeg",
      quality: 0.85,
    })
      .then((url) => {
        if (active) setPreviewUrl(url);
      })
      .catch((err) => {
        if (active) setErrorMsg(err instanceof Error ? err.message : "No se pudo generar la vista previa.");
      })
      .finally(() => {
        if (active) setIsGenerating(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, docState]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    setErrorMsg(null);
    try {
      await downloadComposition(docState, {
        scale,
        mimeType,
        quality: 0.95,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al exportar el archivo.");
    } finally {
      setIsDownloading(false);
    }
  };

  const formatExtLabel =
    mimeType === "application/psd"
      ? "PSD"
      : mimeType === "image/png"
      ? "PNG"
      : "JPG";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#13161C] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2
              id="export-modal-title"
              className="text-base font-semibold text-neutral-900 dark:text-neutral-100"
            >
              Exportar diseño
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums mt-0.5">
              Salida exacta: {outW} × {outH} px ({docState.format === "1080x1920" ? "Historia 9:16" : "Feed Vertical 4:5"})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            aria-label="Cerrar ventana de exportación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Rendered Preview */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-[#0B0D10] p-3 flex items-center justify-center">
            {isGenerating ? (
              <div className="aspect-[4/5] w-48 rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-pulse flex items-center justify-center text-xs text-neutral-500">
                Renderizando...
              </div>
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="Vista previa final para exportación"
                className="max-h-[340px] w-auto rounded-lg shadow-md object-contain"
              />
            ) : (
              <div className="py-12 text-xs text-neutral-500">Sin vista previa</div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Resolución de salida
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setScale(1)}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    scale === 1
                      ? "border-blue-600 bg-blue-600/10 text-neutral-900 dark:text-neutral-100"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700"
                  }`}
                >
                  <div className="text-xs font-semibold tabular-nums">
                    1× Estándar · {dims.width} × {dims.height} px
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Tamaño nativo para Instagram y TikTok
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setScale(2)}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    scale === 2
                      ? "border-blue-600 bg-blue-600/10 text-neutral-900 dark:text-neutral-100"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700"
                  }`}
                >
                  <div className="text-xs font-semibold tabular-nums">
                    2× Ultra HD · {dims.width * 2} × {dims.height * 2} px
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Máxima nitidez tipográfica y capas de alta definición
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Formato de archivo
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-[#161A22]">
                <button
                  type="button"
                  onClick={() => setMimeType("image/png")}
                  className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    mimeType === "image/png"
                      ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  PNG
                </button>
                <button
                  type="button"
                  onClick={() => setMimeType("image/jpeg")}
                  className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    mimeType === "image/jpeg"
                      ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  JPG
                </button>
                <button
                  type="button"
                  onClick={() => setMimeType("application/psd")}
                  className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    mimeType === "application/psd"
                      ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  PSD (Capas)
                </button>
              </div>
            </div>

            {mimeType === "application/psd" && (
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#161A22] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Archivo Photoshop con {totalPsdLayers} capas separadas</span>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Incluye imagen base, {hasScrim ? "velo de legibilidad, " : ""}y {activeTextLayersCount} capas de texto editables con sus coordenadas, color y sombra.
                </p>
              </div>
            )}

            {errorMsg && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownload}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {isDownloading
                  ? mimeType === "application/psd"
                    ? "Empaquetando capas PSD..."
                    : "Generando archivo..."
                  : `Descargar ${formatExtLabel} (${outW}×${outH})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
