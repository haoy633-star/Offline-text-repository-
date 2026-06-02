import { contextBridge, ipcRenderer } from "electron";
import type {
  AppLanguage,
  AppSettings,
  AutoOrganizeResult,
  ImportResult,
  ImportProgress,
  LibraryCategory,
  LibraryItem,
  LibrarySnapshot,
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
  openExternal: (itemId: string): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:open-external", itemId),
  clearLibrary: (): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:clear"),
  organizeComics: (compressFolders: boolean): Promise<OrganizeResult> =>
    ipcRenderer.invoke("library:organize-comics", compressFolders),
  autoOrganizeFolder: (): Promise<AutoOrganizeResult> => ipcRenderer.invoke("library:auto-organize-folder"),
  removeItem: (itemId: string): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:remove", itemId),
  relaunchAsAdmin: (): Promise<void> => ipcRenderer.invoke("app:relaunch-admin"),
  setFullscreen: (enabled: boolean): Promise<void> => ipcRenderer.invoke("app:set-fullscreen", enabled),
  setPlayer: (category: LibraryCategory): Promise<AppSettings> => ipcRenderer.invoke("settings:set-player", category),
  clearPlayer: (category: LibraryCategory): Promise<AppSettings> => ipcRenderer.invoke("settings:clear-player", category),
  setLanguage: (language: AppLanguage): Promise<AppSettings> => ipcRenderer.invoke("settings:set-language", language),
  setCoverCache: (enabled: boolean): Promise<LibrarySnapshot> => ipcRenderer.invoke("settings:set-cover-cache", enabled),
  clearCoverCache: (): Promise<LibrarySnapshot> => ipcRenderer.invoke("settings:clear-cover-cache"),
  revealInExplorer: (filePath: string): Promise<void> => ipcRenderer.invoke("file:reveal", filePath),
  readTextFile: (filePath: string): Promise<string> => ipcRenderer.invoke("file:read-text", filePath),
  openGithub: (): Promise<void> => ipcRenderer.invoke("app:open-github"),
  assetUrl: (filePath: string): string => `manga://file/?path=${encodeURIComponent(filePath)}`
};

contextBridge.exposeInMainWorld("comicShelf", api);

export type ComicShelfApi = typeof api;
