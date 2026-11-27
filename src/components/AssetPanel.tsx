import React, { useRef, useState } from "react";
import { ImagePlus, Trash2, Type, Upload, Check, SlidersHorizontal } from "lucide-react";
import type { FontAsset, ImageSettings, ScrimType } from "../types/studio";
import { SAMPLE_IMAGES } from "../utils/studioDefaults";

interface AssetPanelProps {
  image: ImageSettings;
  onUpdateImage: (patch: Partial<ImageSettings>) => void;
  onSelectNewImage: (src: string, name: string, formatHint?: "1080x1350" | "1080x1920") => void;
  fonts: FontAsset[];
  onUploadFonts: (files: FileList) => Promise<void>;
  onDeleteCustomFont: (id: string) => void;
  onApplyFontToSelected: (family: string) => void;
  fontUploadError: string | null;
  highlightFontsSection?: boolean;
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
  onSelectNewImage,
  fonts,
  onUploadFonts,
  onDeleteCustomFont,
  onApplyFontToSelected,
  fontUploadError,
  highlightFontsSection,
}: AssetPanelProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isDraggingFont, setIsDraggingFont] = useState(false);
  const [brokenSamples, setBrokenSamples] = useState<Record<string, boolean>>({});

  const customFonts = fonts.filter((f) => f.isCustom);
  const builtinFonts = fonts.filter((f) => !f.isCustom);

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

      {/* SECTION 2: FRAMING & SCRIM */}
      <section className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <h2 className="text-xs font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Encuadre y contraste
            </h2>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateImage({
                zoom: 1,
                panX: 0,
                panY: 0,
                brightness: 100,
                contrast: 100,
              })
            }
            className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Restablecer
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <label className="space-y-1">
            <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
              <span>Zoom</span>
              <span className="tabular-nums font-mono">{image.zoom.toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min={1}
              max={2}
              step={0.02}
              value={image.zoom}
              onChange={(e) => onUpdateImage({ zoom: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
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
              className="w-full accent-blue-600 cursor-pointer"
            />
          </label>

          <label className="space-y-1">
            <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
              <span>Desplazar X</span>
              <span className="tabular-nums font-mono">{image.panX}%</span>
            </div>
            <input
              type="range"
              min={-40}
              max={40}
              step={1}
              value={image.panX}
              onChange={(e) => onUpdateImage({ panX: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </label>

          <label className="space-y-1">
            <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
              <span>Desplazar Y</span>
              <span className="tabular-nums font-mono">{image.panY}%</span>
            </div>
            <input
              type="range"
              min={-40}
              max={40}
              step={1}
              value={image.panY}
              onChange={(e) => onUpdateImage({ panY: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </label>
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
                  onUpdateImage({
                    scrimType: opt.id,
                    scrimOpacity:
                      opt.id === "none" ? 0 : image.scrimOpacity === 0 ? 0.32 : image.scrimOpacity,
                  })
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

        {/* Uploaded custom fonts list */}
        <div className="space-y-1.5">
          {customFonts.length === 0 ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 py-1 leading-relaxed">
              Sube tus fuentes de marca. Al analizar la imagen, la plataforma las usará de forma prioritaria.
            </p>
          ) : (
            <div className="space-y-1.5">
              {customFonts.map((font) => (
                <div
                  key={font.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161A22]"
                >
                  <button
                    type="button"
                    onClick={() => onApplyFontToSelected(font.family)}
                    className="min-w-0 flex-1 text-left cursor-pointer group"
                    title="Aplicar fuente al texto seleccionado"
                  >
                    <div
                      className="text-sm text-neutral-900 dark:text-neutral-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                      style={{ fontFamily: font.family }}
                    >
                      {font.name}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                      <span>{font.formatLabel || "FONT"}</span>
                      <span aria-hidden="true">·</span>
                      <span>Subida · Clic para aplicar</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCustomFont(font.id)}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    aria-label={`Eliminar fuente ${font.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
