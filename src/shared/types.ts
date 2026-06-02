export type ComicSourceType = "folder" | "cbz";

export interface ComicBook {
  id: string;
  title: string;
  sourceType: ComicSourceType;
  sourcePath: string;
  coverPath: string | null;
  pagePaths: string[];
  pageCount: number;
  addedAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
  currentPage: number;
}

export interface LibraryStats {
  books: number;
  pages: number;
}

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
  books: ComicBook[];
}

export interface LibrarySnapshot {
  books: ComicBook[];
  stats: LibraryStats;
}
