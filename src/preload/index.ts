import { contextBridge, ipcRenderer } from "electron";
import type {
  AppLanguage,
  AppSettings,
  AutoOrganizeResult,
  DocumentKind,
  ImportResult,
  ImportProgress,
  LibraryCategory,
  LibraryItem,
  LibrarySnapshot,
  OpenResult,
  OrganizeResult
} from "../shared/types";

const api = {
  getLibrary: (): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:get"),
  importFolders: (): Promise<ImportResult> => ipcRenderer.invoke("library:import-folders"),
  importArchives: (): Promise<ImportResult> => ipcRenderer.invoke("library:import-archives"),
  onImportProgress: (callback: (progress: ImportProgress) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, progress: ImportProgress): void => callback(progress);
    ipcRenderer.on("library:import-progress", listener);
    return () => ipcRenderer.removeListener("library:import-progress", listener);
  },
  updateProgress: (itemId: string, page: number): Promise<LibraryItem | null> =>
    ipcRenderer.invoke("library:update-progress", itemId, page),
  toggleFavorite: (itemId: string): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:toggle-favorite", itemId),
  updateTags: (itemId: string, tags: string[]): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:update-tags", itemId, tags),
  renameItem: (itemId: string, title: string): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:rename", itemId, title),
  deleteItems: (itemIds: string[]): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:delete-items", itemIds),
  createComicFromImages: (itemIds: string[], title: string): Promise<LibrarySnapshot> =>
    ipcRenderer.invoke("library:create-comic-from-images", itemIds, title),
  openExternal: (itemId: string): Promise<OpenResult> => ipcRenderer.invoke("library:open-external", itemId),
  clearLibrary: (): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:clear"),
  organizeComics: (compressFolders: boolean): Promise<OrganizeResult> =>
    ipcRenderer.invoke("library:organize-comics", compressFolders),
  autoOrganizeFolder: (): Promise<AutoOrganizeResult> => ipcRenderer.invoke("library:auto-organize-folder"),
  removeItem: (itemId: string): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:remove", itemId),
  relaunchAsAdmin: (): Promise<void> => ipcRenderer.invoke("app:relaunch-admin"),
  quitApp: (): Promise<void> => ipcRenderer.invoke("app:quit"),
  setFullscreen: (enabled: boolean): Promise<void> => ipcRenderer.invoke("app:set-fullscreen", enabled),
  openReferenceImage: (filePath: string, title: string): Promise<void> => ipcRenderer.invoke("app:open-reference-image", filePath, title),
  setPlayer: (category: LibraryCategory): Promise<AppSettings> => ipcRenderer.invoke("settings:set-player", category),
  clearPlayer: (category: LibraryCategory): Promise<AppSettings> => ipcRenderer.invoke("settings:clear-player", category),
  useInternalPlayer: (category: LibraryCategory): Promise<AppSettings> => ipcRenderer.invoke("settings:use-internal-player", category),
  setDocumentPlayer: (kind: DocumentKind): Promise<AppSettings> => ipcRenderer.invoke("settings:set-document-player", kind),
  clearDocumentPlayer: (kind: DocumentKind): Promise<AppSettings> => ipcRenderer.invoke("settings:clear-document-player", kind),
  useInternalDocumentPlayer: (kind: DocumentKind): Promise<AppSettings> => ipcRenderer.invoke("settings:use-internal-document-player", kind),
  setLanguage: (language: AppLanguage): Promise<AppSettings> => ipcRenderer.invoke("settings:set-language", language),
  setCoverCache: (enabled: boolean): Promise<LibrarySnapshot> => ipcRenderer.invoke("settings:set-cover-cache", enabled),
  setCoverCacheDirectory: (): Promise<LibrarySnapshot> => ipcRenderer.invoke("settings:set-cover-cache-directory"),
  setArchiveDirectory: (): Promise<LibrarySnapshot> => ipcRenderer.invoke("settings:set-archive-directory"),
  saveVideoCover: (itemId: string, dataUrl: string): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:save-video-cover", itemId, dataUrl),
  clearCoverCache: (): Promise<LibrarySnapshot> => ipcRenderer.invoke("settings:clear-cover-cache"),
  setHighPerformance: (enabled: boolean): Promise<LibrarySnapshot> => ipcRenderer.invoke("settings:set-high-performance", enabled),
  revealInExplorer: (filePath: string): Promise<void> => ipcRenderer.invoke("file:reveal", filePath),
  readTextFile: (filePath: string): Promise<string> => ipcRenderer.invoke("file:read-text", filePath),
  readDocumentText: (filePath: string): Promise<string> => ipcRenderer.invoke("file:read-document-text", filePath),
  openGithub: (): Promise<void> => ipcRenderer.invoke("app:open-github"),
  assetUrl: (filePath: string): string => `manga://file/?path=${encodeURIComponent(filePath)}`
};

contextBridge.exposeInMainWorld("comicShelf", api);

export type ComicShelfApi = typeof api;
