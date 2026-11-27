export type CanvasFormat = "1080x1350" | "1080x1920";

export type ScrimType = "none" | "top" | "bottom" | "full" | "radial";

export type TextAlign = "left" | "center" | "right";

export type TextRole = "headline" | "subtitle" | "caption" | "custom";

export interface FontAsset {
  id: string;
  name: string;
  family: string;
  category: "serif" | "sans" | "display" | "mono" | "custom";
  isCustom: boolean;
  fileName?: string;
  formatLabel?: string;
}

export interface TextLayer {
  id: string;
  role: TextRole;
  text: string;
  x: number; // 0..100 percentage of canvas width (left edge of text box)
  y: number; // 0..100 percentage of canvas height (top edge of text box)
  widthPct: number; // 15..92 percentage of canvas width
  fontFamily: string;
  fontSize: number; // px relative to 1080px canvas width
  fontWeight: number;
  letterSpacing: number; // em
  lineHeight: number; // unitless multiplier
  textAlign: TextAlign;
  color: string;
  shadowStrength: number; // 0..1
  uppercase?: boolean;
}

export interface ImageSettings {
  src: string;
  name: string;
  zoom: number; // 1..2.2
  panX: number; // -50..50
  panY: number; // -50..50
  brightness: number; // 50..140 (%)
  contrast: number; // 70..140 (%)
  scrimType: ScrimType;
  scrimOpacity: number; // 0..0.75
}

export interface FocalZone {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface AIPlacement {
  layerId: string;
  x: number;
  y: number;
  widthPct: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
  textAlign: TextAlign;
  color: string;
  shadowStrength: number;
}

export interface AestheticRecommendation {
  id: string;
  title: string;
  description: string;
  category: "ubicacion" | "contraste" | "tipografia" | "respiracion";
  recommendedScrim: ScrimType;
  scrimOpacity: number;
  placements: AIPlacement[];
}

export interface LayoutProposal {
  id: string;
  title: string;
  rationale: string;
  recommendedScrim: ScrimType;
  scrimOpacity: number;
  placements: AIPlacement[];
}

export interface AnalysisResult {
  paletteColors: string[];
  focalZone: FocalZone;
  recommendations: AestheticRecommendation[];
  proposals: LayoutProposal[];
}

export interface StudioDocumentState {
  format: CanvasFormat;
  image: ImageSettings;
  layers: TextLayer[];
}

export interface VersionSnapshot {
  id: string;
  label: string;
  source: "manual" | "ai" | "quick" | "initial" | "edit";
  createdAt: number;
  state: StudioDocumentState;
}

export interface PreviewSession {
  title: string;
  subtitle: string;
  candidateState: StudioDocumentState;
  focalZone?: FocalZone;
  proposalId?: string;
}
