import { Download, Moon, Sun } from "lucide-react";

export type MobileDrawerTab = "none" | "assets" | "ai" | "text" | "history";

interface TopBarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenExport: () => void;
  activeSection: "studio" | "fonts" | "history";
  onSelectSection: (section: "studio" | "fonts" | "history") => void;
  customFontCount: number;
  versionCount: number;
}

export function TopBar({
  isDark,
  onToggleTheme,
  onOpenExport,
  activeSection,
  onSelectSection,
  customFontCount,
  versionCount,
}: TopBarProps) {
  return (
    <header className="h-14 shrink-0 border-b border-neutral-200 dark:border-neutral-800/90 bg-white/95 dark:bg-[#111419]/95 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between gap-8 z-30">
      {/* Zone 1: Single-element Brand Wordmark */}
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onSelectSection("studio");
        }}
        className="text-base lg:text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 whitespace-nowrap shrink-0"
      >
        Retícula Studio
      </a>

      {/* Zone 2: Clean single-line navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        <button
          type="button"
          onClick={() => onSelectSection("studio")}
          className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeSection === "studio"
              ? "border-blue-600 text-neutral-900 dark:text-neutral-100"
              : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          Estudio
        </button>
        <button
          type="button"
          onClick={() => onSelectSection("fonts")}
          className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeSection === "fonts"
              ? "border-blue-600 text-neutral-900 dark:text-neutral-100"
              : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          Fuentes ({customFontCount})
        </button>
        <button
          type="button"
          onClick={() => onSelectSection("history")}
          className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeSection === "history"
              ? "border-blue-600 text-neutral-900 dark:text-neutral-100"
              : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          Historial ({versionCount})
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 py-1 border-b-2 border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{isDark ? "Modo Claro" : "Modo Nocturno"}</span>
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action + Mobile Theme Icon */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleTheme}
          className="md:hidden min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onOpenExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar HD</span>
        </button>
      </div>
    </header>
  );
}
