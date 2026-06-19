export interface VersionNode {
  id: string;
  type: "original" | "generated" | "active" | "placeholder";
  title: string;
  image?: string;
  parentId?: string;
  createdAt: string;
  x?: number;
  y?: number;
  prompt?: string;
  preset?: string;
  creativityStrength?: number;
  generationMode?: "restyle" | "furnish-empty";
  status?: string;
}

export interface VersionEdge {
  id: string;
  source: string;
  target: string;
}

export interface CanvasState {
  panX: number;
  panY: number;
  zoom: number;
  isDragging: boolean;
  isHandMode: boolean;
}

export type StylePreset = "Modern" | "Minimalist" | "Luxury" | "Scandinavian" | "Industrial";

export type GenerationMode = "restyle" | "furnish-empty";
