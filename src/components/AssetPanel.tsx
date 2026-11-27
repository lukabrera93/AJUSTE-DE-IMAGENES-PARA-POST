import React, { useRef, useState } from "react";
import {
  Check,
  ImagePlus,
  Lock,
  Palette,
  Plus,
  SlidersHorizontal,
  Trash2,
  Type,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import type {
  CustomPalette,
  FontAsset,
  FontFamilyGroup,
  ImageSettings,
  ScrimType,
} from "../types/studio";
import { normalizeHexColor } from "../utils/palettes";
import {
  FONT_FAMILY_GROUPS,
  groupFontsByFamily,
  resolveFontFamilyGroup,
  SAMPLE_IMAGES,
} from "../utils/studioDefaults";

interface AssetPanelProps {
  image: ImageSettings;
  onUpdateImage: (patch: Partial<ImageSettings>, commitLabel?: string) => void;
  onCommitImageEdit: (label?: string) => void;
  onSelectNewImage: (src: string, name: string, formatHint?: "1080x1350" | "1080x1920") => void;
  fonts: FontAsset[];
  onUploadFonts: (files: FileList) => Promise<void>;
  onDeleteCustomFont: (id: string) => void;
  onChangeCustomFontCategory: (id: string, category: FontFamilyGroup) => void;
  onApplyFontToSelected: (family: string) => void;
  fontUploadError: string | null;
  highlightFontsSection?: boolean;
  customPalette: CustomPalette | null;
  paletteError: string | null;
  onUploadPaletteFile: (file: File) => Promise<void>;
  onAddPaletteColor: (hex: string) => void;
  onRemovePaletteColor: (hex: string) => void;
  onClearPalette: () => void;
  onApplyColorToSelected: (hex: string) => void;
  onApplyPresetPalette: (palette: CustomPalette) => void;
}

const SCRIM_OPTIONS: { id: ScrimType; label: string }[] = [
  { id: "none", label: "Ninguno" },
  { id: "top", label: "Superior" },
  { id: "bottom", label: "Inferior" },
  { id: "radial", label: "Viñeta" },
  { id: "full", label: "Uniforme" },
];

export function AssetPanel({
  image,
  onUpdateImage,
  onCommitImageEdit,
  onSelectNewImage,
  fonts,
  onUploadFonts,
  onDeleteCustomFont,
  onChangeCustomFontCategory,
  onApplyFontToSelected,
  fontUploadError,
  highlightFontsSection,
  customPalette,
  paletteError,
  onUploadPaletteFile,
  onAddPaletteColor,
  onRemovePaletteColor,
  onClearPalette,
  onApplyColorToSelected,
  onApplyPresetPalette,
}: AssetPanelProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isDraggingFont, setIsDraggingFont] = useState(false);
  const [isDraggingPalette, setIsDraggingPalette] = useState(false);
  const [fontGroupFilter, setFontGroupFilter] = useState<"all" | FontFamilyGroup>("all");
  const [hexInput, setHexInput] = useState("#D4A359");
  const [brokenSamples, setBrokenSamples] = useState<Record<string, boolean>>({});

  const isLocked = Boolean(image.locked);
  const customFonts = fonts.filter((f) => f.isCustom);
  const builtinFonts = fonts.filter((f) => !f.isCustom);
  const groupedFonts = groupFontsByFamily(fonts).filter(
    (entry) => fontGroupFilter === "all" || entry.group.id === fontGroupFilter
  );

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const cleanName = file.name.replace(/\.[^.]+$/, "");
        onSelectNewImage(reader.result, cleanName || "Imagen subida");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800/90">
      {/* SECTION 1: IMAGE UPLOAD & SAMPLES */}
      <section className="p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Imagen base
          </h2>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-[140px]">
            {image.name}
          </span>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingImage(true);
          }}
          onDragLeave={() => setIsDraggingImage(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingImage(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleImageFile(file);
          }}
          className={`rounded-xl border border-dashed p-3.5 text-center transition-colors ${
            isDraggingImage
              ? "border-blue-500 bg-blue-500/10"
              : "border-neutral-300 dark:border-neutral-700 bg-neutral-50/70 dark:bg-[#161A22] hover:border-neutral-400 dark:hover:border-neutral-600"
          }`}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="w-full flex flex-col items-center gap-1.5 py-1 cursor-pointer min-h-[44px] justify-center"
          >
            <ImagePlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
              Subir fotografía
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Arrastra o selecciona PNG, JPG o WebP
            </span>
          </button>
        </div>

        {/* Sample Images */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            Fotografías de estudio
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SAMPLE_IMAGES.map((sample) => {
              const isSelected = image.src === sample.src;
              const isBroken = brokenSamples[sample.id];
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => onSelectNewImage(sample.src, sample.title, sample.formatHint)}
                  className={`group relative aspect-[4/5] rounded-lg overflow-hidden border transition-all cursor-pointer ${
                    isSelected
                      ? "border-blue-600 ring-2 ring-blue-600/30"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
                  }`}
                  title={sample.title}
                >
                  {isBroken ? (
                    <div className="w-full h-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center p-1 text-[10px] text-neutral-500">
                      {sample.title}
                    </div>
                  ) : (
                    <img
                      src={sample.src}
                      alt={sample.title}
                      referrerPolicy="no-referrer"
                      onError={() => setBrokenSamples((prev) => ({ ...prev, [sample.id]: true }))}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-1.5 text-left">
                    <span className="block text-[10px] font-medium text-white truncate">
                      {sample.title}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 2: FREE POSITIONING, ROTATION, LOCK, BG & SCRIM */}
      <section className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
            <h2 className="text-xs font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
              Ubicación y encuadre
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                onUpdateImage(
                  { locked: !isLocked },
                  !isLocked ? "Imagen bloqueada" : "Imagen desbloqueada"
                )
              }
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                isLocked
                  ? "border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
              title={
                isLocked
                  ? "Desbloquear posición de la imagen"
                  : "Bloquear imagen para evitar movimientos accidentales"
              }
            >
              {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span>{isLocked ? "Bloqueada" : "Bloquear"}</span>
            </button>
            <button
              type="button"
              disabled={isLocked}
              onClick={() =>
                onUpdateImage(
                  {
                    zoom: 1,
                    panX: 0,
                    panY: 0,
                    rotation: 0,
                    brightness: 100,
                    contrast: 100,
                  },
                  "Imagen centrada y ajustada"
                )
              }
              className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              Centrar
            </button>
          </div>
        </div>

        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
          {isLocked
            ? "Imagen bloqueada. Desbloquéala si deseas volver a moverla o escalarla."
            : "Arrastra la imagen directamente sobre el lienzo o bloquéala para editar texto sin moverla."}
        </p>

        <div className={`grid grid-cols-2 gap-x-3 gap-y-2.5 ${isLocked ? "opacity-50" : ""}`}>
          <label className="space-y-1">
            <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
              <span>Escala</span>
              <span className="tabular-nums font-mono">{image.zoom.toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.02}
              disabled={isLocked}
              value={image.zoom}
              onChange={(e) => onUpdateImage({ zoom: Number(e.target.value) })}
              onMouseUp={() => onCommitImageEdit("Escala de imagen")}
              onTouchEnd={() => onCommitImageEdit("Escala de imagen")}
              className="w-full accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
            />
          </label>

          <label className="space-y-1">
            <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
              <span>Rotación</span>
              <span className="tabular-nums font-mono">{Math.round(image.rotation || 0)}°</span>
            </div>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              disabled={isLocked}
              value={image.rotation || 0}
              onChange={(e) => onUpdateImage({ rotation: Number(e.target.value) })}
              onMouseUp={() => onCommitImageEdit("Rotación de imagen")}
              onTouchEnd={() => onCommitImageEdit("Rotación de imagen")}
              className="w-full accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
            />
          </label>

          <label className="space-y-1">
            <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
              <span>Posición X</span>
              <span className="tabular-nums font-mono">{Math.round(image.panX)}%</span>
            </div>
            <input
              type="range"
              min={-150}
              max={150}
              step={1}
              disabled={isLocked}
              value={image.panX}
              onChange={(e) => onUpdateImage({ panX: Number(e.target.value) })}
              onMouseUp={() => onCommitImageEdit("Posición X de imagen")}
              onTouchEnd={() => onCommitImageEdit("Posición X de imagen")}
              className="w-full accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
            />
          </label>

          <label className="space-y-1">
            <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
              <span>Posición Y</span>
              <span className="tabular-nums font-mono">{Math.round(image.panY)}%</span>
            </div>
            <input
              type="range"
              min={-150}
              max={150}
              step={1}
              disabled={isLocked}
              value={image.panY}
              onChange={(e) => onUpdateImage({ panY: Number(e.target.value) })}
              onMouseUp={() => onCommitImageEdit("Posición Y de imagen")}
              onTouchEnd={() => onCommitImageEdit("Posición Y de imagen")}
              className="w-full accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
            />
          </label>

          <label className="space-y-1">
            <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
              <span>Brillo</span>
              <span className="tabular-nums font-mono">{image.brightness}%</span>
            </div>
            <input
              type="range"
              min={55}
              max={135}
              step={1}
              value={image.brightness}
              onChange={(e) => onUpdateImage({ brightness: Number(e.target.value) })}
              onMouseUp={() => onCommitImageEdit("Brillo de imagen")}
              onTouchEnd={() => onCommitImageEdit("Brillo de imagen")}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </label>

          <label className="space-y-1">
            <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
              <span>Contraste</span>
              <span className="tabular-nums font-mono">{image.contrast}%</span>
            </div>
            <input
              type="range"
              min={70}
              max={140}
              step={1}
              value={image.contrast}
              onChange={(e) => onUpdateImage({ contrast: Number(e.target.value) })}
              onMouseUp={() => onCommitImageEdit("Contraste de imagen")}
              onTouchEnd={() => onCommitImageEdit("Contraste de imagen")}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </label>
        </div>

        {/* Canvas Background Color (visible when image is scaled down or moved aside) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
            <span>Fondo del lienzo</span>
            <span className="font-mono uppercase">{image.canvasBgColor || "#0F1115"}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={image.canvasBgColor || "#0F1115"}
              onChange={(e) => onUpdateImage({ canvasBgColor: e.target.value })}
              onBlur={() => onCommitImageEdit("Color de fondo")}
              className="w-7 h-7 rounded border border-neutral-200 dark:border-neutral-700 bg-transparent cursor-pointer shrink-0"
              aria-label="Color de fondo del lienzo"
            />
            <div className="flex items-center gap-1.5 flex-1 flex-wrap">
              {[
                "#0F1115",
                "#FFFFFF",
                "#EAE4D7",
                ...(customPalette?.colors.slice(0, 3) ?? ["#1E222A", "#2C241E"]),
              ].map((bg, idx) => (
                <button
                  key={`${bg}-${idx}`}
                  type="button"
                  onClick={() => onUpdateImage({ canvasBgColor: bg }, "Color de fondo")}
                  className="w-6 h-6 rounded-md border border-black/15 dark:border-white/15 cursor-pointer"
                  style={{ backgroundColor: bg }}
                  title={`Fondo ${bg}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
            <span>Velo de legibilidad</span>
            <span className="tabular-nums font-mono">
              {Math.round(image.scrimOpacity * 100)}%
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-[#161A22]">
            {SCRIM_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onUpdateImage(
                    {
                      scrimType: opt.id,
                      scrimOpacity:
                        opt.id === "none" ? 0 : image.scrimOpacity === 0 ? 0.32 : image.scrimOpacity,
                    },
                    `Velo: ${opt.label}`
                  )
                }
                className={`py-1.5 px-1 text-[10px] font-medium rounded-md transition-colors truncate cursor-pointer ${
                  image.scrimType === opt.id
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {image.scrimType !== "none" && (
            <input
              type="range"
              min={0}
              max={0.75}
              step={0.02}
              value={image.scrimOpacity}
              onChange={(e) => onUpdateImage({ scrimOpacity: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
              aria-label="Intensidad del velo protector"
            />
          )}
        </div>
      </section>

      {/* SECTION 3: CUSTOM FONTS UPLOAD */}
      <section
        className={`p-4 space-y-3 transition-colors ${
          highlightFontsSection ? "bg-blue-500/5" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <h2 className="text-xs font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Fuentes tipográficas
            </h2>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
            {customFonts.length} subidas · {builtinFonts.length} base
          </span>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingFont(true);
          }}
          onDragLeave={() => setIsDraggingFont(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setIsDraggingFont(false);
            if (e.dataTransfer.files?.length) {
              await onUploadFonts(e.dataTransfer.files);
            }
          }}
          className={`rounded-xl border border-dashed p-3 text-center transition-colors ${
            isDraggingFont
              ? "border-blue-500 bg-blue-500/10"
              : "border-neutral-300 dark:border-neutral-700 bg-neutral-50/70 dark:bg-[#161A22] hover:border-neutral-400 dark:hover:border-neutral-600"
          }`}
        >
          <input
            ref={fontInputRef}
            type="file"
            multiple
            accept=".ttf,.otf,.woff,.woff2"
            className="hidden"
            onChange={async (e) => {
              if (e.target.files?.length) {
                await onUploadFonts(e.target.files);
              }
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fontInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer min-h-[40px]"
          >
            <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Subir fuentes (.TTF, .OTF, .WOFF2)</span>
          </button>
        </div>

        {fontUploadError && (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-2">
            {fontUploadError}
          </p>
        )}

        {/* Family Group Filter */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-[#161A22] overflow-x-auto">
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

        {/* Fonts Grouped by Family Type */}
        <div className="space-y-3">
          {groupedFonts.map(({ group, fonts: familyFonts }) => (
            <div key={group.id} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 pt-1">
                <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                  {group.label}
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 tabular-nums shrink-0">
                  {familyFonts.length}
                </span>
              </div>

              <div className="space-y-1">
                {familyFonts.map((font) => (
                  <div
                    key={font.id}
                    className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161A22]"
                  >
                    <button
                      type="button"
                      onClick={() => onApplyFontToSelected(font.family)}
                      className="min-w-0 flex-1 text-left cursor-pointer group py-0.5"
                      title="Aplicar fuente al texto seleccionado"
                    >
                      <div
                        className="text-sm text-neutral-900 dark:text-neutral-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                        style={{ fontFamily: font.family }}
                      >
                        {font.name}
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                        <span>{font.isCustom ? `Subida · ${font.formatLabel || "FONT"}` : "Estudio"}</span>
                        <span aria-hidden="true">·</span>
                        <span>Clic para aplicar</span>
                      </div>
                    </button>

                    {font.isCustom && (
                      <div className="flex items-center gap-1 shrink-0">
                        <select
                          value={resolveFontFamilyGroup(font)}
                          onChange={(e) =>
                            onChangeCustomFontCategory(
                              font.id,
                              e.target.value as FontFamilyGroup
                            )
                          }
                          aria-label={`Tipo de familia para ${font.name}`}
                          className="rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#111419] px-1 py-1 text-[10px] text-neutral-700 dark:text-neutral-300 cursor-pointer"
                        >
                          {FONT_FAMILY_GROUPS.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.shortLabel}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => onDeleteCustomFont(font.id)}
                          className="min-h-[30px] min-w-[30px] flex items-center justify-center rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          aria-label={`Eliminar fuente ${font.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: CUSTOM COLOR PALETTE UPLOAD */}
      <section className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Palette className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
            <h2 className="text-xs font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
              Paleta de colores
            </h2>
          </div>
          {customPalette && customPalette.colors.length > 0 && (
            <button
              type="button"
              onClick={onClearPalette}
              className="text-[11px] font-medium text-neutral-500 hover:text-red-500 transition-colors cursor-pointer shrink-0"
            >
              Limpiar
            </button>
          )}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingPalette(true);
          }}
          onDragLeave={() => setIsDraggingPalette(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setIsDraggingPalette(false);
            const file = e.dataTransfer.files?.[0];
            if (file) await onUploadPaletteFile(file);
          }}
          className={`rounded-xl border border-dashed p-3 text-center transition-colors ${
            isDraggingPalette
              ? "border-blue-500 bg-blue-500/10"
              : "border-neutral-300 dark:border-neutral-700 bg-neutral-50/70 dark:bg-[#161A22] hover:border-neutral-400 dark:hover:border-neutral-600"
          }`}
        >
          <input
            ref={paletteInputRef}
            type="file"
            accept=".json,.txt,.css,.csv,.gpl,.hex,.svg,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await onUploadPaletteFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => paletteInputRef.current?.click()}
            className="w-full flex flex-col items-center gap-1 py-1 text-xs font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer min-h-[40px] justify-center"
          >
            <div className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Subir paleta de colores</span>
            </div>
            <span className="text-[10px] font-normal text-neutral-500 dark:text-neutral-400">
              JSON, CSS, TXT, GPL o imagen de paleta
            </span>
          </button>
        </div>

        {/* Manual HEX / Color Picker addition */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const normalized = normalizeHexColor(hexInput);
            if (normalized) {
              onAddPaletteColor(normalized);
            }
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="color"
            value={normalizeHexColor(hexInput) || "#D4A359"}
            onChange={(e) => setHexInput(e.target.value.toUpperCase())}
            className="w-8 h-8 rounded-md border border-neutral-200 dark:border-neutral-700 bg-transparent cursor-pointer shrink-0"
            aria-label="Elegir color para añadir a la paleta"
          />
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            placeholder="#D4A359"
            className="flex-1 min-w-0 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#161A22] px-2 py-1.5 text-xs font-mono text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            aria-label="Código HEX para paleta"
          />
          <button
            type="submit"
            className="px-2.5 py-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-medium inline-flex items-center gap-1 cursor-pointer shrink-0 min-h-[32px]"
            title="Añadir color a tu paleta"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir</span>
          </button>
        </form>

        <button
          type="button"
          onClick={() =>
            onApplyPresetPalette({
              name: "El Aljibe · Dorado & Grafito",
              colors: ["#EAD07E", "#D4A359", "#FFFFFF", "#F5EFE6", "#141210", "#3A2B1C"],
            })
          }
          className="w-full py-1.5 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#161A22] hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 flex items-center justify-between gap-2 cursor-pointer transition-colors"
        >
          <span>Cargar paleta El Aljibe</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EAD07E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFFFFF] border border-neutral-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#141210]" />
          </span>
        </button>

        {paletteError && (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-2">
            {paletteError}
          </p>
        )}

        {customPalette && customPalette.colors.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
              <span className="truncate">{customPalette.name}</span>
              <span className="tabular-nums shrink-0">
                {customPalette.colors.length} tonos · Clic para texto
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {customPalette.colors.map((hex) => (
                <div key={hex} className="group relative">
                  <button
                    type="button"
                    onClick={() => onApplyColorToSelected(hex)}
                    className="w-full h-8 rounded-lg border border-black/15 dark:border-white/15 cursor-pointer transition-transform hover:scale-[1.03]"
                    style={{ backgroundColor: hex }}
                    title={`Aplicar ${hex} al texto seleccionado`}
                    aria-label={`Aplicar color ${hex}`}
                  />
                  <button
                    type="button"
                    onClick={() => onRemovePaletteColor(hex)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow cursor-pointer transition-opacity"
                    aria-label={`Quitar ${hex}`}
                    title={`Quitar ${hex}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                  <div className="text-[9px] font-mono text-center text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                    {hex}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Sube un archivo de paleta o una imagen de muestra cromática para tener tus colores de marca siempre listos.
          </p>
        )}
      </section>
    </div>
  );
}
