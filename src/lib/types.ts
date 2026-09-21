export interface ConversionOptions {
  maxPages?: number;
  maxImages?: number;
  imageQuality?: number;
}

export interface PageInfo {
  route: string;
  url: string;
}

export interface StatItem {
  label: string;
  before: number;
  after: number;
  unit: "count" | "bytes" | "ms";
}

export interface ProjectFile {
  path: string;
  content?: string;
  binary?: Buffer;
}

export interface ConversionReport {
  sourceUrl: string;
  platform?: string;
  pages: PageInfo[];
  stats: StatItem[];
  notes: string[];
  files: ProjectFile[];
  previewHtml: string;
}

export type ProgressCallback = (message: string, stepIndex?: number, totalSteps?: number) => void;
