import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from "electron";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { extname, join, parse, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import JSZip from "jszip";
import type { ComicBook, ImportResult, LibrarySnapshot } from "../shared/types";

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif"]);
const archiveExtensions = new Set([".cbz", ".zip"]);

let mainWindow: BrowserWindow | null = null;

protocol.registerSchemesAsPrivileged([
  {
    scheme: "manga",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true
    }
  }
]);

function libraryPath(): string {
  return join(app.getPath("userData"), "library.json");
}

function importCachePath(): string {
  return join(app.getPath("userData"), "imports");
}

function now(): string {
  return new Date().toISOString();
}

function hash(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 16);
}

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function normalizeBookTitle(filePath: string): string {
  const parsed = parse(filePath);
  return parsed.name || parsed.base;
}

function isImage(filePath: string): boolean {
  return imageExtensions.has(extname(filePath).toLowerCase());
}

function isArchive(filePath: string): boolean {
  return archiveExtensions.has(extname(filePath).toLowerCase());
}

async function readLibrary(): Promise<ComicBook[]> {
  try {
    const raw = await readFile(libraryPath(), "utf8");
    const data = JSON.parse(raw) as ComicBook[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeLibrary(books: ComicBook[]): Promise<void> {
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(libraryPath(), JSON.stringify(books, null, 2), "utf8");
}

function snapshot(books: ComicBook[]): LibrarySnapshot {
  const sorted = [...books].sort((a, b) => {
    const aTime = a.lastOpenedAt ?? a.addedAt;
    const bTime = b.lastOpenedAt ?? b.addedAt;
    return bTime.localeCompare(aTime);
  });

  return {
    books: sorted,
    stats: {
      books: sorted.length,
      pages: sorted.reduce((total, book) => total + book.pageCount, 0)
    }
  };
}

async function findImagesInFolder(folderPath: string): Promise<string[]> {
  const result: string[] = [];

  async function walk(currentPath: string): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const entryPath = join(currentPath, entry.name);
        if (entry.isDirectory()) {
          await walk(entryPath);
        } else if (entry.isFile() && isImage(entryPath)) {
          result.push(entryPath);
        }
      })
    );
  }

  await walk(folderPath);
  return result.sort(naturalCompare);
}

async function importFolder(folderPath: string, existing: ComicBook | undefined): Promise<ComicBook | null> {
  const absolutePath = resolve(folderPath);
  const pagePaths = await findImagesInFolder(absolutePath);
  if (pagePaths.length === 0) {
    return null;
  }

  const timestamp = now();
  return {
    id: hash(`folder:${absolutePath}`),
    title: normalizeBookTitle(absolutePath),
    sourceType: "folder",
    sourcePath: absolutePath,
    coverPath: pagePaths[0],
    pagePaths,
    pageCount: pagePaths.length,
    addedAt: existing?.addedAt ?? timestamp,
    updatedAt: timestamp,
    lastOpenedAt: existing?.lastOpenedAt ?? null,
    currentPage: Math.min(existing?.currentPage ?? 0, pagePaths.length - 1)
  };
}

async function importArchive(archivePath: string, existing: ComicBook | undefined): Promise<ComicBook | null> {
  const absolutePath = resolve(archivePath);
  const archiveStat = await stat(absolutePath);
  const id = hash(`archive:${absolutePath}:${archiveStat.mtimeMs}`);
  const outputDir = join(importCachePath(), id);
  const zip = await JSZip.loadAsync(await readFile(absolutePath));
  const imageEntries = Object.values(zip.files)
    .filter((entry) => !entry.dir && isImage(entry.name))
    .sort((a, b) => naturalCompare(a.name, b.name));

  if (imageEntries.length === 0) {
    return null;
  }

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const pagePaths: string[] = [];
  for (let index = 0; index < imageEntries.length; index += 1) {
    const entry = imageEntries[index];
    const extension = extname(entry.name).toLowerCase() || ".jpg";
    const pagePath = join(outputDir, `${String(index + 1).padStart(5, "0")}${extension}`);
    await writeFile(pagePath, await entry.async("nodebuffer"));
    pagePaths.push(pagePath);
  }

  const timestamp = now();
  return {
    id,
    title: normalizeBookTitle(absolutePath),
    sourceType: "cbz",
    sourcePath: absolutePath,
    coverPath: pagePaths[0],
    pagePaths,
    pageCount: pagePaths.length,
    addedAt: existing?.addedAt ?? timestamp,
    updatedAt: timestamp,
    lastOpenedAt: existing?.lastOpenedAt ?? null,
    currentPage: Math.min(existing?.currentPage ?? 0, pagePaths.length - 1)
  };
}

async function mergeImports(imports: Array<ComicBook | null>): Promise<ImportResult> {
  const current = await readLibrary();
  const byId = new Map(current.map((book) => [book.id, book]));
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const book of imports) {
    if (!book) {
      skipped += 1;
      continue;
    }

    if (byId.has(book.id)) {
      updated += 1;
    } else {
      added += 1;
    }
    byId.set(book.id, book);
  }

  const books = [...byId.values()];
  await writeLibrary(books);
  return { added, updated, skipped, books: snapshot(books).books };
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#111214",
    title: "Offline Comic Shelf",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false
    }
  });

  mainWindow.on("ready-to-show", () => mainWindow?.show());

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("io.github.haoy633star.offlinecomicshelf");

  protocol.handle("manga", (request) => {
    const url = new URL(request.url);
    const filePath = url.searchParams.get("path");
    if (!filePath || !existsSync(filePath)) {
      return new Response("File not found", { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });

  app.on("browser-window-created", (_, window) => optimizer.watchWindowShortcuts(window));

  ipcMain.handle("library:get", async () => snapshot(await readLibrary()));

  ipcMain.handle("library:import-folders", async () => {
    const selection = await dialog.showOpenDialog(mainWindow!, {
      title: "Import comic folders",
      properties: ["openDirectory", "multiSelections"]
    });
    if (selection.canceled) {
      return { added: 0, updated: 0, skipped: 0, books: snapshot(await readLibrary()).books };
    }

    const current = await readLibrary();
    const currentById = new Map(current.map((book) => [book.id, book]));
    const imports = await Promise.all(
      selection.filePaths.map((folderPath) => importFolder(folderPath, currentById.get(hash(`folder:${resolve(folderPath)}`))))
    );
    return mergeImports(imports);
  });

  ipcMain.handle("library:import-archives", async () => {
    const selection = await dialog.showOpenDialog(mainWindow!, {
      title: "Import CBZ archives",
      filters: [{ name: "Comic Book Zip", extensions: ["cbz", "zip"] }],
      properties: ["openFile", "multiSelections"]
    });
    if (selection.canceled) {
      return { added: 0, updated: 0, skipped: 0, books: snapshot(await readLibrary()).books };
    }

    const current = await readLibrary();
    const currentBySource = new Map(current.map((book) => [book.sourcePath, book]));
    const imports = await Promise.all(
      selection.filePaths.filter(isArchive).map((archivePath) => importArchive(archivePath, currentBySource.get(resolve(archivePath))))
    );
    return mergeImports(imports);
  });

  ipcMain.handle("library:update-progress", async (_, bookId: string, page: number) => {
    const books = await readLibrary();
    const book = books.find((item) => item.id === bookId);
    if (!book) {
      return null;
    }

    book.currentPage = Math.max(0, Math.min(page, book.pageCount - 1));
    book.lastOpenedAt = now();
    await writeLibrary(books);
    return book;
  });

  ipcMain.handle("library:remove", async (_, bookId: string) => {
    const books = await readLibrary();
    const removed = books.find((book) => book.id === bookId);
    const nextBooks = books.filter((book) => book.id !== bookId);
    if (removed?.sourceType === "cbz") {
      await rm(join(importCachePath(), removed.id), { recursive: true, force: true });
    }
    await writeLibrary(nextBooks);
    return snapshot(nextBooks);
  });

  ipcMain.handle("file:reveal", async (_, filePath: string) => {
    shell.showItemInFolder(filePath);
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
