export type LibrarySourceType = "folder" | "archive" | "file";
export type LibraryCategory = "comic" | "image" | "text" | "audio" | "video" | "series" | "archive" | "other";
export type AppLanguage = "zh" | "en" | "ja";
export type LibrarySortKey = "az" | "za" | "newest" | "oldest" | "recent";
export type DocumentKind = "plain" | "pdf" | "word" | "ebook";

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
  videoCoverPath: string | null;
  pagePaths: string[];
  pageCount: number;
  files: LibraryFile[];
  previewText: string | null;
  tags: string[];
  addedAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
  currentPage: number;
  mediaPosition: number;
  textScrollRatio: number;
  favorite: boolean;
}

export interface LibraryStats {
  items: number;
  favorites: number;
  pages: number;
  categories: Record<LibraryCategory, number>;
}

export type PlayerSettings = Partial<Record<LibraryCategory, string>>;
export type DocumentPlayerSettings = Partial<Record<DocumentKind, string>>;

export interface AppSettings {
  players: PlayerSettings;
  documentPlayers: DocumentPlayerSettings;
  internalPlayerCategories: LibraryCategory[];
  internalDocumentKinds: DocumentKind[];
  detectedPlayers: PlayerSettings;
  language: AppLanguage;
  coverCacheEnabled: boolean;
  coverCacheDirectory: string | null;
  archiveDirectory: string | null;
  scannedArchiveDirectories: string[];
  highPerformanceMode: boolean;
  rememberProgressEnabled: boolean;
}

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
  items: LibraryItem[];
}

export interface ImportProgress {
  phase: "scanning" | "importing" | "saving" | "done";
  current: number;
  total: number;
  message: string;
  startedAt: number;
}

export interface OrganizeResult {
  moved: number;
  compressed: number;
  skipped: number;
  destinationPath: string | null;
  items: LibraryItem[];
}

export interface AutoOrganizeResult {
  moved: number;
  skipped: number;
  sourcePath: string | null;
  destinationPath: string | null;
  categories: Record<LibraryCategory, number>;
  items: LibraryItem[];
}

export interface LibrarySnapshot {
  items: LibraryItem[];
  stats: LibraryStats;
  settings: AppSettings;
}

export interface OpenResult extends LibrarySnapshot {
  opened: boolean;
}
