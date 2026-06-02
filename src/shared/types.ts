export type LibrarySourceType = "folder" | "archive" | "file";
export type LibraryCategory = "comic" | "text" | "audio" | "video" | "archive" | "other";

export interface LibraryFile {
  path: string;
  name: string;
  extension: string;
  category: LibraryCategory;
}

export interface LibraryItem {
  id: string;
  title: string;
  sourceType: LibrarySourceType;
  sourcePath: string;
  category: LibraryCategory;
  coverPath: string | null;
  pagePaths: string[];
  pageCount: number;
  files: LibraryFile[];
  addedAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
  currentPage: number;
  favorite: boolean;
}

export interface LibraryStats {
  items: number;
  favorites: number;
  pages: number;
  categories: Record<LibraryCategory, number>;
}

export type PlayerSettings = Partial<Record<LibraryCategory, string>>;

export interface AppSettings {
  players: PlayerSettings;
}

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
  items: LibraryItem[];
}

export interface OrganizeResult {
  moved: number;
  compressed: number;
  skipped: number;
  destinationPath: string | null;
  items: LibraryItem[];
}

export interface LibrarySnapshot {
  items: LibraryItem[];
  stats: LibraryStats;
  settings: AppSettings;
}
