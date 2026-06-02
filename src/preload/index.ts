import { contextBridge, ipcRenderer } from "electron";
import type { ComicBook, ImportResult, LibrarySnapshot } from "../shared/types";

const api = {
  getLibrary: (): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:get"),
  importFolders: (): Promise<ImportResult> => ipcRenderer.invoke("library:import-folders"),
  importArchives: (): Promise<ImportResult> => ipcRenderer.invoke("library:import-archives"),
  updateProgress: (bookId: string, page: number): Promise<ComicBook | null> =>
    ipcRenderer.invoke("library:update-progress", bookId, page),
  removeBook: (bookId: string): Promise<LibrarySnapshot> => ipcRenderer.invoke("library:remove", bookId),
  revealInExplorer: (filePath: string): Promise<void> => ipcRenderer.invoke("file:reveal", filePath),
  assetUrl: (filePath: string): string => `manga://file/?path=${encodeURIComponent(filePath)}`
};

contextBridge.exposeInMainWorld("comicShelf", api);

export type ComicShelfApi = typeof api;
