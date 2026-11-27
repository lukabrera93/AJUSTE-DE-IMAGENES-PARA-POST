import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Image, Sliders, Sparkles, Type } from "lucide-react";
import { AssetPanel } from "./components/AssetPanel";
import { ExportModal } from "./components/ExportModal";
import { InspectorPanel, type InspectorTab } from "./components/InspectorPanel";
import { StudioCanvas } from "./components/StudioCanvas";
import { TopBar } from "./components/TopBar";
import type {
  AestheticRecommendation,
  AIPlacement,
  AnalysisResult,
  CanvasFormat,
  FontAsset,
  ImageSettings,
  LayoutProposal,
  PreviewSession,
  ScrimType,
  StudioDocumentState,
  TextLayer,
  TextRole,
  VersionSnapshot,
} from "./types/studio";
import {
  deleteSavedCustomFont,
  loadSavedCustomFonts,
  uploadCustomFontFile,
} from "./utils/fonts";
import {
  BUILTIN_FONTS,
  INITIAL_STUDIO_STATE,
  imageSrcToOptimizedBase64,
} from "./utils/studioDefaults";

type SidePanelMode = "none" | "assets" | "ai" | "text" | "controls";

function cloneDoc(doc: StudioDocumentState): StudioDocumentState {
  return {
    format: doc.format,
    image: { ...doc.image },
    layers: doc.layers.map((l) => ({ ...l })),
  };
}

function matchFontFamily(requestedName: string, availableFonts: FontAsset[]): string {
  const norm = requestedName.replace(/["']/g, "").trim().toLowerCase();
  const exact = availableFonts.find(
    (f) => f.name.toLowerCase() === norm || f.family.toLowerCase().includes(norm)
  );
  if (exact) return exact.family;

  const partial = availableFonts.find(
    (f) =>
      norm.includes(f.name.toLowerCase()) ||
      f.name.toLowerCase().includes(norm.split(" ")[0] || "")
  );
  if (partial) return partial.family;

  const customFirst = availableFonts.find((f) => f.isCustom);
  return customFirst
    ? customFirst.family
    : availableFonts[0]?.family || '"Plus Jakarta Sans", sans-serif';
}

export default function App() {
  // Theme state (Dark mode default for nocturnal studio design)
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      if (typeof window === "undefined") return true;
      const saved = window.localStorage.getItem("reticula_theme");
      return saved ? saved === "dark" : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      window.localStorage.setItem("reticula_theme", isDark ? "dark" : "light");
    } catch {
      // Ignore storage restrictions
    }
  }, [isDark]);

  // Unified Bidirectional History & Document State
  const [history, setHistory] = useState<VersionSnapshot[]>(() => [
    {
      id: "ver-initial",
      label: "Composición inicial",
      source: "initial",
      createdAt: Date.now(),
      state: cloneDoc(INITIAL_STUDIO_STATE),
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [docState, setDocState] = useState<StudioDocumentState>(() =>
    cloneDoc(INITIAL_STUDIO_STATE)
  );

  // Fonts state
  const [customFonts, setCustomFonts] = useState<FontAsset[]>([]);
  const [fontUploadError, setFontUploadError] = useState<string | null>(null);
  const allFonts = [...customFonts, ...BUILTIN_FONTS];

  useEffect(() => {
    loadSavedCustomFonts().then((loaded) => {
      if (loaded.length > 0) setCustomFonts(loaded);
    });
  }, []);

  // UI & Inspector state
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    INITIAL_STUDIO_STATE.layers[0].id
  );
  const [showGuides, setShowGuides] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("ai");
  const [topSection, setTopSection] = useState<"studio" | "fonts" | "history">("studio");
  // Docked side panel for < lg screens (never overlaps or covers the bottom of the image)
  const [mobileSidePanel, setMobileSidePanel] = useState<SidePanelMode>("none");
  const [isExportOpen, setIsExportOpen] = useState(false);

  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Preview-before-confirm state
  const [previewSession, setPreviewSession] = useState<PreviewSession | null>(null);
  const [isComparingOriginal, setIsComparingOriginal] = useState(false);
  const [previewQuickChanges, setPreviewQuickChanges] = useState(true);

  const appendHistorySnapshot = useCallback(
    (
      nextState: StudioDocumentState,
      label: string,
      source: VersionSnapshot["source"]
    ) => {
      const snap: VersionSnapshot = {
        id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label,
        source,
        createdAt: Date.now(),
        state: cloneDoc(nextState),
      };
      setHistory((prev) => {
        const branch = prev.slice(0, historyIndex + 1);
        const updated = [...branch, snap].slice(-35);
        setHistoryIndex(updated.length - 1);
        return updated;
      });
    },
    [historyIndex]
  );

  const commitStateChange = useCallback(
    (
      updater: (prev: StudioDocumentState) => StudioDocumentState,
      versionLabel: string,
      versionSource: VersionSnapshot["source"]
    ) => {
      const next = updater(docState);
      setDocState(next);
      appendHistorySnapshot(next, versionLabel, versionSource);
    },
    [docState, appendHistorySnapshot]
  );

  // Bidirectional Retroceder (Back) & Avanzar (Forward)
  const handleStepBack = useCallback(() => {
    if (historyIndex <= 0) return;
    const targetIdx = historyIndex - 1;
    setHistoryIndex(targetIdx);
    setDocState(cloneDoc(history[targetIdx].state));
    setPreviewSession(null);
  }, [history, historyIndex]);

  const handleStepForward = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const targetIdx = historyIndex + 1;
    setHistoryIndex(targetIdx);
    setDocState(cloneDoc(history[targetIdx].state));
    setPreviewSession(null);
  }, [history, historyIndex]);

  const handleJumpToHistoryIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= history.length) return;
      setHistoryIndex(index);
      setDocState(cloneDoc(history[index].state));
      setPreviewSession(null);
      setIsComparingOriginal(false);
    },
    [history]
  );

  // Keyboard Retroceder / Avanzar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleStepForward();
        } else {
          handleStepBack();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleStepForward();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleStepBack, handleStepForward]);

  // Image Handlers
  const handleUpdateImage = (patch: Partial<ImageSettings>) => {
    setDocState((prev) => ({
      ...prev,
      image: { ...prev.image, ...patch },
    }));
  };

  const handleSelectNewImage = (
    src: string,
    name: string,
    formatHint?: CanvasFormat
  ) => {
    setPreviewSession(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    commitStateChange(
      (prev) => ({
        ...prev,
        format: formatHint || prev.format,
        image: {
          ...prev.image,
          src,
          name,
          zoom: 1,
          panX: 0,
          panY: 0,
        },
      }),
      `Imagen: ${name}`,
      "manual"
    );
  };

  const handleChangeFormat = (format: CanvasFormat) => {
    if (format === docState.format) return;
    commitStateChange(
      (prev) => ({
        ...prev,
        format,
        layers: prev.layers.map((layer) => {
          if (format === "1080x1920") {
            const clampedY = Math.max(15, Math.min(76, layer.y));
            return { ...layer, y: clampedY };
          }
          return { ...layer, y: Math.min(88, layer.y) };
        }),
      }),
      `Formato ${format === "1080x1920" ? "1080×1920" : "1080×1350"}`,
      "manual"
    );
  };

  // Font Upload Handlers
  const handleUploadFonts = async (files: FileList) => {
    setFontUploadError(null);
    const uploaded: FontAsset[] = [];
    for (const file of Array.from(files)) {
      try {
        const asset = await uploadCustomFontFile(file);
        uploaded.push(asset);
      } catch (err) {
        setFontUploadError(
          err instanceof Error ? err.message : "No se pudo cargar una de las fuentes."
        );
      }
    }
    if (uploaded.length > 0) {
      setCustomFonts((prev) => [...uploaded, ...prev]);
      const targetId = selectedLayerId || docState.layers[0]?.id;
      if (targetId) {
        handleUpdateLayer(targetId, { fontFamily: uploaded[0].family }, true);
      }
    }
  };

  const handleDeleteCustomFont = async (id: string) => {
    await deleteSavedCustomFont(id);
    setCustomFonts((prev) => prev.filter((f) => f.id !== id));
  };

  const handleApplyFontToSelected = (family: string) => {
    const targetId = selectedLayerId || docState.layers[0]?.id;
    if (!targetId) return;
    handleUpdateLayer(targetId, { fontFamily: family }, true);
  };

  // Text Layer Handlers
  const handleUpdateLayer = (
    id: string,
    patch: Partial<TextLayer>,
    commitHistory = false
  ) => {
    if (commitHistory) {
      commitStateChange(
        (prev) => ({
          ...prev,
          layers: prev.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        }),
        "Ajuste tipográfico",
        "edit"
      );
    } else {
      setDocState((prev) => ({
        ...prev,
        layers: prev.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }));
    }
  };

  const handleCommitEdit = (label = "Modificación de texto") => {
    const currentInHistory = history[historyIndex]?.state;
    if (
      currentInHistory &&
      JSON.stringify(currentInHistory) === JSON.stringify(docState)
    ) {
      return;
    }
    appendHistorySnapshot(docState, label, "edit");
  };

  const handleAddLayer = (role: TextRole) => {
    const newId = `layer-${Date.now()}`;
    const primaryFont = customFonts[0]?.family || BUILTIN_FONTS[3].family;
    const newLayer: TextLayer = {
      id: newId,
      role,
      text: "Nuevo texto editorial",
      x: 10,
      y: 45,
      widthPct: 74,
      fontFamily: primaryFont,
      fontSize: 44,
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: 1.2,
      textAlign: "left",
      color: "#FFFFFF",
      shadowStrength: 0.35,
      uppercase: false,
    };
    commitStateChange(
      (prev) => ({
        ...prev,
        layers: [...prev.layers, newLayer],
      }),
      "Nueva capa de texto",
      "edit"
    );
    setSelectedLayerId(newId);
    setInspectorTab("text");
  };

  const handleDeleteLayer = (id: string) => {
    if (docState.layers.length <= 1) return;
    commitStateChange(
      (prev) => {
        const remaining = prev.layers.filter((l) => l.id !== id);
        if (selectedLayerId === id) {
          setSelectedLayerId(remaining[0]?.id || null);
        }
        return { ...prev, layers: remaining };
      },
      "Capa eliminada",
      "edit"
    );
  };

  // Build candidate state from AI placements
  const buildStateFromPlacements = useCallback(
    (
      placements: AIPlacement[],
      recommendedScrim?: ScrimType,
      scrimOpacity?: number
    ): StudioDocumentState => {
      const next = cloneDoc(docState);
      if (recommendedScrim) {
        next.image.scrimType = recommendedScrim;
      }
      if (typeof scrimOpacity === "number") {
        next.image.scrimOpacity = Math.max(0, Math.min(0.68, scrimOpacity));
      }

      next.layers = next.layers.map((layer) => {
        const match = placements.find((p) => p.layerId === layer.id);
        if (!match) return layer;

        const safeWidth = Math.max(24, Math.min(90, match.widthPct));
        const safeX = Math.max(4, Math.min(96 - safeWidth, match.x));
        const safeY =
          next.format === "1080x1920"
            ? Math.max(15, Math.min(78, match.y))
            : Math.max(5, Math.min(88, match.y));

        const validAlign =
          match.textAlign === "center" || match.textAlign === "right"
            ? match.textAlign
            : "left";

        return {
          ...layer,
          x: Number(safeX.toFixed(1)),
          y: Number(safeY.toFixed(1)),
          widthPct: Number(safeWidth.toFixed(1)),
          fontFamily: matchFontFamily(match.fontFamily, allFonts),
          fontSize: Math.max(18, Math.min(130, Math.round(match.fontSize))),
          fontWeight: [400, 500, 600, 700].includes(match.fontWeight)
            ? match.fontWeight
            : 600,
          letterSpacing: Math.max(
            -0.05,
            Math.min(0.24, Number(match.letterSpacing.toFixed(2)))
          ),
          lineHeight: Math.max(0.9, Math.min(1.6, Number(match.lineHeight.toFixed(2)))),
          textAlign: validAlign,
          color: /^#[0-9A-Fa-f]{6}$/.test(match.color) ? match.color : "#FFFFFF",
          shadowStrength: Math.max(
            0,
            Math.min(0.85, Number(match.shadowStrength.toFixed(2)))
          ),
        };
      });

      return next;
    },
    [docState, allFonts]
  );

  const handleExecuteRecommendation = (rec: AestheticRecommendation) => {
    const candidateState = buildStateFromPlacements(
      rec.placements,
      rec.recommendedScrim,
      rec.scrimOpacity
    );
    setIsComparingOriginal(false);
    setPreviewSession({
      title: rec.title,
      subtitle: rec.description,
      candidateState,
      focalZone: analysisResult?.focalZone,
      proposalId: rec.id,
    });
  };

  const handlePreviewProposal = (proposal: LayoutProposal) => {
    const candidateState = buildStateFromPlacements(
      proposal.placements,
      proposal.recommendedScrim,
      proposal.scrimOpacity
    );
    setIsComparingOriginal(false);
    setPreviewSession({
      title: proposal.title,
      subtitle: proposal.rationale,
      candidateState,
      focalZone: analysisResult?.focalZone,
      proposalId: proposal.id,
    });
  };

  // AI Image Analysis
  const handleAnalyzeImage = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setInspectorTab("ai");
    if (window.innerWidth < 1024) {
      setMobileSidePanel("ai");
    }

    try {
      const { base64, mimeType } = await imageSrcToOptimizedBase64(docState.image.src);
      const response = await fetch("/api/analyze-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          aspectRatio: docState.format,
          fonts: allFonts.map((f) => ({
            id: f.id,
            name: f.name,
            category: f.category,
            isCustom: f.isCustom,
          })),
          textLayers: docState.layers.map((l) => ({
            id: l.id,
            role: l.role,
            text: l.text,
          })),
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          "El análisis automático por IA requiere el servidor activo. En GitHub Pages estático puedes seguir subiendo imágenes y fuentes, editar textos en tiempo real y exportar en PNG, JPG o PSD."
        );
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo completar el análisis.");
      }

      const result = data as AnalysisResult;
      setAnalysisResult(result);

      // Automatically preview the top recommendation if available, otherwise first proposal
      if (result.recommendations && result.recommendations.length > 0) {
        const firstRec = result.recommendations[0];
        const candidateState = buildStateFromPlacements(
          firstRec.placements,
          firstRec.recommendedScrim,
          firstRec.scrimOpacity
        );
        setIsComparingOriginal(false);
        setPreviewSession({
          title: firstRec.title,
          subtitle: firstRec.description,
          candidateState,
          focalZone: result.focalZone,
          proposalId: firstRec.id,
        });
      } else if (result.proposals && result.proposals.length > 0) {
        const first = result.proposals[0];
        const candidateState = buildStateFromPlacements(
          first.placements,
          first.recommendedScrim,
          first.scrimOpacity
        );
        setIsComparingOriginal(false);
        setPreviewSession({
          title: first.title,
          subtitle: first.rationale,
          candidateState,
          focalZone: result.focalZone,
          proposalId: first.id,
        });
      }
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : "Error inesperado al analizar la imagen."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Preview Confirmation / Discard
  const handleConfirmPreview = () => {
    if (!previewSession) return;
    const confirmed = cloneDoc(previewSession.candidateState);
    const title = previewSession.title;
    const source: VersionSnapshot["source"] = previewSession.proposalId
      ? "ai"
      : "quick";
    commitStateChange(() => confirmed, title, source);
    setPreviewSession(null);
    setIsComparingOriginal(false);
  };

  const handleDiscardPreview = () => {
    setPreviewSession(null);
    setIsComparingOriginal(false);
  };

  // Quick Adjustments
  const handleRunQuickAdjustment = (presetId: string) => {
    let label = "Ajuste rápido";
    const candidate = cloneDoc(docState);

    if (presetId === "use_custom_fonts") {
      label = "Fuentes subidas aplicadas";
      const pool = customFonts.length > 0 ? customFonts : BUILTIN_FONTS;
      candidate.layers = candidate.layers.map((l, idx) => ({
        ...l,
        fontFamily: pool[idx % pool.length].family,
      }));
    } else if (presetId === "high_contrast_night") {
      label = "Contraste limpio";
      candidate.image.brightness = 92;
      candidate.image.contrast = 106;
      if (candidate.image.scrimType === "none") {
        candidate.image.scrimType = "top";
      }
      candidate.image.scrimOpacity = Math.max(0.32, candidate.image.scrimOpacity);
      candidate.layers = candidate.layers.map((l) => ({
        ...l,
        color: "#F9F8F5",
        shadowStrength: Math.max(0.38, l.shadowStrength),
      }));
    } else if (presetId === "golden_hierarchy") {
      label = "Jerarquía áurea";
      candidate.layers = candidate.layers.map((l) => {
        if (l.role === "headline") {
          return { ...l, fontSize: 88, lineHeight: 0.98, letterSpacing: -0.02, fontWeight: 700 };
        }
        if (l.role === "subtitle") {
          return { ...l, fontSize: 34, lineHeight: 1.32, letterSpacing: 0.01, fontWeight: 500 };
        }
        return { ...l, fontSize: 21, lineHeight: 1.2, letterSpacing: 0.14, uppercase: true };
      });
    } else if (presetId === "safe_margins") {
      label = "Ajuste a márgenes seguros";
      candidate.layers = candidate.layers.map((l) => {
        const w = Math.min(84, l.widthPct);
        const x = Math.max(8, Math.min(92 - w, l.x));
        const minY = candidate.format === "1080x1920" ? 16 : 7;
        const maxY = candidate.format === "1080x1920" ? 76 : 86;
        const y = Math.max(minY, Math.min(maxY, l.y));
        return { ...l, x, y, widthPct: w };
      });
    } else if (presetId === "scale_up") {
      label = "Escala tipográfica +12%";
      candidate.layers = candidate.layers.map((l) => ({
        ...l,
        fontSize: Math.min(145, Math.round(l.fontSize * 1.12)),
      }));
    } else if (presetId === "scale_down") {
      label = "Escala tipográfica -12%";
      candidate.layers = candidate.layers.map((l) => ({
        ...l,
        fontSize: Math.max(16, Math.round(l.fontSize * 0.88)),
      }));
    }

    if (previewQuickChanges) {
      setIsComparingOriginal(false);
      setPreviewSession({
        title: label,
        subtitle: "Revisa el ajuste rápido sobre el lienzo antes de confirmar",
        candidateState: candidate,
      });
    } else {
      commitStateChange(() => candidate, label, "quick");
    }
  };

  // Version History Handlers
  const handleSaveManualVersion = () => {
    const count = history.length + 1;
    appendHistorySnapshot(docState, `Punto guardado #${count}`, "manual");
  };

  const handlePreviewVersion = (ver: VersionSnapshot) => {
    setIsComparingOriginal(false);
    setPreviewSession({
      title: `Versión: ${ver.label}`,
      subtitle: "Comparando punto del historial contra el diseño actual",
      candidateState: cloneDoc(ver.state),
    });
  };

  const handleTopSectionClick = (section: "studio" | "fonts" | "history") => {
    setTopSection(section);
    if (section === "history") {
      setInspectorTab("controls");
      if (window.innerWidth < 1024) setMobileSidePanel("controls");
    } else if (section === "fonts") {
      if (window.innerWidth < 1024) setMobileSidePanel("assets");
    } else {
      if (window.innerWidth < 1024) setMobileSidePanel("none");
    }
  };

  const toggleMobileSideMode = (mode: Exclude<SidePanelMode, "none">) => {
    if (mobileSidePanel === mode) {
      setMobileSidePanel("none");
    } else {
      if (mode === "ai" || mode === "text" || mode === "controls") {
        setInspectorTab(mode);
      }
      setMobileSidePanel(mode);
    }
  };

  return (
    <div className="h-dvh w-full flex flex-col overflow-hidden bg-neutral-50 dark:bg-[#0B0D10] text-neutral-900 dark:text-neutral-100">
      <TopBar
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onOpenExport={() => setIsExportOpen(true)}
        activeSection={topSection}
        onSelectSection={handleTopSectionClick}
        customFontCount={customFonts.length}
        versionCount={history.length}
      />

      {/* Main Flex Studio: Sidebars sit cleanly BESIDE the canvas — never covering the image */}
      <main className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Desktop Left Rail: Assets & Custom Fonts */}
        <aside className="hidden lg:block w-[300px] shrink-0 border-r border-neutral-200 dark:border-neutral-800/90 bg-white dark:bg-[#111419] overflow-y-auto">
          <AssetPanel
            image={docState.image}
            onUpdateImage={handleUpdateImage}
            onSelectNewImage={handleSelectNewImage}
            fonts={allFonts}
            onUploadFonts={handleUploadFonts}
            onDeleteCustomFont={handleDeleteCustomFont}
            onApplyFontToSelected={handleApplyFontToSelected}
            fontUploadError={fontUploadError}
            highlightFontsSection={topSection === "fonts"}
          />
        </aside>

        {/* Center Interactive Artboard */}
        <StudioCanvas
          docState={docState}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onChangeFormat={handleChangeFormat}
          onUpdateLayer={handleUpdateLayer}
          onCommitEdit={handleCommitEdit}
          showGuides={showGuides}
          onToggleGuides={() => setShowGuides((s) => !s)}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          historyPositionLabel={`${historyIndex + 1}/${history.length}`}
          onUndo={handleStepBack}
          onRedo={handleStepForward}
          onTriggerAnalyze={handleAnalyzeImage}
          isAnalyzing={isAnalyzing}
          previewSession={previewSession}
          isComparingOriginal={isComparingOriginal}
          onToggleCompareOriginal={() => setIsComparingOriginal((c) => !c)}
          onConfirmPreview={handleConfirmPreview}
          onDiscardPreview={handleDiscardPreview}
        />

        {/* Desktop Right Rail: Recommendations, Real-Time Text Editor, Quick Controls & History */}
        <aside className="hidden lg:flex lg:flex-col w-[350px] shrink-0 border-l border-neutral-200 dark:border-neutral-800/90 bg-white dark:bg-[#111419] min-h-0">
          <InspectorPanel
            activeTab={inspectorTab}
            onChangeTab={setInspectorTab}
            onAnalyzeImage={handleAnalyzeImage}
            isAnalyzing={isAnalyzing}
            analysisError={analysisError}
            analysisResult={analysisResult}
            activePreviewId={previewSession?.proposalId}
            onExecuteRecommendation={handleExecuteRecommendation}
            onPreviewProposal={handlePreviewProposal}
            layers={docState.layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onAddLayer={handleAddLayer}
            onDeleteLayer={handleDeleteLayer}
            onUpdateLayer={handleUpdateLayer}
            onCommitEdit={handleCommitEdit}
            fonts={allFonts}
            previewQuickChanges={previewQuickChanges}
            onTogglePreviewQuickChanges={() => setPreviewQuickChanges((p) => !p)}
            onRunQuickAdjustment={handleRunQuickAdjustment}
            history={history}
            historyIndex={historyIndex}
            onStepBack={handleStepBack}
            onStepForward={handleStepForward}
            onSaveManualVersion={handleSaveManualVersion}
            onPreviewVersion={handlePreviewVersion}
            onJumpToHistoryIndex={handleJumpToHistoryIndex}
          />
        </aside>

        {/* Mobile & Tablet (< lg) Side-Docked Options Panel + Vertical Side Rail (NEVER covers the image) */}
        <div className="lg:hidden flex shrink-0 min-h-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419]">
          {mobileSidePanel !== "none" && (
            <div className="w-[220px] sm:w-[290px] flex flex-col min-h-0 border-r border-neutral-200 dark:border-neutral-800">
              <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
                <span className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {mobileSidePanel === "assets"
                    ? "Imagen y fuentes"
                    : mobileSidePanel === "ai"
                    ? "Recomendaciones"
                    : mobileSidePanel === "text"
                    ? "Editor de texto"
                    : "Ajustes e historial"}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileSidePanel("none")}
                  className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
                  aria-label="Contraer panel lateral"
                  title="Contraer panel"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {mobileSidePanel === "assets" ? (
                  <AssetPanel
                    image={docState.image}
                    onUpdateImage={handleUpdateImage}
                    onSelectNewImage={handleSelectNewImage}
                    fonts={allFonts}
                    onUploadFonts={handleUploadFonts}
                    onDeleteCustomFont={handleDeleteCustomFont}
                    onApplyFontToSelected={handleApplyFontToSelected}
                    fontUploadError={fontUploadError}
                  />
                ) : (
                  <InspectorPanel
                    activeTab={
                      mobileSidePanel === "ai"
                        ? "ai"
                        : mobileSidePanel === "text"
                        ? "text"
                        : "controls"
                    }
                    onChangeTab={(t) => {
                      setInspectorTab(t);
                      setMobileSidePanel(t);
                    }}
                    onAnalyzeImage={handleAnalyzeImage}
                    isAnalyzing={isAnalyzing}
                    analysisError={analysisError}
                    analysisResult={analysisResult}
                    activePreviewId={previewSession?.proposalId}
                    onExecuteRecommendation={handleExecuteRecommendation}
                    onPreviewProposal={handlePreviewProposal}
                    layers={docState.layers}
                    selectedLayerId={selectedLayerId}
                    onSelectLayer={setSelectedLayerId}
                    onAddLayer={handleAddLayer}
                    onDeleteLayer={handleDeleteLayer}
                    onUpdateLayer={handleUpdateLayer}
                    onCommitEdit={handleCommitEdit}
                    fonts={allFonts}
                    previewQuickChanges={previewQuickChanges}
                    onTogglePreviewQuickChanges={() => setPreviewQuickChanges((p) => !p)}
                    onRunQuickAdjustment={handleRunQuickAdjustment}
                    history={history}
                    historyIndex={historyIndex}
                    onStepBack={handleStepBack}
                    onStepForward={handleStepForward}
                    onSaveManualVersion={handleSaveManualVersion}
                    onPreviewVersion={handlePreviewVersion}
                    onJumpToHistoryIndex={handleJumpToHistoryIndex}
                  />
                )}
              </div>
            </div>
          )}

          {/* Slim Right-Side Vertical Tool Rail */}
          <nav
            className="w-[48px] shrink-0 flex flex-col items-center py-2 gap-1.5 bg-neutral-50 dark:bg-[#0F1217]"
            aria-label="Barra lateral de herramientas"
          >
            <button
              type="button"
              onClick={() => toggleMobileSideMode("assets")}
              className={`w-10 min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-medium transition-colors cursor-pointer ${
                mobileSidePanel === "assets"
                  ? "bg-blue-600 text-white"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-800"
              }`}
              title="Imagen y fuentes"
            >
              <Image className="w-4 h-4" />
              <span>Base</span>
            </button>

            <button
              type="button"
              onClick={() => toggleMobileSideMode("ai")}
              className={`w-10 min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-medium transition-colors cursor-pointer ${
                mobileSidePanel === "ai"
                  ? "bg-blue-600 text-white"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-800"
              }`}
              title="Recomendaciones de estética"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ideas</span>
            </button>

            <button
              type="button"
              onClick={() => toggleMobileSideMode("text")}
              className={`w-10 min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-medium transition-colors cursor-pointer ${
                mobileSidePanel === "text"
                  ? "bg-blue-600 text-white"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-800"
              }`}
              title="Editor de texto"
            >
              <Type className="w-4 h-4" />
              <span>Texto</span>
            </button>

            <button
              type="button"
              onClick={() => toggleMobileSideMode("controls")}
              className={`w-10 min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-medium transition-colors cursor-pointer ${
                mobileSidePanel === "controls"
                  ? "bg-blue-600 text-white"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-800"
              }`}
              title="Ajustes rápidos e historial"
            >
              <Sliders className="w-4 h-4" />
              <span>Historial</span>
            </button>
          </nav>
        </div>
      </main>

      {/* Developer Credit Footer */}
      <footer className="shrink-0 h-7 px-4 border-t border-neutral-200 dark:border-neutral-800/90 bg-white dark:bg-[#111419] flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
        <span>Retícula Studio</span>
        <span>
          Desarrollado por{" "}
          <strong className="font-semibold text-neutral-800 dark:text-neutral-200">
            Lucio Cabrera
          </strong>
        </span>
      </footer>

      {/* High-Resolution Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        docState={docState}
      />
    </div>
  );
}
