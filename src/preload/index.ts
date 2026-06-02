import { contextBridge, ipcRenderer } from "electron";
import type {
  AppSettings,
  ImportResult,
  LibraryCategory,
  LibraryItem,
  LibrarySnapshot,
  OrganizeResult
} from "../shared/types";

const api = {
  getLibrary: (): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:get"),
  importFolders: (): Promise<ImportResult> => ipcRenderer.invoke("library:import-folders"),
  importArchives: (): Promise<ImportResult> => ipcRenderer.invoke("library:import-archives"),
  updateProgress: (itemId: string, page: number): Promise<LibraryItem | null> =>
    ipcRenderer.invoke("library:update-progress", itemId, page),
  toggleFavorite: (itemId: string): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:toggle-favorite", itemId),
  openExternal: (itemId: string): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:open-external", itemId),
  organizeComics: (compressFolders: boolean): Promise<OrganizeResult> =>
    ipcRenderer.invoke("library:organize-comics", compressFolders),
  removeItem: (itemId: string): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:remove", itemId),
  relaunchAsAdmin: (): Promise<void> => ipcRenderer.invoke("app:relaunch-admin"),
  setPlayer: (category: LibraryCategory): Promise<AppSettings> => ipcRenderer.invoke("settings:set-player", category),
  clearPlayer: (category: LibraryCategory): Promise<AppSettings> => ipcRenderer.invoke("settings:clear-player", category),
  revealInExplorer: (filePath: string): Promise<void> => ipcRenderer.invoke("file:reveal", filePath),
  assetUrl: (filePath: string): string => `manga://file/?path=${encodeURIComponent(filePath)}`
};

contextBridge.exposeInMainWorld("comicShelf", api);

export type ComicShelfApi = typeof api;
