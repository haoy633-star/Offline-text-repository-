import { app, BrowserWindow, Menu, Tray, dialog, ipcMain, nativeImage, protocol, shell } from "electron";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, statSync, type Dirent } from "node:fs";
import { appendFile, copyFile, cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { cpus, totalmem } from "node:os";
import { basename, dirname, extname, join, parse, relative, resolve } from "node:path";
import { Readable } from "node:stream";
import JSZip from "jszip";
import sharp from "sharp";
import type {
  AppLanguage,
  AppSettings,
  AutoOrganizeResult,
  DocumentKind,
  ImportResult,
  ImportProgress,
  LibraryCategory,
  LibraryFile,
  LibraryItem,
  LibrarySnapshot,
  OpenResult,
  OrganizeResult,
  PerformancePreset,
  PerformanceSettings,
  SystemProfile
} from "../shared/types";

// Electron 主进程入口：这里负责窗口、托盘、文件扫描、导入归档、外部播放器、缓存和系统级能力。
// Mac 适配时优先看本文件里和 Windows 路径、播放器路径、NSIS 安装器、shell 打开方式相关的逻辑。
app.commandLine.appendSwitch("js-flags", "--expose-gc");

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif"]);
const textExtensions = new Set([".txt", ".md", ".markdown", ".pdf", ".epub", ".mobi", ".azw3", ".doc", ".docx"]);
const audioExtensions = new Set([".mp3", ".flac", ".wav", ".m4a", ".aac", ".ogg", ".opus"]);
const videoExtensions = new Set([".mp4", ".mkv", ".avi", ".mov", ".wmv", ".webm", ".m4v"]);
const archiveExtensions = new Set([".cbz", ".zip"]);
const playableCategories = new Set<LibraryCategory>(["text", "audio", "video", "archive", "other"]);
const categoryFolders: Record<LibraryCategory, string> = {
  comic: "Comics",
  image: "Images",
  text: "Text",
  audio: "Audio",
  video: "Video",
  series: "Series",
  archive: "Archives",
  other: "Other"
};
const defaultPerformanceSettings: PerformanceSettings = {
  preset: "balanced",
  lazyLibraryIndex: false,
  lazyPagePaths: false,
  demandLoadCovers: true,
  reducedCoverCache: false,
  staticVideoPreview: false,
  readerNearbyPagesOnly: true,
  tightVirtualization: true,
  idleAutoRelease: true,
  idleReleaseMinutes: 5,
  coverPreviewWidth: 360,
  coverPreviewQuality: 78
};

sharp.concurrency(Math.max(2, Math.min(8, cpus().length - 1)));
sharp.cache({ memory: 96, items: 256, files: 0 });

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let activeImportStartedAt = 0;
let isQuitting = false;
let archiveSyncPromise: Promise<LibraryItem[]> | null = null;
const referenceWindows = new Set<BrowserWindow>();

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

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function isBackgroundMode(): boolean {
  return !mainWindow || !mainWindow.isVisible() || mainWindow.isMinimized();
}

function scanConcurrency(): number {
  if (isBackgroundMode()) return 1;
  return Math.max(2, Math.min(8, cpus().length));
}

async function throttleBackgroundScan(step: number): Promise<void> {
  if (isBackgroundMode() && step % 25 === 0) {
    await sleep(20);
  }
}

function configureResourceMode(): void {
  // 前台/后台资源策略：窗口隐藏到托盘时降低 sharp 并发和缓存，减少常驻内存。
  const background = isBackgroundMode();
  mainWindow?.webContents.send("app:background-mode", background);
  if (background) {
    sharp.concurrency(1);
    sharp.cache({ memory: 8, items: 16, files: 0 });
    return;
  }
  sharp.concurrency(Math.max(2, Math.min(8, cpus().length - 1)));
  sharp.cache({ memory: 96, items: 256, files: 0 });
}

async function releaseIdleMemory(): Promise<void> {
  // 渲染层空闲一段时间后会调用这里，主动收紧图片处理缓存。
  const settings = await readSettings();
  const foregroundMemory = settings.performance.reducedCoverCache ? 12 : 24;
  const foregroundItems = settings.performance.reducedCoverCache ? 24 : 48;
  sharp.cache(false);
  sharp.cache({ memory: isBackgroundMode() ? 8 : foregroundMemory, items: isBackgroundMode() ? 16 : foregroundItems, files: 0 });
  if (typeof global.gc === "function") {
    global.gc();
  }
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), Math.max(1, items.length));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(items[index], index);
      }
    })
  );
  return results;
}

function libraryPath(): string {
  return join(app.getPath("userData"), "library.json");
}

function settingsPath(): string {
  return join(app.getPath("userData"), "settings.json");
}

function importCachePath(): string {
  return join(app.getPath("userData"), "imports");
}

function coverCachePath(): string {
  return join(app.getPath("userData"), "cover-cache");
}

function languageFromLocale(locale: string): AppLanguage {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith("zh")) return "zh";
  if (normalized.startsWith("ja")) return "ja";
  if (normalized.startsWith("en")) return "en";
  return "en";
}

function recommendedPresetForSystem(memoryGb: number, cpuCores: number): PerformancePreset {
  if (memoryGb >= 32 && cpuCores >= 8) return "extreme";
  if (memoryGb >= 16 && cpuCores >= 6) return "high";
  if (memoryGb < 8 || cpuCores <= 4) return "low";
  return "balanced";
}

function systemProfile(): SystemProfile {
  const memoryGb = Math.round((totalmem() / 1024 ** 3) * 10) / 10;
  const cpuCores = cpus().length;
  return {
    cpuCores,
    memoryGb,
    recommendedPreset: recommendedPresetForSystem(memoryGb, cpuCores)
  };
}

async function activeCoverCachePath(): Promise<string> {
  const settings = await readSettings();
  return settings.coverCacheDirectory || coverCachePath();
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

function titleFromPath(filePath: string): string {
  const parsed = parse(filePath);
  return parsed.name || parsed.base;
}

function categoryForExtension(filePath: string): LibraryCategory {
  const extension = extname(filePath).toLowerCase();
  if (imageExtensions.has(extension)) return "image";
  if (textExtensions.has(extension)) return "text";
  if (audioExtensions.has(extension)) return "audio";
  if (videoExtensions.has(extension)) return "video";
  if (archiveExtensions.has(extension)) return "archive";
  return "other";
}

function documentKindForFile(filePath: string): DocumentKind {
  const extension = extname(filePath).toLowerCase();
  if ([".txt", ".md", ".markdown"].includes(extension)) return "plain";
  if (extension === ".pdf") return "pdf";
  if ([".doc", ".docx"].includes(extension)) return "word";
  return "ebook";
}

function mimeTypeForFile(filePath: string): string {
  const extension = extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".avif": "image/avif",
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".wmv": "video/x-ms-wmv",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".pdf": "application/pdf",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8"
  };
  return types[extension] ?? "application/octet-stream";
}

function fileResponse(filePath: string, request: Request): Response {
  const fileStat = statSync(filePath);
  const fileSize = fileStat.size;
  const range = request.headers.get("range");
  const contentType = mimeTypeForFile(filePath);

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      const requestedStart = match[1] ? Number(match[1]) : 0;
      const requestedEnd = match[2] ? Number(match[2]) : fileSize - 1;
      const start = Math.max(0, Math.min(requestedStart, fileSize - 1));
      const end = Math.max(start, Math.min(requestedEnd, fileSize - 1));
      const chunkSize = end - start + 1;
      return new Response(Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream, {
        status: 206,
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Type": contentType
        }
      });
    }
  }

  return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(fileSize),
      "Content-Type": contentType
    }
  });
}

function isImage(filePath: string): boolean {
  return imageExtensions.has(extname(filePath).toLowerCase());
}

function isArchive(filePath: string): boolean {
  return archiveExtensions.has(extname(filePath).toLowerCase());
}

function isVideo(filePath: string): boolean {
  return videoExtensions.has(extname(filePath).toLowerCase());
}

async function directoryEntryStats(folderPath: string): Promise<{ directories: number; files: number; images: number; videos: number }> {
  try {
    const entries = await readdir(folderPath, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile()).map((entry) => join(folderPath, entry.name));
    return {
      directories: entries.filter((entry) => entry.isDirectory()).length,
      files: files.length,
      images: files.filter(isImage).length,
      videos: files.filter(isVideo).length
    };
  } catch {
    return { directories: 0, files: 0, images: 0, videos: 0 };
  }
}

function toLibraryFile(filePath: string): LibraryFile {
  return {
    path: filePath,
    name: basename(filePath),
    extension: extname(filePath).toLowerCase(),
    category: categoryForExtension(filePath)
  };
}

function emitImportProgress(progress: Omit<ImportProgress, "startedAt">): void {
  mainWindow?.webContents.send("library:import-progress", {
    ...progress,
    startedAt: activeImportStartedAt
  } satisfies ImportProgress);
}

function emitLibraryChanged(): void {
  mainWindow?.webContents.send("library:changed");
}

async function logScanSkip(targetPath: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  try {
    await appendFile(join(app.getPath("userData"), "scan-errors.log"), `[${new Date().toISOString()}] ${targetPath}: ${message}\n`, "utf8");
  } catch {
    // Logging must never break library scans.
  }
}

async function createTextPreview(filePath: string): Promise<string | null> {
  if (categoryForExtension(filePath) !== "text") {
    return null;
  }

  const extension = extname(filePath).toLowerCase();
  if (![".txt", ".md", ".markdown"].includes(extension)) {
    return null;
  }

  try {
    const raw = await readFile(filePath, "utf8");
    return raw.replace(/\s+/g, " ").trim().slice(0, 280) || null;
  } catch {
    return null;
  }
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function htmlToReadableText(value: string): string {
  return decodeXmlText(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<(br|hr)\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|chapter|h[1-6]|li)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

async function readDocumentText(filePath: string): Promise<string> {
  const extension = extname(filePath).toLowerCase();
  if ([".txt", ".md", ".markdown"].includes(extension)) {
    return readFile(filePath, "utf8");
  }

  if (extension === ".docx") {
    const zip = await JSZip.loadAsync(await readFile(filePath));
    const documentXml = await zip.file("word/document.xml")?.async("string");
    if (!documentXml) return "";
    return decodeXmlText(
      documentXml
        .replace(/<w:tab\/>/g, "\t")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    );
  }

  if (extension === ".epub") {
    const zip = await JSZip.loadAsync(await readFile(filePath));
    const chapters = Object.values(zip.files)
      .filter((entry) => !entry.dir && /\.(xhtml|html|htm)$/i.test(entry.name))
      .sort((a, b) => naturalCompare(a.name, b.name));
    const textParts: string[] = [];
    for (const chapter of chapters) {
      const text = htmlToReadableText(await chapter.async("string"));
      if (text) textParts.push(text);
    }
    return textParts.join("\n\n").trim();
  }

  return "";
}

async function cacheCoverIfEnabled(itemId: string, coverPath: string | null): Promise<string | null> {
  if (!coverPath || !existsSync(coverPath)) {
    return coverPath;
  }

  const settings = await readSettings();
  if (!settings.coverCacheEnabled) {
    return coverPath;
  }

  const cachePath = settings.coverCacheDirectory || coverCachePath();
  const coverWidth = Math.max(160, Math.min(720, Math.round(settings.performance.coverPreviewWidth || 360)));
  const coverHeight = Math.round(coverWidth * 1.5);
  const coverQuality = Math.max(45, Math.min(92, Math.round(settings.performance.coverPreviewQuality || 78)));
  const cachedPath = join(cachePath, `${itemId}.webp`);
  await mkdir(cachePath, { recursive: true });
  try {
    await sharp(coverPath).rotate().resize({ width: coverWidth, height: coverHeight, fit: "cover" }).webp({ quality: coverQuality }).toFile(cachedPath);
    return cachedPath;
  } catch {
    const fallbackPath = join(cachePath, `${itemId}.jpg`);
    const image = nativeImage.createFromPath(coverPath);
    if (image.isEmpty()) {
      return coverPath;
    }
    const thumbnail = image.resize({ width: coverWidth, height: coverHeight, quality: coverQuality >= 72 ? "good" : "better" });
    await writeFile(fallbackPath, thumbnail.toJPEG(coverQuality));
    return fallbackPath;
  }
}

async function firstUsableCoverPath(itemId: string, pagePaths: string[]): Promise<string | null> {
  for (const pagePath of pagePaths) {
    if (!existsSync(pagePath)) continue;
    try {
      const cached = await cacheCoverIfEnabled(itemId, pagePath);
      if (cached && existsSync(cached)) return cached;
      if (cached) return cached;
    } catch {
      continue;
    }
  }
  return null;
}

async function rebuildCoverCache(items: LibraryItem[]): Promise<LibraryItem[]> {
  const cachePath = await activeCoverCachePath();
  await rm(cachePath, { recursive: true, force: true });
  await mkdir(cachePath, { recursive: true });
  const nextItems: LibraryItem[] = [];
  for (const item of items) {
    const sourceCover = item.coverPath && existsSync(item.coverPath) ? item.coverPath : item.pagePaths.find((pagePath) => existsSync(pagePath)) ?? null;
    nextItems.push({ ...item, coverPath: await cacheCoverIfEnabled(item.id, sourceCover) });
  }
  return nextItems;
}

async function detectPlayers(): Promise<Partial<Record<LibraryCategory, string>>> {
  const candidates: Array<{ category: LibraryCategory; paths: string[] }> = [
    {
      category: "video",
      paths: [
        "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe",
        "C:\\Program Files\\DAUM\\PotPlayer\\PotPlayerMini64.exe",
        "C:\\Program Files\\MPC-HC\\mpc-hc64.exe",
        "C:\\Program Files\\Windows Media Player\\wmplayer.exe"
      ]
    },
    {
      category: "audio",
      paths: [
        "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe",
        "C:\\Program Files\\Windows Media Player\\wmplayer.exe",
        "C:\\Program Files\\foobar2000\\foobar2000.exe",
        "C:\\Program Files\\AIMP\\AIMP.exe"
      ]
    },
    {
      category: "text",
      paths: [
        "C:\\Program Files\\SumatraPDF\\SumatraPDF.exe",
        "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE"
      ]
    }
  ];
  const detected: Partial<Record<LibraryCategory, string>> = {};

  for (const group of candidates) {
    const found = group.paths.find((candidate) => existsSync(candidate));
    if (found) {
      detected[group.category] = found;
    }
  }

  return detected;
}

async function readSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(settingsPath(), "utf8");
    const data = JSON.parse(raw) as AppSettings;
    return {
      players: data.players ?? {},
      documentPlayers: data.documentPlayers ?? {},
      internalPlayerCategories: data.internalPlayerCategories ?? [],
      internalDocumentKinds: data.internalDocumentKinds ?? [],
      detectedPlayers: await detectPlayers(),
      language: data.language ?? languageFromLocale(app.getLocale()),
      coverCacheEnabled: data.coverCacheEnabled ?? false,
      coverCacheDirectory: data.coverCacheDirectory ?? null,
      archiveDirectory: data.archiveDirectory ?? null,
      scannedArchiveDirectories: data.scannedArchiveDirectories ?? [],
      highPerformanceMode: data.highPerformanceMode ?? false,
      rememberProgressEnabled: data.rememberProgressEnabled ?? true,
      performance: {
        ...defaultPerformanceSettings,
        ...(data.performance ?? {}),
        preset: data.performance?.preset ?? (data.highPerformanceMode ? "high" : defaultPerformanceSettings.preset)
      }
    };
  } catch {
    return {
      players: {},
      documentPlayers: {},
      internalPlayerCategories: [],
      internalDocumentKinds: [],
      detectedPlayers: await detectPlayers(),
      language: languageFromLocale(app.getLocale()),
      coverCacheEnabled: false,
      coverCacheDirectory: null,
      archiveDirectory: null,
      scannedArchiveDirectories: [],
      highPerformanceMode: false,
      rememberProgressEnabled: true,
      performance: defaultPerformanceSettings
    };
  }
}

async function writeSettings(settings: AppSettings): Promise<void> {
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(settingsPath(), JSON.stringify(settings, null, 2), "utf8");
}

function migrateItem(raw: Partial<Omit<LibraryItem, "sourceType">> & { sourceType?: string }): LibraryItem | null {
  if (!raw.id || !raw.title || !raw.sourcePath) {
    return null;
  }

  const sourceType = raw.sourceType === "cbz" ? "archive" : (raw.sourceType as LibraryItem["sourceType"]) || "file";
  const pagePaths = raw.pagePaths ?? [];
  const category = raw.category ?? (pagePaths.length > 1 ? "comic" : categoryForExtension(raw.sourcePath));

  return {
    id: raw.id,
    title: raw.title,
    sourceType,
    sourcePath: raw.sourcePath,
    category,
    coverPath: raw.coverPath ?? null,
    videoCoverPath: raw.videoCoverPath ?? null,
    pagePaths,
    pageCount: raw.pageCount ?? pagePaths.length,
    files: raw.files ?? pagePaths.map(toLibraryFile),
    previewText: raw.previewText ?? null,
    tags: raw.tags ?? [],
    addedAt: raw.addedAt ?? now(),
    updatedAt: raw.updatedAt ?? now(),
    lastOpenedAt: raw.lastOpenedAt ?? null,
    currentPage: raw.currentPage ?? 0,
    mediaPosition: raw.mediaPosition ?? 0,
    textScrollRatio: raw.textScrollRatio ?? 0,
    favorite: raw.favorite ?? false
  };
}

async function readLibrary(): Promise<LibraryItem[]> {
  try {
    const raw = await readFile(libraryPath(), "utf8");
    const data = JSON.parse(raw) as Array<Partial<LibraryItem>>;
    return Array.isArray(data) ? data.map(migrateItem).filter((item): item is LibraryItem => Boolean(item)) : [];
  } catch {
    return [];
  }
}

async function writeLibrary(items: LibraryItem[]): Promise<void> {
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(libraryPath(), JSON.stringify(items, null, 2), "utf8");
}

async function snapshot(items: LibraryItem[]): Promise<LibrarySnapshot> {
  const sorted = [...items].sort((a, b) => {
    if (a.favorite !== b.favorite) return Number(b.favorite) - Number(a.favorite);
    const aTime = a.lastOpenedAt ?? a.addedAt;
    const bTime = b.lastOpenedAt ?? b.addedAt;
    return bTime.localeCompare(aTime);
  });
  const categories: Record<LibraryCategory, number> = {
    comic: 0,
    image: 0,
    text: 0,
    audio: 0,
    video: 0,
    series: 0,
    archive: 0,
    other: 0
  };

  for (const item of sorted) {
    categories[item.category] += 1;
  }

  return {
    items: sorted,
    stats: {
      items: sorted.length,
      favorites: sorted.filter((item) => item.favorite).length,
      pages: sorted.reduce((total, item) => total + item.pageCount, 0),
      categories
    },
    settings: await readSettings()
  };
}

async function findFilesInFolder(folderPath: string): Promise<string[]> {
  const result: string[] = [];
  const pending = [folderPath];
  let nextIndex = 0;
  let steps = 0;
  const workers = scanConcurrency();

  async function readDirectory(currentPath: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const entryPath = join(currentPath, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
      } else if (entry.isFile()) {
        result.push(entryPath);
      }
    }
    steps += 1;
    await throttleBackgroundScan(steps);
  }

  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (nextIndex < pending.length) {
        const index = nextIndex;
        nextIndex += 1;
        await readDirectory(pending[index]);
      }
    })
  );
  return result.sort(naturalCompare);
}

async function createComicFolderItem(folderPath: string, existing: LibraryItem | undefined): Promise<LibraryItem | null> {
  const absolutePath = resolve(folderPath);
  const files = await findFilesInFolder(absolutePath);
  const pagePaths = files.filter(isImage);
  if (pagePaths.length === 0) {
    return null;
  }

  const timestamp = now();
  const id = hash(`folder:${absolutePath}`);
  const coverPath = await firstUsableCoverPath(id, pagePaths);
  return {
    id,
    title: titleFromPath(absolutePath),
    sourceType: "folder",
    sourcePath: absolutePath,
    category: "comic",
    coverPath,
    videoCoverPath: null,
    pagePaths,
    pageCount: pagePaths.length,
    files: pagePaths.map(toLibraryFile),
    previewText: null,
    tags: existing?.tags ?? [],
    addedAt: existing?.addedAt ?? timestamp,
    updatedAt: timestamp,
    lastOpenedAt: existing?.lastOpenedAt ?? null,
    currentPage: Math.min(existing?.currentPage ?? 0, pagePaths.length - 1),
    mediaPosition: existing?.mediaPosition ?? 0,
    textScrollRatio: existing?.textScrollRatio ?? 0,
    favorite: existing?.favorite ?? false
  };
}

async function createComicItemFromPages(folderPath: string, pagePaths: string[], existing: LibraryItem | undefined): Promise<LibraryItem | null> {
  const absolutePath = resolve(folderPath);
  const sortedPages = [...pagePaths].sort(naturalCompare);
  if (sortedPages.length === 0) {
    return null;
  }

  const timestamp = now();
  const id = hash(`folder:${absolutePath}:loose-images`);
  const coverPath = await firstUsableCoverPath(id, sortedPages);
  return {
    id,
    title: titleFromPath(absolutePath),
    sourceType: "folder",
    sourcePath: absolutePath,
    category: "comic",
    coverPath,
    videoCoverPath: null,
    pagePaths: sortedPages,
    pageCount: sortedPages.length,
    files: sortedPages.map(toLibraryFile),
    previewText: null,
    tags: existing?.tags ?? [],
    addedAt: existing?.addedAt ?? timestamp,
    updatedAt: timestamp,
    lastOpenedAt: existing?.lastOpenedAt ?? null,
    currentPage: Math.min(existing?.currentPage ?? 0, sortedPages.length - 1),
    mediaPosition: existing?.mediaPosition ?? 0,
    textScrollRatio: existing?.textScrollRatio ?? 0,
    favorite: existing?.favorite ?? false
  };
}

async function createFileItem(filePath: string, existing: LibraryItem | undefined): Promise<LibraryItem> {
  const absolutePath = resolve(filePath);
  const timestamp = now();
  const file = toLibraryFile(absolutePath);
  const id = hash(`file:${absolutePath}`);
  const coverPath = file.category === "image" ? await firstUsableCoverPath(id, [absolutePath]) : null;

  return {
    id,
    title: titleFromPath(absolutePath),
    sourceType: "file",
    sourcePath: absolutePath,
    category: file.category,
    coverPath,
    videoCoverPath: existing?.videoCoverPath ?? null,
    pagePaths: file.category === "image" ? [absolutePath] : [],
    pageCount: file.category === "image" ? 1 : 0,
    files: [file],
    previewText: await createTextPreview(absolutePath),
    tags: existing?.tags ?? [],
    addedAt: existing?.addedAt ?? timestamp,
    updatedAt: timestamp,
    lastOpenedAt: existing?.lastOpenedAt ?? null,
    currentPage: 0,
    mediaPosition: existing?.mediaPosition ?? 0,
    textScrollRatio: existing?.textScrollRatio ?? 0,
    favorite: existing?.favorite ?? false
  };
}

async function createSeriesFolderItem(folderPath: string, existing: LibraryItem | undefined): Promise<LibraryItem | null> {
  const absolutePath = resolve(folderPath);
  const files = (await findFilesInFolder(absolutePath)).filter(isVideo);
  if (files.length < 2) {
    return null;
  }

  const timestamp = now();
  return {
    id: hash(`series:${absolutePath}`),
    title: titleFromPath(absolutePath),
    sourceType: "folder",
    sourcePath: absolutePath,
    category: "series",
    coverPath: null,
    videoCoverPath: existing?.videoCoverPath ?? null,
    pagePaths: [],
    pageCount: 0,
    files: files.map(toLibraryFile),
    previewText: null,
    tags: existing?.tags ?? [],
    addedAt: existing?.addedAt ?? timestamp,
    updatedAt: timestamp,
    lastOpenedAt: existing?.lastOpenedAt ?? null,
    currentPage: 0,
    mediaPosition: existing?.mediaPosition ?? 0,
    textScrollRatio: existing?.textScrollRatio ?? 0,
    favorite: existing?.favorite ?? false
  };
}

async function createArchiveItem(archivePath: string, existing: LibraryItem | undefined): Promise<LibraryItem | null> {
  const absolutePath = resolve(archivePath);
  const archiveStat = await stat(absolutePath);
  const id = hash(`archive:${absolutePath}:${archiveStat.mtimeMs}`);
  const outputDir = join(importCachePath(), id);
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await readFile(absolutePath));
  } catch (error) {
    await logScanSkip(absolutePath, error);
    return createFileItem(absolutePath, existing);
  }
  const imageEntries = Object.values(zip.files)
    .filter((entry) => !entry.dir && isImage(entry.name))
    .sort((a, b) => naturalCompare(a.name, b.name));

  if (imageEntries.length === 0) {
    return createFileItem(absolutePath, existing);
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
  const coverPath = await firstUsableCoverPath(id, pagePaths);
  return {
    id,
    title: titleFromPath(absolutePath),
    sourceType: "archive",
    sourcePath: absolutePath,
    category: "comic",
    coverPath,
    videoCoverPath: null,
    pagePaths,
    pageCount: pagePaths.length,
    files: pagePaths.map(toLibraryFile),
    previewText: null,
    tags: existing?.tags ?? [],
    addedAt: existing?.addedAt ?? timestamp,
    updatedAt: timestamp,
    lastOpenedAt: existing?.lastOpenedAt ?? null,
    currentPage: Math.min(existing?.currentPage ?? 0, pagePaths.length - 1),
    mediaPosition: existing?.mediaPosition ?? 0,
    textScrollRatio: existing?.textScrollRatio ?? 0,
    favorite: existing?.favorite ?? false
  };
}

async function safeCreateItem<T extends LibraryItem | null>(targetPath: string, creator: () => Promise<T>): Promise<T | null> {
  try {
    return await creator();
  } catch (error) {
    await logScanSkip(targetPath, error);
    return null;
  }
}

function createItemForFile(filePath: string, currentById: Map<string, LibraryItem>, existingItems: LibraryItem[]): Promise<LibraryItem | null> {
  const absolutePath = resolve(filePath);
  if (isArchive(absolutePath)) {
    return safeCreateItem(absolutePath, () => createArchiveItem(absolutePath, existingItems.find((item) => item.sourcePath === absolutePath)));
  }
  return safeCreateItem(absolutePath, () => createFileItem(absolutePath, currentById.get(hash(`file:${absolutePath}`))));
}

async function createItemsFromFolder(rootPath: string, existingItems: LibraryItem[]): Promise<Array<LibraryItem | null>> {
  const absoluteRoot = resolve(rootPath);
  let entries: Dirent[];
  try {
    entries = await readdir(absoluteRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  const hasDirectories = entries.some((entry) => entry.isDirectory());
  const currentById = new Map(existingItems.map((item) => [item.id, item]));
  const result: Array<LibraryItem | null> = [];
  const looseFiles: string[] = [];
  for (const entry of entries) {
    const entryPath = join(absoluteRoot, entry.name);
    if (entry.isDirectory()) {
      const directStats = await directoryEntryStats(entryPath);
      const files = await findFilesInFolder(entryPath);
      const imageCount = files.filter(isImage).length;
      const videoCount = files.filter(isVideo).length;
      const directNonImages = directStats.files - directStats.images;
      const shouldSplitNestedFolder =
        directStats.directories > 0 && (directStats.videos > 0 || directNonImages > 0 || (directStats.files === 0 && directStats.directories >= 3));
      if (shouldSplitNestedFolder) {
        result.push(...(await createItemsFromFolder(entryPath, existingItems)));
      } else if (videoCount >= 2 && videoCount >= files.length * 0.5) {
        result.push(await safeCreateItem(entryPath, () => createSeriesFolderItem(entryPath, currentById.get(hash(`series:${resolve(entryPath)}`)))));
      } else if (imageCount >= Math.max(2, files.length * 0.5)) {
        result.push(await safeCreateItem(entryPath, () => createComicFolderItem(entryPath, currentById.get(hash(`folder:${resolve(entryPath)}`)))));
      } else {
        for (const filePath of files) {
          result.push(await createItemForFile(filePath, currentById, existingItems));
        }
      }
    } else if (entry.isFile()) {
      looseFiles.push(entryPath);
    }
  }

  const rootImages = looseFiles.filter(isImage);
  if (!hasDirectories && rootImages.length >= 2 && rootImages.length >= looseFiles.length * 0.5) {
    result.push(await safeCreateItem(absoluteRoot, () => createComicItemFromPages(absoluteRoot, rootImages, currentById.get(hash(`folder:${absoluteRoot}:loose-images`)))));
  } else {
    for (const filePath of looseFiles) {
      result.push(await createItemForFile(filePath, currentById, existingItems));
    }
  }

  return result;
}

async function createFileItemsFromFolder(rootPath: string, existingItems: LibraryItem[]): Promise<Array<LibraryItem | null>> {
  const currentById = new Map(existingItems.map((item) => [item.id, item]));
  const files = await findFilesInFolder(rootPath);
  return mapWithConcurrency(
    files,
    scanConcurrency(),
    async (filePath) => createItemForFile(filePath, currentById, existingItems)
  );
}

async function createItemsFromArchiveCategory(
  archiveRoot: string,
  category: LibraryCategory,
  existingItems: LibraryItem[]
): Promise<Array<LibraryItem | null>> {
  const categoryPath = join(archiveRoot, categoryFolders[category]);
  if (!existsSync(categoryPath)) return [];
  if (category === "comic" || category === "series" || category === "video") {
    return createItemsFromFolder(categoryPath, existingItems);
  }
  return createFileItemsFromFolder(categoryPath, existingItems);
}

async function createItemsFromArchiveDirectory(rootPath: string, existingItems: LibraryItem[]): Promise<Array<LibraryItem | null>> {
  const absoluteRoot = resolve(rootPath);
  const result: Array<LibraryItem | null> = [];

  for (const category of categoryKeysForArchive()) {
    result.push(...(await createItemsFromArchiveCategory(absoluteRoot, category, existingItems)));
  }

  return result;
}

function categoryKeysForArchive(): LibraryCategory[] {
  return ["text", "audio", "video", "series", "archive", "image", "other", "comic"];
}

async function directoryHasEntries(folderPath: string): Promise<boolean> {
  try {
    const entries = await readdir(folderPath);
    return entries.length > 0;
  } catch {
    return false;
  }
}

async function mergeImports(imports: Array<LibraryItem | null>): Promise<ImportResult> {
  const current = await readLibrary();
  const byId = new Map(current.map((item) => [item.id, item]));
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of imports) {
    if (!item) {
      skipped += 1;
      continue;
    }

    if (byId.has(item.id)) {
      updated += 1;
    } else {
      added += 1;
    }
    byId.set(item.id, item);
  }

  const items = [...byId.values()];
  await writeLibrary(items);
  return { added, updated, skipped, items: (await snapshot(items)).items };
}

async function syncArchiveDirectory(): Promise<LibraryItem[]> {
  const settings = await readSettings();
  if (!settings.archiveDirectory || !existsSync(settings.archiveDirectory)) {
    return readLibrary();
  }

  const archivePath = resolve(settings.archiveDirectory);
  const current = await readLibrary();
  const hasArchiveItems = current.some((item) => isInsidePath(archivePath, item.sourcePath));
  const suspiciousNestedArchiveItemIds = new Set<string>();
  for (const item of current) {
    if (item.category !== "comic" || item.sourceType !== "folder" || !isInsidePath(archivePath, item.sourcePath)) continue;
    if (!item.files.some((file) => dirname(file.path) !== item.sourcePath)) continue;
    const stats = await directoryEntryStats(item.sourcePath);
    const directNonImages = stats.files - stats.images;
    if (stats.directories > 0 && (stats.videos > 0 || directNonImages > 0)) {
      suspiciousNestedArchiveItemIds.add(item.id);
    }
  }
  const hasSuspiciousNestedArchiveItems = suspiciousNestedArchiveItemIds.size > 0;
  if (settings.scannedArchiveDirectories.map((entry) => resolve(entry)).includes(archivePath) && hasArchiveItems && !hasSuspiciousNestedArchiveItems) {
    return readLibrary();
  }

  if (!(await directoryHasEntries(archivePath))) {
    return readLibrary();
  }

  activeImportStartedAt = Date.now();
  const categories = categoryKeysForArchive().filter((category) => existsSync(join(archivePath, categoryFolders[category])));
  const byId = new Map(current.map((item) => [item.id, item]));
  if (hasSuspiciousNestedArchiveItems) {
    for (const itemId of suspiciousNestedArchiveItemIds) byId.delete(itemId);
  }
  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];
    emitImportProgress({
      phase: "importing",
      current: index,
      total: categories.length,
      message: `Scanning ${categoryFolders[category]} in ${basename(archivePath)}`
    });
    const imports = await createItemsFromArchiveCategory(archivePath, category, current);
    for (const item of imports) {
      if (item) {
        byId.set(item.id, item);
      }
    }
    await writeLibrary([...byId.values()]);
    emitLibraryChanged();
  }
  const items = [...byId.values()];
  await writeLibrary(items);
  settings.scannedArchiveDirectories = [...new Set([...settings.scannedArchiveDirectories.map((entry) => resolve(entry)), archivePath])];
  await writeSettings(settings);
  emitImportProgress({ phase: "done", current: 1, total: 1, message: "Done" });
  return items;
}

function startArchiveSyncInBackground(): void {
  if (archiveSyncPromise) return;
  archiveSyncPromise = syncArchiveDirectory()
    .then((items) => {
      emitLibraryChanged();
      return items;
    })
    .catch(async (error) => {
      await logScanSkip("archive-sync", error);
      return readLibrary();
    })
    .finally(() => {
      archiveSyncPromise = null;
    });
}

async function openWithPlayer(item: LibraryItem): Promise<boolean> {
  const settings = await readSettings();
  const targetPath = item.sourceType === "archive" && item.category === "comic" ? item.sourcePath : item.sourcePath;
  if (settings.internalPlayerCategories.includes(item.category)) {
    return false;
  }
  if (item.category === "text" && settings.internalDocumentKinds.includes(documentKindForFile(targetPath))) {
    return false;
  }
  const documentPlayer = item.category === "text" ? settings.documentPlayers[documentKindForFile(targetPath)] : undefined;
  const customPlayer = documentPlayer ?? settings.players[item.category] ?? settings.detectedPlayers[item.category];

  item.lastOpenedAt = now();
  const items = await readLibrary();
  await writeLibrary(items.map((entry) => (entry.id === item.id ? item : entry)));

  if (customPlayer && existsSync(customPlayer) && playableCategories.has(item.category)) {
    const child = spawn(customPlayer, [targetPath], {
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    return true;
  }

  const error = await shell.openPath(targetPath);
  return !error;
}

function sanitizeName(value: string): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim() || "Untitled";
}

function renameTargetPath(item: LibraryItem, title: string): string {
  const cleanTitle = sanitizeName(title);
  if (item.sourceType === "folder") {
    return join(dirname(item.sourcePath), cleanTitle);
  }

  const originalExtension = extname(item.sourcePath);
  const requestedExtension = extname(cleanTitle);
  const fileName = requestedExtension ? cleanTitle : `${cleanTitle}${originalExtension}`;
  return join(dirname(item.sourcePath), fileName);
}

async function uniquePath(folderPath: string, name: string): Promise<string> {
  const parsed = parse(name);
  let candidate = join(folderPath, name);
  let index = 2;
  while (existsSync(candidate)) {
    candidate = join(folderPath, `${parsed.name} (${index})${parsed.ext}`);
    index += 1;
  }
  return candidate;
}

async function uniqueTargetPath(targetPath: string): Promise<string> {
  return uniquePath(dirname(targetPath), basename(targetPath));
}

function isInsidePath(parentPath: string, childPath: string): boolean {
  const relativePath = relative(resolve(parentPath), resolve(childPath));
  return relativePath === "" || (!relativePath.startsWith("..") && !parse(relativePath).root);
}

function isAlreadyOrganized(item: LibraryItem, destinationRoot: string): boolean {
  if (isInsidePath(join(destinationRoot, categoryFolders[item.category]), item.sourcePath)) {
    return true;
  }

  const relativePath = relative(resolve(destinationRoot), resolve(item.sourcePath));
  const firstFolder = relativePath.split(/[\\/]/)[0];
  return Object.values(categoryFolders).includes(firstFolder);
}

async function movePath(sourcePath: string, destinationPath: string, recursive: boolean): Promise<void> {
  await mkdir(dirname(destinationPath), { recursive: true });
  try {
    await rename(sourcePath, destinationPath);
  } catch {
    if (recursive) {
      await cp(sourcePath, destinationPath, { recursive: true, force: true });
      await rm(sourcePath, { recursive: true, force: true });
    } else {
      await copyFile(sourcePath, destinationPath);
      await rm(sourcePath, { force: true });
    }
  }
}

async function renameLibraryItem(itemId: string, title: string): Promise<LibrarySnapshot> {
  const items = await readLibrary();
  const item = items.find((entry) => entry.id === itemId);
  if (!item || !existsSync(item.sourcePath)) {
    return snapshot(items);
  }

  const targetPath = await uniqueTargetPath(renameTargetPath(item, title));
  const sourceInfo = await stat(item.sourcePath);
  await movePath(item.sourcePath, targetPath, sourceInfo.isDirectory());
  const renamed = {
    ...updateMovedItemPaths(item, targetPath),
    title: titleFromPath(targetPath),
    updatedAt: now()
  };
  const nextItems = items.map((entry) => (entry.id === item.id ? renamed : entry));
  await writeLibrary(nextItems);
  return snapshot(nextItems);
}

async function deleteLibraryItems(itemIds: string[]): Promise<LibrarySnapshot> {
  const ids = new Set(itemIds);
  const items = await readLibrary();
  const nextItems: LibraryItem[] = [];

  for (const item of items) {
    if (!ids.has(item.id)) {
      nextItems.push(item);
      continue;
    }

    if (existsSync(item.sourcePath)) {
      const sourceInfo = await stat(item.sourcePath);
      await rm(item.sourcePath, { recursive: sourceInfo.isDirectory(), force: true });
    }
    if (item.sourceType === "archive" && item.category === "comic") {
      await rm(join(importCachePath(), item.id), { recursive: true, force: true });
    }
  }

  await writeLibrary(nextItems);
  return snapshot(nextItems);
}

async function createComicFromImages(itemIds: string[], title: string): Promise<LibrarySnapshot> {
  const ids = new Set(itemIds);
  const items = await readLibrary();
  const imageItems = items.filter((item) => ids.has(item.id) && item.category === "image" && item.sourceType === "file" && existsSync(item.sourcePath));
  if (imageItems.length === 0) {
    return snapshot(items);
  }

  const settings = await readSettings();
  const destinationParent = settings.archiveDirectory ? join(resolve(settings.archiveDirectory), categoryFolders.comic) : dirname(imageItems[0].sourcePath);
  const comicFolder = await uniquePath(destinationParent, sanitizeName(title));
  await mkdir(comicFolder, { recursive: true });

  for (const item of imageItems) {
    const destinationPath = await uniquePath(comicFolder, basename(item.sourcePath));
    await movePath(item.sourcePath, destinationPath, false);
  }

  const movedImageIds = new Set(imageItems.map((item) => item.id));
  const existingWithoutImages = items.filter((item) => !movedImageIds.has(item.id));
  const comic = await createComicFolderItem(comicFolder, undefined);
  const nextItems = comic ? [...existingWithoutImages, comic] : existingWithoutImages;
  await writeLibrary(nextItems);
  return snapshot(nextItems);
}

async function zipFolderToCbz(folderPath: string, outputPath: string): Promise<void> {
  const zip = new JSZip();
  const files = await findFilesInFolder(folderPath);

  for (const filePath of files) {
    const archiveName = relative(folderPath, filePath).replace(/\\/g, "/");
    zip.file(archiveName, await readFile(filePath));
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

async function organizeComics(compressFolders: boolean): Promise<OrganizeResult> {
  const current = await readLibrary();
  const settings = await readSettings();
  if (!settings.archiveDirectory) {
    const selection = await dialog.showOpenDialog(mainWindow!, {
      title: "Choose archive folder for imported resources",
      properties: ["openDirectory", "createDirectory"]
    });
    if (selection.canceled || !selection.filePaths[0]) {
      return { moved: 0, compressed: 0, skipped: 0, destinationPath: null, items: (await snapshot(current)).items };
    }
    settings.archiveDirectory = resolve(selection.filePaths[0]);
  }

  const destinationRoot = resolve(settings.archiveDirectory);
  await mkdir(destinationRoot, { recursive: true });
  settings.archiveDirectory = destinationRoot;
  await writeSettings(settings);

  let moved = 0;
  let compressed = 0;
  let skipped = 0;
  const nextItems: LibraryItem[] = [];
  activeImportStartedAt = Date.now();
  emitImportProgress({ phase: "scanning", current: 0, total: current.length, message: "Preparing archive/compression" });

  for (let index = 0; index < current.length; index += 1) {
    const item = current[index];
    emitImportProgress({ phase: "importing", current: index, total: current.length, message: `Processing ${item.title}` });
    if (!existsSync(item.sourcePath)) {
      nextItems.push(item);
      skipped += 1;
      continue;
    }

    try {
      if (isAlreadyOrganized(item, destinationRoot)) {
        nextItems.push(item);
        skipped += 1;
        continue;
      }

      if (compressFolders && item.sourceType === "folder") {
        const extension = item.category === "comic" ? ".cbz" : null;
        if (!extension) {
          const sourceInfo = await stat(item.sourcePath);
          const destinationPath = await uniquePath(join(destinationRoot, categoryFolders[item.category]), basename(item.sourcePath));
          await movePath(item.sourcePath, destinationPath, sourceInfo.isDirectory());
          nextItems.push(updateMovedItemPaths(item, destinationPath));
          moved += 1;
          continue;
        }

        const cbzPath = await uniquePath(join(destinationRoot, categoryFolders.comic), `${sanitizeName(item.title)}.cbz`);
        await zipFolderToCbz(item.sourcePath, cbzPath);
        const archiveItem = await createArchiveItem(cbzPath, item);
        await rm(item.sourcePath, { recursive: true, force: true });
        nextItems.push(archiveItem ?? { ...item, sourceType: "archive", sourcePath: cbzPath, updatedAt: now() });
        compressed += 1;
      } else {
        const sourceInfo = await stat(item.sourcePath);
        const destinationPath = await uniquePath(join(destinationRoot, categoryFolders[item.category]), basename(item.sourcePath));
        await movePath(item.sourcePath, destinationPath, sourceInfo.isDirectory());
        nextItems.push(updateMovedItemPaths(item, destinationPath));
        moved += 1;
      }
    } catch {
      skipped += 1;
      nextItems.push(item);
    }
  }

  emitImportProgress({ phase: "saving", current: current.length, total: current.length, message: "Saving archive result" });
  await writeLibrary(nextItems);
  emitImportProgress({ phase: "done", current: current.length, total: current.length, message: "Done" });
  return { moved, compressed, skipped, destinationPath: destinationRoot, items: (await snapshot(nextItems)).items };
}

function updateMovedItemPaths(item: LibraryItem, destinationPath: string): LibraryItem {
  const pagePaths =
    item.sourceType === "folder" ? item.pagePaths.map((pagePath) => join(destinationPath, relative(item.sourcePath, pagePath))) : item.pagePaths;
  return {
    ...item,
    sourcePath: destinationPath,
    coverPath:
      item.coverPath && item.sourceType === "folder"
        ? join(destinationPath, relative(item.sourcePath, item.coverPath))
        : item.coverPath === item.sourcePath
          ? destinationPath
          : item.coverPath,
    pagePaths: item.sourceType === "file" && item.pagePaths.includes(item.sourcePath) ? [destinationPath] : pagePaths,
    files:
      item.sourceType === "folder"
        ? item.files.map((file) => ({ ...file, path: join(destinationPath, relative(item.sourcePath, file.path)) }))
        : item.files.map((file) => (file.path === item.sourcePath ? { ...file, path: destinationPath } : file)),
    updatedAt: now()
  };
}

async function categoryForOrganizing(filePath: string): Promise<LibraryCategory> {
  if (isArchive(filePath)) {
    try {
      const zip = await JSZip.loadAsync(await readFile(filePath));
      const hasImages = Object.values(zip.files).some((entry) => !entry.dir && isImage(entry.name));
      return hasImages ? "comic" : "archive";
    } catch {
      return "archive";
    }
  }

  return categoryForExtension(filePath);
}

async function autoOrganizeFolder(): Promise<AutoOrganizeResult> {
  const settings = await readSettings();
  if (!settings.archiveDirectory) {
    const destinationSelection = await dialog.showOpenDialog(mainWindow!, {
      title: "Choose destination folder for imported library",
      properties: ["openDirectory", "createDirectory"]
    });
    if (destinationSelection.canceled || !destinationSelection.filePaths[0]) {
      return emptyAutoOrganizeResult(null, null);
    }
    settings.archiveDirectory = resolve(destinationSelection.filePaths[0]);
  }

  const destinationRoot = resolve(settings.archiveDirectory);
  settings.archiveDirectory = destinationRoot;
  await writeSettings(settings);
  const counts: Record<LibraryCategory, number> = { comic: 0, image: 0, text: 0, audio: 0, video: 0, series: 0, archive: 0, other: 0 };
  let moved = 0;
  let skipped = 0;
  const current = await readLibrary();
  const nextItems: LibraryItem[] = [];
  activeImportStartedAt = Date.now();
  emitImportProgress({ phase: "scanning", current: 0, total: current.length, message: "Preparing archive classification" });

  for (const folderName of Object.values(categoryFolders)) {
    await mkdir(join(destinationRoot, folderName), { recursive: true });
  }

  for (let index = 0; index < current.length; index += 1) {
    const item = current[index];
    emitImportProgress({ phase: "importing", current: index, total: current.length, message: `Classifying ${item.title}` });
    try {
      if (!existsSync(item.sourcePath)) {
        skipped += 1;
        nextItems.push(item);
        continue;
      }
      if (isAlreadyOrganized(item, destinationRoot)) {
        skipped += 1;
        nextItems.push(item);
        continue;
      }
      const sourceInfo = await stat(item.sourcePath);
      const destinationPath = await uniquePath(join(destinationRoot, categoryFolders[item.category]), basename(item.sourcePath));
      await movePath(item.sourcePath, destinationPath, sourceInfo.isDirectory());
      nextItems.push(updateMovedItemPaths(item, destinationPath));
      counts[item.category] += 1;
      moved += 1;
    } catch {
      skipped += 1;
      nextItems.push(item);
    }
  }

  emitImportProgress({ phase: "saving", current: current.length, total: current.length, message: "Saving archive classification" });
  await writeLibrary(nextItems);
  emitImportProgress({ phase: "done", current: current.length, total: current.length, message: "Done" });
  return { moved, skipped, sourcePath: null, destinationPath: destinationRoot, categories: counts, items: (await snapshot(nextItems)).items };
}

function emptyAutoOrganizeResult(sourcePath: string | null, destinationPath: string | null): AutoOrganizeResult {
  return {
    moved: 0,
    skipped: 0,
    sourcePath,
    destinationPath,
    categories: { comic: 0, image: 0, text: 0, audio: 0, video: 0, series: 0, archive: 0, other: 0 },
    items: []
  };
}

function relaunchAsAdmin(): void {
  const exePath = process.execPath;
  const args = app.isPackaged ? "" : `-ArgumentList '${process.argv.slice(1).join("','").replace(/'/g, "''")}'`;
  spawn(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", `Start-Process -FilePath '${exePath.replace(/'/g, "''")}' ${args} -Verb RunAs`],
    { detached: true, stdio: "ignore" }
  ).unref();
  isQuitting = true;
  app.quit();
}

function showMainWindow(): void {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.restore();
  mainWindow.focus();
}

app.on("second-instance", showMainWindow);

function quitApp(): void {
  isQuitting = true;
  app.quit();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createReferenceWindow(filePath: string, title: string): void {
  if (!existsSync(filePath)) return;

  const safeTitle = escapeHtml(title || basename(filePath));
  const sourceUrl = `manga://file/?path=${encodeURIComponent(filePath)}`;
  const referenceWindow = new BrowserWindow({
    width: 360,
    height: 520,
    minWidth: 180,
    minHeight: 180,
    title: `Reference - ${title || basename(filePath)}`,
    backgroundColor: "#101214",
    alwaysOnTop: true,
    autoHideMenuBar: true,
    resizable: true,
    minimizable: true,
    maximizable: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  referenceWindows.add(referenceWindow);
  referenceWindow.on("closed", () => referenceWindows.delete(referenceWindow));
  referenceWindow.setAlwaysOnTop(true, "floating");
  void referenceWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
      * { box-sizing: border-box; }
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #101214; color: #f6f2ea; font-family: "Segoe UI", sans-serif; }
      body { display: grid; grid-template-rows: 38px 1fr 42px; }
      header { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 0 10px; background: #20242a; border-bottom: 1px solid rgba(255,255,255,0.1); }
      header strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
      main { display: grid; place-items: center; min-height: 0; overflow: hidden; }
      img { display: block; width: 100%; height: 100%; object-fit: contain; background: #050607; }
      body.free img { object-fit: fill; }
      footer { display: flex; align-items: center; gap: 8px; padding: 0 10px; background: #15171a; border-top: 1px solid rgba(255,255,255,0.08); }
      button { min-height: 28px; padding: 0 10px; border: 0; border-radius: 7px; background: #2b3036; color: #f6f2ea; cursor: pointer; }
      button:hover { background: #3a424b; }
      span { color: #a8b0b8; font-size: 12px; }
    </style>
  </head>
  <body>
    <header><strong title="${safeTitle}">${safeTitle}</strong></header>
    <main><img src="${sourceUrl}" draggable="false" /></main>
    <footer>
      <button id="fit">Lock ratio</button>
      <span>Resize this window freely. It stays visible when the main app is in tray.</span>
    </footer>
    <script>
      const button = document.getElementById("fit");
      button.addEventListener("click", () => {
        document.body.classList.toggle("free");
        button.textContent = document.body.classList.contains("free") ? "Free ratio" : "Lock ratio";
      });
    </script>
  </body>
</html>`)}`
  );
}

function createTray(): void {
  if (tray) return;
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAA/ElEQVR4nO1XS6oCMRDsGwjieBEXdoOnEN+B/OyUbj3YU3evWzyEjq5V4owyMk9QGBOVNNQyqUoqny6AQq3H1FSmkTIuTGhvQseKsFfBuTIOHQf8VzqlHxNMKyS9A0z/mHolcmU6vJ48g+O6iliPqeln5SUR29Wsk4Dz3Dd5wY4BqOAylAB3MMEYdwF3IIVw5Bng7QUk9doNHpn0mTEQBVi0QOIhpHgNjx/1ECV3EAXY11pgob9je70A9N4RFztjyFNQuKZUGYfBLGDqhwsmQhudtBrndORiku9oZtLu3uTDXMTWx8pL5JdyWc3FJRX6rTSwMO6yOal/3fa8TrqKbXSpNt29AAAAAElFTkSuQmCC",
      "base64"
    )
  );
  tray = new Tray(icon);
  tray.setToolTip("Offline Library");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "打开 Offline Library", click: showMainWindow },
      { label: "退出", click: quitApp }
    ])
  );
  tray.on("double-click", showMainWindow);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#111214",
    title: "Offline Comic Shelf",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false
    }
  });

  mainWindow.on("ready-to-show", () => mainWindow?.show());
  mainWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow?.hide();
    configureResourceMode();
  });
  mainWindow.on("show", configureResourceMode);
  mainWindow.on("restore", configureResourceMode);
  mainWindow.on("focus", configureResourceMode);
  mainWindow.on("hide", configureResourceMode);
  mainWindow.on("minimize", configureResourceMode);

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  if (!singleInstanceLock) return;

  electronApp.setAppUserModelId("io.github.haoy633star.offlinecomicshelf");
  Menu.setApplicationMenu(null);

  protocol.handle("manga", (request) => {
    const url = new URL(request.url);
    const filePath = url.searchParams.get("path");
    if (!filePath || !existsSync(filePath)) {
      return new Response("File not found", { status: 404 });
    }
    return fileResponse(filePath, request);
  });

  app.on("browser-window-created", (_, window) => optimizer.watchWindowShortcuts(window));

  ipcMain.handle("library:get", async () => {
    const settings = await readSettings();
    const items = await readLibrary();
    if (settings.archiveDirectory && existsSync(settings.archiveDirectory) && items.length === 0 && (await directoryHasEntries(settings.archiveDirectory))) {
      startArchiveSyncInBackground();
    }
    return snapshot(items);
  });

  ipcMain.handle("library:import-folders", async () => {
    const selection = await dialog.showOpenDialog(mainWindow!, {
      title: "Import folders",
      properties: ["openDirectory", "multiSelections"]
    });
    if (selection.canceled) {
      const current = await readLibrary();
      return { added: 0, updated: 0, skipped: 0, items: (await snapshot(current)).items };
    }

    const current = await readLibrary();
    const imports: Array<LibraryItem | null> = [];
    activeImportStartedAt = Date.now();
    emitImportProgress({ phase: "scanning", current: 0, total: selection.filePaths.length, message: "Preparing folders" });
    for (let index = 0; index < selection.filePaths.length; index += 1) {
      const folderPath = selection.filePaths[index];
      emitImportProgress({
        phase: "importing",
        current: index,
        total: selection.filePaths.length,
        message: `Importing ${basename(folderPath)}`
      });
      imports.push(...(await createItemsFromFolder(folderPath, current)));
    }
    emitImportProgress({ phase: "saving", current: selection.filePaths.length, total: selection.filePaths.length, message: "Saving library" });
    const result = await mergeImports(imports);
    emitImportProgress({ phase: "done", current: selection.filePaths.length, total: selection.filePaths.length, message: "Done" });
    return result;
  });

  ipcMain.handle("library:import-archives", async () => {
    const selection = await dialog.showOpenDialog(mainWindow!, {
      title: "Import CBZ or ZIP archives",
      filters: [{ name: "Archives", extensions: ["cbz", "zip"] }],
      properties: ["openFile", "multiSelections"]
    });
    if (selection.canceled) {
      const current = await readLibrary();
      return { added: 0, updated: 0, skipped: 0, items: (await snapshot(current)).items };
    }

    const current = await readLibrary();
    const currentBySource = new Map(current.map((item) => [item.sourcePath, item]));
    const archivePaths = selection.filePaths.filter(isArchive);
    const imports: Array<LibraryItem | null> = [];
    activeImportStartedAt = Date.now();
    emitImportProgress({ phase: "scanning", current: 0, total: archivePaths.length, message: "Preparing archives" });
    for (let index = 0; index < archivePaths.length; index += 1) {
      const archivePath = archivePaths[index];
      emitImportProgress({
        phase: "importing",
        current: index,
        total: archivePaths.length,
        message: `Importing ${basename(archivePath)}`
      });
      imports.push(await createArchiveItem(archivePath, currentBySource.get(resolve(archivePath))));
    }
    emitImportProgress({ phase: "saving", current: archivePaths.length, total: archivePaths.length, message: "Saving library" });
    const result = await mergeImports(imports);
    emitImportProgress({ phase: "done", current: archivePaths.length, total: archivePaths.length, message: "Done" });
    return result;
  });

  ipcMain.handle("library:update-progress", async (_, itemId: string, page: number) => {
    const items = await readLibrary();
    const item = items.find((entry) => entry.id === itemId);
    if (!item) {
      return null;
    }

    item.currentPage = Math.max(0, Math.min(page, item.pageCount - 1));
    item.lastOpenedAt = now();
    await writeLibrary(items);
    return item;
  });

  ipcMain.handle(
    "library:update-reading-state",
    async (_, itemId: string, state: { page?: number; mediaPosition?: number; textScrollRatio?: number }) => {
      const settings = await readSettings();
      if (!settings.rememberProgressEnabled) {
        return null;
      }

      const items = await readLibrary();
      const item = items.find((entry) => entry.id === itemId);
      if (!item) {
        return null;
      }

      if (typeof state.page === "number") {
        item.currentPage = Math.max(0, Math.min(state.page, Math.max(0, item.pageCount - 1)));
      }
      if (typeof state.mediaPosition === "number" && Number.isFinite(state.mediaPosition)) {
        item.mediaPosition = Math.max(0, state.mediaPosition);
      }
      if (typeof state.textScrollRatio === "number" && Number.isFinite(state.textScrollRatio)) {
        item.textScrollRatio = Math.max(0, Math.min(1, state.textScrollRatio));
      }
      item.lastOpenedAt = now();
      await writeLibrary(items);
      return item;
    }
  );

  ipcMain.handle("library:toggle-favorite", async (_, itemId: string) => {
    const items = await readLibrary();
    const item = items.find((entry) => entry.id === itemId);
    if (!item) {
      return snapshot(items);
    }
    item.favorite = !item.favorite;
    item.updatedAt = now();
    await writeLibrary(items);
    return snapshot(items);
  });

  ipcMain.handle("library:update-tags", async (_, itemId: string, tags: string[]) => {
    const cleanTags = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 20);
    const items = await readLibrary();
    const item = items.find((entry) => entry.id === itemId);
    if (!item) {
      return snapshot(items);
    }
    item.tags = cleanTags;
    item.updatedAt = now();
    await writeLibrary(items);
    return snapshot(items);
  });

  ipcMain.handle("library:rename", async (_, itemId: string, title: string) => {
    return renameLibraryItem(itemId, title);
  });

  ipcMain.handle("library:delete-items", async (_, itemIds: string[]) => {
    return deleteLibraryItems(itemIds);
  });

  ipcMain.handle("library:create-comic-from-images", async (_, itemIds: string[], title: string) => {
    return createComicFromImages(itemIds, title);
  });

  ipcMain.handle("library:save-video-cover", async (_, itemId: string, dataUrl: string) => {
    const match = /^data:image\/(?:jpeg|png|webp);base64,(.+)$/.exec(dataUrl);
    const items = await readLibrary();
    const item = items.find((entry) => entry.id === itemId);
    if (!match || !item) {
      return snapshot(items);
    }
    const cachePath = await activeCoverCachePath();
    await mkdir(cachePath, { recursive: true });
    const coverPath = join(cachePath, `video-${itemId}.jpg`);
    await writeFile(coverPath, Buffer.from(match[1], "base64"));
    item.videoCoverPath = coverPath;
    item.updatedAt = now();
    await writeLibrary(items);
    return snapshot(items);
  });

  ipcMain.handle("library:open-external", async (_, itemId: string) => {
    const items = await readLibrary();
    const item = items.find((entry) => entry.id === itemId);
    let opened = false;
    if (item) {
      opened = await openWithPlayer(item);
    }
    return { ...(await snapshot(await readLibrary())), opened } satisfies OpenResult;
  });

  ipcMain.handle("library:clear", async () => {
    await writeLibrary([]);
    await rm(importCachePath(), { recursive: true, force: true });
    const settings = await readSettings();
    settings.archiveDirectory = null;
    settings.scannedArchiveDirectories = [];
    await writeSettings(settings);
    return snapshot([]);
  });

  ipcMain.handle("library:organize-comics", async (_, compressFolders: boolean) => {
    return organizeComics(compressFolders);
  });

  ipcMain.handle("library:auto-organize-folder", async () => {
    return autoOrganizeFolder();
  });

  ipcMain.handle("app:relaunch-admin", async () => {
    relaunchAsAdmin();
  });

  ipcMain.handle("app:quit", async () => {
    quitApp();
  });

  ipcMain.handle("app:set-fullscreen", async (_, enabled: boolean) => {
    mainWindow?.setFullScreen(enabled);
  });

  ipcMain.handle("app:release-idle-memory", async () => {
    await releaseIdleMemory();
  });

  ipcMain.handle("app:open-reference-image", async (_, filePath: string, title: string) => {
    createReferenceWindow(filePath, title);
  });

  ipcMain.handle("library:remove", async (_, itemId: string) => {
    const items = await readLibrary();
    const removed = items.find((item) => item.id === itemId);
    const nextItems = items.filter((item) => item.id !== itemId);
    if (removed?.sourceType === "archive" && removed.category === "comic") {
      await rm(join(importCachePath(), removed.id), { recursive: true, force: true });
    }
    await writeLibrary(nextItems);
    return snapshot(nextItems);
  });

  ipcMain.handle("settings:set-player", async (_, category: LibraryCategory) => {
    const selection = await dialog.showOpenDialog(mainWindow!, {
      title: `Choose ${category} player`,
      filters: [{ name: "Programs", extensions: ["exe", "bat", "cmd"] }],
      properties: ["openFile"]
    });
    const settings = await readSettings();
    if (!selection.canceled && selection.filePaths[0]) {
      settings.players[category] = selection.filePaths[0];
      settings.internalPlayerCategories = settings.internalPlayerCategories.filter((entry) => entry !== category);
      await writeSettings(settings);
    }
    return settings;
  });

  ipcMain.handle("settings:clear-player", async (_, category: LibraryCategory) => {
    const settings = await readSettings();
    delete settings.players[category];
    settings.internalPlayerCategories = settings.internalPlayerCategories.filter((entry) => entry !== category);
    await writeSettings(settings);
    return settings;
  });

  ipcMain.handle("settings:use-internal-player", async (_, category: LibraryCategory) => {
    const settings = await readSettings();
    delete settings.players[category];
    settings.internalPlayerCategories = [...new Set([...settings.internalPlayerCategories, category])];
    await writeSettings(settings);
    return settings;
  });

  ipcMain.handle("settings:set-document-player", async (_, kind: DocumentKind) => {
    const selection = await dialog.showOpenDialog(mainWindow!, {
      title: `Choose ${kind} document player`,
      filters: [{ name: "Programs", extensions: ["exe", "bat", "cmd"] }],
      properties: ["openFile"]
    });
    const settings = await readSettings();
    if (!selection.canceled && selection.filePaths[0]) {
      settings.documentPlayers[kind] = selection.filePaths[0];
      settings.internalDocumentKinds = settings.internalDocumentKinds.filter((entry) => entry !== kind);
      await writeSettings(settings);
    }
    return settings;
  });

  ipcMain.handle("settings:clear-document-player", async (_, kind: DocumentKind) => {
    const settings = await readSettings();
    delete settings.documentPlayers[kind];
    settings.internalDocumentKinds = settings.internalDocumentKinds.filter((entry) => entry !== kind);
    await writeSettings(settings);
    return settings;
  });

  ipcMain.handle("settings:use-internal-document-player", async (_, kind: DocumentKind) => {
    const settings = await readSettings();
    delete settings.documentPlayers[kind];
    settings.internalDocumentKinds = [...new Set([...settings.internalDocumentKinds, kind])];
    await writeSettings(settings);
    return settings;
  });

  ipcMain.handle("settings:set-language", async (_, language: AppLanguage) => {
    const settings = await readSettings();
    settings.language = language;
    await writeSettings(settings);
    return readSettings();
  });

  ipcMain.handle("settings:set-cover-cache", async (_, enabled: boolean) => {
    const settings = await readSettings();
    settings.coverCacheEnabled = enabled;
    await writeSettings(settings);
    if (enabled) {
      const items = await rebuildCoverCache(await readLibrary());
      await writeLibrary(items);
    }
    return snapshot(await readLibrary());
  });

  ipcMain.handle("settings:set-cover-cache-directory", async () => {
    const selection = await dialog.showOpenDialog(mainWindow!, {
      title: "Choose cover cache folder",
      properties: ["openDirectory", "createDirectory"]
    });
    const settings = await readSettings();
    if (!selection.canceled && selection.filePaths[0]) {
      settings.coverCacheDirectory = resolve(selection.filePaths[0]);
      settings.coverCacheEnabled = true;
      await writeSettings(settings);
      const items = await rebuildCoverCache(await readLibrary());
      await writeLibrary(items);
    }
    return snapshot(await readLibrary());
  });

  ipcMain.handle("settings:set-archive-directory", async () => {
    const selection = await dialog.showOpenDialog(mainWindow!, {
      title: "Choose archive library folder",
      properties: ["openDirectory", "createDirectory"]
    });
    const settings = await readSettings();
    if (!selection.canceled && selection.filePaths[0]) {
      settings.archiveDirectory = resolve(selection.filePaths[0]);
      await writeSettings(settings);
      startArchiveSyncInBackground();
    }
    return snapshot(await readLibrary());
  });

  ipcMain.handle("settings:clear-cover-cache", async () => {
    await rm(await activeCoverCachePath(), { recursive: true, force: true });
    const settings = await readSettings();
    settings.coverCacheEnabled = false;
    await writeSettings(settings);
    const items = await readLibrary();
    const restored = items.map((item) => ({
      ...item,
      coverPath: item.pagePaths.find((pagePath) => existsSync(pagePath)) ?? item.coverPath,
      videoCoverPath: null
    }));
    await writeLibrary(restored);
    return snapshot(restored);
  });

  ipcMain.handle("settings:set-high-performance", async (_, enabled: boolean) => {
    const settings = await readSettings();
    settings.highPerformanceMode = enabled;
    settings.performance = {
      ...settings.performance,
      preset: enabled ? "high" : "balanced",
      demandLoadCovers: !enabled,
      reducedCoverCache: !enabled,
      staticVideoPreview: false,
      tightVirtualization: true,
      idleAutoRelease: !enabled
    };
    if (enabled) {
      settings.coverCacheEnabled = true;
    }
    await writeSettings(settings);
    if (enabled) {
      const items = await rebuildCoverCache(await readLibrary());
      await writeLibrary(items);
    }
    return snapshot(await readLibrary());
  });

  ipcMain.handle("settings:set-performance", async (_, patch: Partial<PerformanceSettings>) => {
    const settings = await readSettings();
    settings.performance = {
      ...settings.performance,
      ...patch,
      idleReleaseMinutes: Math.max(1, Math.min(30, Number(patch.idleReleaseMinutes ?? settings.performance.idleReleaseMinutes))),
      coverPreviewWidth: Math.max(160, Math.min(720, Number(patch.coverPreviewWidth ?? settings.performance.coverPreviewWidth))),
      coverPreviewQuality: Math.max(45, Math.min(92, Number(patch.coverPreviewQuality ?? settings.performance.coverPreviewQuality)))
    };
    settings.highPerformanceMode = settings.performance.preset === "high" || settings.performance.preset === "extreme";
    if (settings.highPerformanceMode) {
      settings.coverCacheEnabled = true;
    }
    await writeSettings(settings);
    return snapshot(await readLibrary());
  });

  ipcMain.handle("settings:get-system-profile", async () => {
    return systemProfile();
  });

  ipcMain.handle("settings:set-remember-progress", async (_, enabled: boolean) => {
    const settings = await readSettings();
    settings.rememberProgressEnabled = enabled;
    await writeSettings(settings);
    return snapshot(await readLibrary());
  });

  ipcMain.handle("file:reveal", async (_, filePath: string) => {
    shell.showItemInFolder(filePath);
  });

  ipcMain.handle("file:read-text", async (_, filePath: string) => {
    return readFile(filePath, "utf8");
  });

  ipcMain.handle("file:read-document-text", async (_, filePath: string) => {
    return readDocumentText(filePath);
  });

  ipcMain.handle("app:open-github", async () => {
    await shell.openExternal("https://github.com/haoy633-star/Offline-text-repository-");
  });

  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (isQuitting && process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});
