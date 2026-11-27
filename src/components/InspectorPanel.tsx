import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowRight,
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Play,
  Plus,
  Redo2,
  Search,
  Trash2,
  Undo2,
  Wand2,
  X,
} from "lucide-react";
import type {
  AestheticRecommendation,
  AnalysisResult,
  CustomPalette,
  FontAsset,
  FontFamilyGroup,
  LayoutProposal,
  TextLayer,
  TextRole,
  VersionSnapshot,
} from "../types/studio";
import {
  FONT_FAMILY_GROUPS,
  filterFontsByQuery,
  groupFontsByFamily,
  resolveFontFamilyGroup,
} from "../utils/studioDefaults";

export type InspectorTab = "ai" | "text" | "controls";

interface InspectorPanelProps {
  activeTab: InspectorTab;
  onChangeTab: (tab: InspectorTab) => void;
  // Recommendations tab
  onAnalyzeLocal: () => void;
  isAnalyzing: boolean;
  analysisError: string | null;
  analysisResult: AnalysisResult | null;
  activePreviewId?: string;
  onExecuteRecommendation: (rec: AestheticRecommendation) => void;
  onPreviewProposal: (proposal: LayoutProposal) => void;
  // Text tab
  layers: TextLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onAddLayer: (role: TextRole) => void;
  onDeleteLayer: (id: string) => void;
  onUpdateLayer: (id: string, patch: Partial<TextLayer>, commitHistory?: boolean) => void;
  onCommitEdit: (label?: string) => void;
  fonts: FontAsset[];
  customPalette?: CustomPalette | null;
  // Controls & History tab
  previewQuickChanges: boolean;
  onTogglePreviewQuickChanges: () => void;
  onRunQuickAdjustment: (presetId: string) => void;
  history: VersionSnapshot[];
  historyIndex: number;
  onStepBack: () => void;
  onStepForward: () => void;
  onSaveManualVersion: () => void;
  onPreviewVersion: (version: VersionSnapshot) => void;
  onJumpToHistoryIndex: (index: number) => void;
}

const ROLE_LABELS: Record<TextRole, string> = {
  headline: "Título",
  subtitle: "Subtítulo",
  caption: "Etiqueta",
  custom: "Texto",
};

const CATEGORY_LABELS: Record<AestheticRecommendation["category"], string> = {
  ubicacion: "Ubicación",
  contraste: "Contraste",
  tipografia: "Tipografía",
  respiracion: "Respiración",
};

export function InspectorPanel({
  activeTab,
  onChangeTab,
  onAnalyzeLocal,
  isAnalyzing,
  analysisError,
  analysisResult,
  activePreviewId,
  onExecuteRecommendation,
  onPreviewProposal,
  layers,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onUpdateLayer,
  onCommitEdit,
  fonts,
  customPalette,
  previewQuickChanges,
  onTogglePreviewQuickChanges,
  onRunQuickAdjustment,
  history,
  historyIndex,
  onStepBack,
  onStepForward,
  onSaveManualVersion,
  onPreviewVersion,
  onJumpToHistoryIndex,
}: InspectorPanelProps) {
  const [isFontPickerOpen, setIsFontPickerOpen] = useState(false);
  const [fontSearch, setFontSearch] = useState("");
  const [fontGroupFilter, setFontGroupFilter] = useState<"all" | FontFamilyGroup>("all");
  const fontSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFontPickerOpen) {
      setTimeout(() => fontSearchInputRef.current?.focus(), 20);
    }
  }, [isFontPickerOpen]);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || layers[0] || null;
  const customFonts = fonts.filter((f) => f.isCustom);
  const activeFontAsset = selectedLayer
    ? fonts.find((f) => f.family === selectedLayer.fontFamily) || null
    : null;
  const activeFontGroupMeta = activeFontAsset
    ? FONT_FAMILY_GROUPS.find((g) => g.id === resolveFontFamilyGroup(activeFontAsset))
    : null;
  const filteredGroupedFonts = groupFontsByFamily(
    filterFontsByQuery(fonts, fontSearch)
  ).filter((entry) => fontGroupFilter === "all" || entry.group.id === fontGroupFilter);
  const palette = analysisResult?.paletteColors ?? [
    "#FFFFFF",
    "#141619",
    "#E8DEC8",
    "#D4A359",
  ];

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Display newest-first while preserving exact index in history array
  const indexedHistory = history
    .map((ver, index) => ({ ver, index }))
    .reverse();

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Segmented Panel Tabs */}
      <div className="shrink-0 p-2.5 border-b border-neutral-200 dark:border-neutral-800/90">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-[#161A22]">
          <button
            type="button"
            onClick={() => onChangeTab("ai")}
            className={`py-1.5 px-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors truncate cursor-pointer ${
              activeTab === "ai"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            Recomendaciones
          </button>
          <button
            type="button"
            onClick={() => onChangeTab("text")}
            className={`py-1.5 px-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors truncate cursor-pointer ${
              activeTab === "text"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            Texto ({layers.length})
          </button>
          <button
            type="button"
            onClick={() => onChangeTab("controls")}
            className={`py-1.5 px-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors truncate cursor-pointer ${
              activeTab === "controls"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-5">
        {activeTab === "ai" && (
          <div className="space-y-4">
            <div className="space-y-2.5">
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Detecta espacios libres y contraste en tu foto para proponer ubicaciones y tipografías editoriales con{" "}
                {customFonts.length > 0
                  ? `tus ${customFonts.length} fuentes subidas.`
                  : "las fuentes del estudio."}
              </p>

              <button
                type="button"
                disabled={isAnalyzing}
                onClick={onAnalyzeLocal}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[42px]"
              >
                <Wand2 className="w-4 h-4 shrink-0" />
                <span>{isAnalyzing ? "Analizando..." : "Recomendaciones"}</span>
              </button>
            </div>

            {analysisError && (
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-600 dark:text-red-400">
                {analysisError}
              </div>
            )}

            {isAnalyzing && (
              <div className="space-y-2.5">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-24 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-[#161A22] animate-pulse"
                  />
                ))}
              </div>
            )}

            {!isAnalyzing && analysisResult && (
              <div className="space-y-5">
                {/* Extracted Palette & Custom Palette */}
                <div className="space-y-2.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                      <span>Paleta de tu imagen</span>
                      <span>Aplicar al texto</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {analysisResult.paletteColors.map((hex, i) => (
                        <button
                          key={`${hex}-${i}`}
                          type="button"
                          onClick={() => {
                            if (selectedLayer) {
                              onUpdateLayer(selectedLayer.id, { color: hex }, true);
                            }
                          }}
                          className="flex-1 h-7 rounded-md border border-black/10 dark:border-white/10 transition-transform hover:scale-105 cursor-pointer"
                          style={{ backgroundColor: hex }}
                          title={`Aplicar ${hex} al texto seleccionado`}
                        />
                      ))}
                    </div>
                  </div>

                  {customPalette && customPalette.colors.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                        <span className="truncate">Tu paleta ({customPalette.name})</span>
                        <span className="shrink-0">Aplicar al texto</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {customPalette.colors.map((hex, i) => (
                          <button
                            key={`custom-rec-${hex}-${i}`}
                            type="button"
                            onClick={() => {
                              if (selectedLayer) {
                                onUpdateLayer(selectedLayer.id, { color: hex }, true);
                              }
                            }}
                            className="w-7 h-7 rounded-md border border-black/10 dark:border-white/10 transition-transform hover:scale-105 cursor-pointer"
                            style={{ backgroundColor: hex }}
                            title={`Aplicar ${hex} al texto seleccionado`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Executable Clean-Aesthetic Recommendations */}
                {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Recomendaciones
                    </div>
                    {analysisResult.recommendations.map((rec) => {
                      const isActive = activePreviewId === rec.id;
                      const catLabel = CATEGORY_LABELS[rec.category] || "Estética";
                      return (
                        <div
                          key={rec.id}
                          className={`p-3 rounded-xl border space-y-2 transition-colors ${
                            isActive
                              ? "border-blue-600 bg-blue-600/10"
                              : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161A22]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {rec.patternSource && (
                                <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400 truncate mb-0.5">
                                  {rec.patternSource}
                                </div>
                              )}
                              <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                                {rec.title}
                              </div>
                            </div>
                            <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 shrink-0">
                              {catLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                            {rec.description}
                          </p>
                          <button
                            type="button"
                            onClick={() => onExecuteRecommendation(rec)}
                            className={`w-full py-2 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[36px] ${
                              isActive
                                ? "bg-blue-600 text-white"
                                : "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-white"
                            }`}
                          >
                            <Play className="w-3 h-3" />
                            <span>
                              {isActive ? "Visualizando ahora" : "Ejecutar y visualizar"}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Full Strategic Proposals */}
                <div className="space-y-2.5 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Composiciones completas
                  </div>
                  {analysisResult.proposals.map((prop, index) => {
                    const isActivePreview = activePreviewId === prop.id;
                    const primaryFont = prop.placements[0]?.fontFamily || "";
                    return (
                      <div
                        key={prop.id}
                        className={`p-3 rounded-xl border transition-colors space-y-2 ${
                          isActivePreview
                            ? "border-blue-600 bg-blue-600/10"
                            : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161A22]"
                        }`}
                      >
                        <div>
                          {prop.patternSource && (
                            <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400 truncate mb-0.5">
                              {prop.patternSource}
                            </div>
                          )}
                          <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                            0{index + 1}. {prop.title}
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Fuente: {primaryFont.replace(/["']/g, "").split(",")[0]}
                          </div>
                        </div>

                        <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                          {prop.rationale}
                        </p>

                        <button
                          type="button"
                          onClick={() => onPreviewProposal(prop)}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[36px] ${
                            isActivePreview
                              ? "bg-blue-600 text-white"
                              : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100"
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>
                            {isActivePreview ? "Visualizando ahora" : "Ejecutar y previsualizar"}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!isAnalyzing && !analysisResult && !analysisError && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#161A22] p-3.5 space-y-2">
                <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Cómo funciona
                </div>
                <ol className="text-[11px] text-neutral-600 dark:text-neutral-400 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Sube tu imagen, paleta y fuentes en el panel izquierdo.</li>
                  <li>Pulsa Recomendaciones para obtener ubicaciones y estilos listos para aplicar.</li>
                  <li>Ejecuta cualquier opción para previsualizarla al instante antes de confirmar.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {activeTab === "text" && (
          <div className="space-y-4">
            {/* Layer selector + Add */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Capas de texto
                </span>
                <button
                  type="button"
                  onClick={() => onAddLayer("custom")}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {layers.map((layer) => {
                  const isSel = selectedLayer?.id === layer.id;
                  return (
                    <div
                      key={layer.id}
                      onClick={() => onSelectLayer(layer.id)}
                      className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border transition-colors cursor-pointer ${
                        isSel
                          ? "border-blue-600 bg-blue-600/10"
                          : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161A22] hover:border-neutral-300 dark:hover:border-neutral-700"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {layer.text || "Texto vacío"}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                          {ROLE_LABELS[layer.role]} · {Math.round(layer.fontSize)}px
                        </div>
                      </div>
                      {layers.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLayer(layer.id);
                          }}
                          className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded text-neutral-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
                          aria-label="Eliminar capa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Layer Live Editor */}
            {selectedLayer && (
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-3.5">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                    Contenido en tiempo real
                  </span>
                  <textarea
                    rows={3}
                    value={selectedLayer.text}
                    onChange={(e) =>
                      onUpdateLayer(selectedLayer.id, { text: e.target.value }, false)
                    }
                    onBlur={() => onCommitEdit("Texto editado")}
                    className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#161A22] px-2.5 py-2 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Escribe el texto aquí..."
                  />
                </label>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                    <span>Tipografía</span>
                    {activeFontGroupMeta && (
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {activeFontGroupMeta.shortLabel}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsFontPickerOpen((open) => !open)}
                    aria-expanded={isFontPickerOpen}
                    aria-label="Selector buscador de tipografía"
                    className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#161A22] hover:border-blue-500/60 px-2.5 py-2 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-sm text-neutral-900 dark:text-neutral-100 truncate"
                        style={{ fontFamily: selectedLayer.fontFamily }}
                      >
                        {activeFontAsset?.name ||
                          selectedLayer.fontFamily.replace(/["']/g, "").split(",")[0]}
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                        {activeFontAsset?.isCustom
                          ? `Subida · ${activeFontAsset.formatLabel || "FONT"}`
                          : "Toca para buscar o cambiar"}
                      </div>
                    </div>
                    {isFontPickerOpen ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                    )}
                  </button>

                  {isFontPickerOpen && (
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#141820] p-2 space-y-2 shadow-sm">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          ref={fontSearchInputRef}
                          type="search"
                          value={fontSearch}
                          onChange={(e) => setFontSearch(e.target.value)}
                          placeholder="Buscar fuente (ej. Bodoni, Script, Oswald)..."
                          aria-label="Buscar tipografía en editor"
                          className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#111419] pl-8 pr-7 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        {fontSearch && (
                          <button
                            type="button"
                            onClick={() => setFontSearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                            aria-label="Limpiar búsqueda de tipografía"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                        <button
                          type="button"
                          onClick={() => setFontGroupFilter("all")}
                          className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            fontGroupFilter === "all"
                              ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                          }`}
                        >
                          Todas
                        </button>
                        {FONT_FAMILY_GROUPS.map((grp) => (
                          <button
                            key={grp.id}
                            type="button"
                            onClick={() => setFontGroupFilter(grp.id)}
                            className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              fontGroupFilter === grp.id
                                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                            }`}
                          >
                            {grp.shortLabel}
                          </button>
                        ))}
                      </div>

                      <div className="max-h-[220px] overflow-y-auto space-y-2 pr-0.5">
                        {filteredGroupedFonts.length === 0 ? (
                          <div className="py-4 text-center space-y-1.5">
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              No hay fuentes que coincidan.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setFontSearch("");
                                setFontGroupFilter("all");
                              }}
                              className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              Ver todas
                            </button>
                          </div>
                        ) : (
                          filteredGroupedFonts.map((entry) => (
                            <div key={entry.group.id} className="space-y-1">
                              <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 px-1 pt-0.5">
                                {entry.group.label}
                              </div>
                              {entry.fonts.map((f) => {
                                const isActive = f.family === selectedLayer.fontFamily;
                                return (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => {
                                      onUpdateLayer(
                                        selectedLayer.id,
                                        { fontFamily: f.family },
                                        true
                                      );
                                      setIsFontPickerOpen(false);
                                    }}
                                    className={`w-full px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                      isActive
                                        ? "border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400"
                                        : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161A22] hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div
                                        className="text-sm truncate"
                                        style={{ fontFamily: f.family }}
                                      >
                                        {f.name}
                                      </div>
                                      {f.isCustom && (
                                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                                          Subida · {f.formatLabel || "FONT"}
                                        </div>
                                      )}
                                    </div>
                                    {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <label className="space-y-1">
                    <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                      <span>Tamaño</span>
                      <span className="tabular-nums font-mono">{selectedLayer.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={16}
                      max={150}
                      step={1}
                      value={selectedLayer.fontSize}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, { fontSize: Number(e.target.value) }, false)
                      }
                      onMouseUp={() => onCommitEdit("Tamaño ajustado")}
                      onTouchEnd={() => onCommitEdit("Tamaño ajustado")}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </label>

                  <label className="space-y-1">
                    <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                      <span>Ancho</span>
                      <span className="tabular-nums font-mono">{selectedLayer.widthPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={92}
                      step={1}
                      value={selectedLayer.widthPct}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, { widthPct: Number(e.target.value) }, false)
                      }
                      onMouseUp={() => onCommitEdit("Ancho de caja ajustado")}
                      onTouchEnd={() => onCommitEdit("Ancho de caja ajustado")}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </label>

                  <label className="space-y-1">
                    <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                      <span>Interlineado</span>
                      <span className="tabular-nums font-mono">
                        {selectedLayer.lineHeight.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.85}
                      max={1.8}
                      step={0.02}
                      value={selectedLayer.lineHeight}
                      onChange={(e) =>
                        onUpdateLayer(
                          selectedLayer.id,
                          { lineHeight: Number(e.target.value) },
                          false
                        )
                      }
                      onMouseUp={() => onCommitEdit("Interlineado ajustado")}
                      onTouchEnd={() => onCommitEdit("Interlineado ajustado")}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </label>

                  <label className="space-y-1">
                    <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                      <span>Espaciado</span>
                      <span className="tabular-nums font-mono">
                        {selectedLayer.letterSpacing.toFixed(2)}em
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-0.06}
                      max={0.28}
                      step={0.01}
                      value={selectedLayer.letterSpacing}
                      onChange={(e) =>
                        onUpdateLayer(
                          selectedLayer.id,
                          { letterSpacing: Number(e.target.value) },
                          false
                        )
                      }
                      onMouseUp={() => onCommitEdit("Espaciado ajustado")}
                      onTouchEnd={() => onCommitEdit("Espaciado ajustado")}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 items-end">
                  <div className="space-y-1">
                    <span className="text-[11px] text-neutral-600 dark:text-neutral-400">
                      Alineación
                    </span>
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-[#161A22]">
                      {(
                        [
                          { id: "left", icon: AlignLeft, label: "Izquierda" },
                          { id: "center", icon: AlignCenter, label: "Centro" },
                          { id: "right", icon: AlignRight, label: "Derecha" },
                        ] as const
                      ).map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              onUpdateLayer(selectedLayer.id, { textAlign: opt.id }, true)
                            }
                            aria-label={opt.label}
                            className={`py-1.5 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                              selectedLayer.textAlign === opt.id
                                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                                : "text-neutral-500 dark:text-neutral-400"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-neutral-600 dark:text-neutral-400">
                      Peso y caja
                    </span>
                    <div className="flex items-center gap-1">
                      <select
                        value={selectedLayer.fontWeight}
                        onChange={(e) =>
                          onUpdateLayer(
                            selectedLayer.id,
                            { fontWeight: Number(e.target.value) },
                            true
                          )
                        }
                        className="flex-1 min-w-0 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#161A22] px-1.5 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 cursor-pointer"
                      >
                        <option value={400}>400</option>
                        <option value={500}>500</option>
                        <option value={600}>600</option>
                        <option value={700}>700</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLayer(
                            selectedLayer.id,
                            { uppercase: !selectedLayer.uppercase },
                            true
                          )
                        }
                        className={`px-2 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                          selectedLayer.uppercase
                            ? "border-blue-600 bg-blue-600/15 text-blue-600 dark:text-blue-400"
                            : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
                        }`}
                        title="Alternar mayúsculas"
                      >
                        AA
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                    <span>Color de texto</span>
                    <span className="font-mono uppercase">{selectedLayer.color}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedLayer.color}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, { color: e.target.value }, false)
                      }
                      onBlur={() => onCommitEdit("Color de texto ajustado")}
                      className="w-8 h-8 rounded-md border border-neutral-200 dark:border-neutral-700 bg-transparent cursor-pointer shrink-0"
                      aria-label="Selector de color de texto"
                    />
                    <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                      {["#FFFFFF", "#111317", ...palette.slice(0, 3)].map((swatch, idx) => (
                        <button
                          key={`${swatch}-${idx}`}
                          type="button"
                          onClick={() =>
                            onUpdateLayer(selectedLayer.id, { color: swatch }, true)
                          }
                          className="w-6 h-6 rounded-md border border-black/15 dark:border-white/15 cursor-pointer"
                          style={{ backgroundColor: swatch }}
                          title={swatch}
                        />
                      ))}
                    </div>
                  </div>

                  {customPalette && customPalette.colors.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        Tu paleta ({customPalette.name})
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {customPalette.colors.map((swatch, idx) => (
                          <button
                            key={`custom-txt-${swatch}-${idx}`}
                            type="button"
                            onClick={() =>
                              onUpdateLayer(selectedLayer.id, { color: swatch }, true)
                            }
                            className="w-6 h-6 rounded-md border border-black/15 dark:border-white/15 cursor-pointer transition-transform hover:scale-105"
                            style={{ backgroundColor: swatch }}
                            title={`Aplicar ${swatch}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="block space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                      <span>Sombra</span>
                      <span className="tabular-nums font-mono">
                        {Math.round(selectedLayer.shadowStrength * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={selectedLayer.shadowStrength}
                      onChange={(e) =>
                        onUpdateLayer(
                          selectedLayer.id,
                          { shadowStrength: Number(e.target.value) },
                          false
                        )
                      }
                      onMouseUp={() => onCommitEdit("Sombra ajustada")}
                      onTouchEnd={() => onCommitEdit("Sombra ajustada")}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "controls" && (
          <div className="space-y-5">
            {/* Quick Adjustments */}
            <section className="space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Ajustes rápidos
                </h3>
              </div>

              <label className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#161A22] cursor-pointer">
                <span className="text-[11px] text-neutral-700 dark:text-neutral-300">
                  Previsualizar antes de confirmar
                </span>
                <input
                  type="checkbox"
                  checked={previewQuickChanges}
                  onChange={onTogglePreviewQuickChanges}
                  className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
                />
              </label>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onRunQuickAdjustment("use_custom_fonts")}
                  className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161A22] hover:border-blue-500/60 text-left transition-colors cursor-pointer"
                >
                  <div className="text-[11px] font-medium text-neutral-900 dark:text-neutral-100">
                    Rotar fuentes
                  </div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Usa tus fuentes
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onRunQuickAdjustment("high_contrast_night")}
                  className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161A22] hover:border-blue-500/60 text-left transition-colors cursor-pointer"
                >
                  <div className="text-[11px] font-medium text-neutral-900 dark:text-neutral-100">
                    Contraste limpio
                  </div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Velo + texto claro
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onRunQuickAdjustment("golden_hierarchy")}
                  className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161A22] hover:border-blue-500/60 text-left transition-colors cursor-pointer"
                >
                  <div className="text-[11px] font-medium text-neutral-900 dark:text-neutral-100">
                    Jerarquía áurea
                  </div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Escala editorial
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onRunQuickAdjustment("safe_margins")}
                  className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161A22] hover:border-blue-500/60 text-left transition-colors cursor-pointer"
                >
                  <div className="text-[11px] font-medium text-neutral-900 dark:text-neutral-100">
                    Márgenes seguros
                  </div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Encaja en pantalla
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onRunQuickAdjustment("scale_up")}
                  className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161A22] hover:border-blue-500/60 text-[11px] font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer"
                >
                  Texto +12%
                </button>

                <button
                  type="button"
                  onClick={() => onRunQuickAdjustment("scale_down")}
                  className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161A22] hover:border-blue-500/60 text-[11px] font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer"
                >
                  Texto -12%
                </button>
              </div>
            </section>

            {/* Bidirectional Modification History */}
            <section className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                  <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    Historial de cambios
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onSaveManualVersion}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </button>
              </div>

              {/* Explicit Backward / Forward Navigation Buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={historyIndex <= 0}
                  onClick={onStepBack}
                  className="py-2 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#161A22] hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 text-xs font-medium text-neutral-800 dark:text-neutral-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Retroceder</span>
                </button>
                <button
                  type="button"
                  disabled={historyIndex >= history.length - 1}
                  onClick={onStepForward}
                  className="py-2 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#161A22] hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 text-xs font-medium text-neutral-800 dark:text-neutral-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Avanzar</span>
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                Punto {historyIndex + 1} de {history.length} · Puedes volver atrás o adelante
              </div>

              <div className="space-y-2">
                {indexedHistory.map(({ ver, index }) => {
                  const isCurrent = index === historyIndex;
                  const isFuture = index > historyIndex;
                  return (
                    <div
                      key={ver.id}
                      className={`p-2.5 rounded-xl border space-y-2 transition-colors ${
                        isCurrent
                          ? "border-blue-600 bg-blue-600/10"
                          : isFuture
                          ? "border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/60 dark:bg-[#141820]/60 opacity-85"
                          : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161A22]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {ver.label}
                          </span>
                          <span
                            className={`text-[10px] font-medium shrink-0 ${
                              isCurrent
                                ? "text-blue-600 dark:text-blue-400"
                                : isFuture
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-neutral-500 dark:text-neutral-400"
                            }`}
                          >
                            {isCurrent ? "Actual" : isFuture ? "Adelante" : "Atrás"}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 tabular-nums mt-0.5 flex items-center gap-1.5">
                          <span>Paso #{index + 1}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatTime(ver.createdAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{ver.state.format}</span>
                        </div>
                      </div>

                      {!isCurrent && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onPreviewVersion(ver)}
                            className="flex-1 py-1.5 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onJumpToHistoryIndex(index)}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[11px] font-medium text-neutral-800 dark:text-neutral-100 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {isFuture ? (
                              <ArrowRight className="w-3 h-3" />
                            ) : (
                              <ArrowLeft className="w-3 h-3" />
                            )}
                            <span>{isFuture ? "Avanzar aquí" : "Volver aquí"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
