import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  FileArchive,
  FileImage,
  FileText,
  FolderOpen,
  FolderPlus,
  Github,
  Heart,
  HelpCircle,
  Library,
  Maximize2,
  Minus,
  Music,
  PackagePlus,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Star,
  Trash2,
  Video,
  X
} from "lucide-react";
import type {
  AppLanguage,
  AppSettings,
  ImportProgress,
  LibraryCategory,
  LibraryItem,
  LibrarySnapshot,
  LibrarySortKey
} from "../../shared/types";
import "./styles.css";

type ViewMode = "grid" | "reader" | "viewer" | "help";
type FilterKey = "all" | "favorite" | LibraryCategory;
type FitMode = "page" | "width" | "actual";

const categoryKeys: LibraryCategory[] = ["comic", "image", "text", "audio", "video", "archive", "other"];

const copy = {
  zh: {
    appName: "Offline Library",
    subtitle: "离线漫画与资料库",
    importHint: "导入文件夹后会自动分类；没有外部播放器时会使用内置查看器。",
    ready: "资料库已就绪，可以搜索、筛选分类或查看收藏。",
    search: "搜索标题或路径",
    importFolder: "导入文件夹",
    importArchive: "导入 CBZ / ZIP",
    all: "全部",
    favorite: "收藏",
    library: "资料库",
    visible: "项可见",
    noContent: "还没有可显示的内容",
    noContentHint: "导入一个混合文件夹，应用会自动识别漫画、文本、音频、视频和其它文件。",
    externalPlayers: "外部播放器",
    windowsDefault: "内置/系统默认",
    choosePlayer: "选择播放器",
    clearDefault: "恢复默认",
    adminTools: "管理员工具",
    compressComicFolders: "文件夹漫画压缩为 CBZ",
    relaunchAdmin: "管理员模式重启",
    organizeImported: "整理已导入漫画",
    autoOrganize: "扫描大文件夹并分类",
    clearLibrary: "清空库",
    clearConfirm: "确定清空库吗？这不会删除你的原始文件，只会清空应用里的索引和缓存。",
    help: "使用方法",
    github: "GitHub",
    language: "中文 / English",
    openOrRead: "打开或阅读",
    reveal: "打开所在位置",
    remove: "从库中移除",
    removeDone: "已从库中移除，原始文件不会被删除。",
    favorited: "已收藏",
    unfavorited: "已取消收藏",
    cancelled: "已取消操作。",
    clearDone: "库已清空，原始文件没有被删除。",
    organizeDone: "整理完成",
    moved: "移动",
    compressed: "压缩",
    skipped: "跳过",
    target: "目标",
    source: "来源",
    readerBack: "返回资料库",
    prev: "上一页",
    next: "下一页",
    first: "第一页",
    last: "最后一页",
    zoomIn: "放大",
    zoomOut: "缩小",
    resetZoom: "重置缩放",
    fullscreen: "全屏阅读",
    importingTitle: "正在导入，请不要退出",
    elapsed: "已用",
    remaining: "预计剩余",
    sort: "排序",
    sortAz: "A 到 Z",
    sortZa: "Z 到 A",
    sortNewest: "最新导入",
    sortOldest: "最早导入",
    sortRecent: "最近打开",
    editTags: "编辑标签",
    tagPrompt: "输入标签，用逗号分隔",
    allTags: "全部标签",
    coverCache: "封面缓存",
    enableCache: "启用封面缓存",
    disableCache: "关闭并清除缓存",
    cacheHint: "默认关闭。开启后会占用少量内存/磁盘来加快封面预览。",
    fitPage: "适应页面",
    fitWidth: "适应宽度",
    actualSize: "原始大小",
    pureMode: "纯阅读",
    exitPure: "退出纯阅读",
    externalOpen: "使用外部程序打开",
    internalViewer: "内置查看器",
    helpText:
      "导入文件夹：选择一个漫画文件夹或混合资料文件夹。多张图片组成的文件夹会被识别为漫画；散落在根目录的单张图片会归入图片分类。导入 CBZ / ZIP：用于导入漫画压缩包。收藏：点爱心后会出现在收藏筛选中。阅读器：方向键或空格翻页，第一页/最后一页按钮可快速跳转，缩放按钮可调整显示比例，适应页面/适应宽度/原始大小用于处理不同图片比例。纯阅读/全屏阅读会隐藏侧边栏、顶部工具栏和系统菜单。外部播放器：如果检测到 VLC、PotPlayer、Windows Media Player、SumatraPDF 等会自动使用；也可以手动指定。管理员工具：整理已导入漫画只处理库里已有漫画；扫描大文件夹并分类会把来源文件夹里的文件移动到目标目录下的 Comics、Images、Text、Audio、Video、Archives、Other。清空库只清空索引和缓存，不删除原始文件。",
    categories: {
      comic: "漫画",
      image: "图片",
      text: "文本",
      audio: "音频",
      video: "视频",
      archive: "压缩包",
      other: "其它"
    }
  },
  en: {
    appName: "Offline Library",
    subtitle: "Offline comics and media",
    importHint: "Imported folders are classified automatically; the built-in viewer is used when no external player is found.",
    ready: "Library is ready. Search, filter categories, or browse favorites.",
    search: "Search title or path",
    importFolder: "Import Folder",
    importArchive: "Import CBZ / ZIP",
    all: "All",
    favorite: "Favorites",
    library: "Library",
    visible: "items visible",
    noContent: "No content yet",
    noContentHint: "Import a mixed folder and the app will detect comics, text, audio, video, and other files.",
    externalPlayers: "External Players",
    windowsDefault: "Built-in / system default",
    choosePlayer: "Choose player",
    clearDefault: "Clear player",
    adminTools: "Admin Tools",
    compressComicFolders: "Compress folder comics to CBZ",
    relaunchAdmin: "Relaunch as Admin",
    organizeImported: "Organize Imported Comics",
    autoOrganize: "Scan Folder and Classify",
    clearLibrary: "Clear Library",
    clearConfirm: "Clear the library? Original files will not be deleted; only the app index and cache will be reset.",
    help: "Help",
    github: "GitHub",
    language: "中文 / English",
    openOrRead: "Open or read",
    reveal: "Reveal in folder",
    remove: "Remove from library",
    removeDone: "Removed from library. Original files were not deleted.",
    favorited: "Added to favorites",
    unfavorited: "Removed from favorites",
    cancelled: "Cancelled.",
    clearDone: "Library cleared. Original files were not deleted.",
    organizeDone: "Organization complete",
    moved: "moved",
    compressed: "compressed",
    skipped: "skipped",
    target: "target",
    source: "source",
    readerBack: "Back to library",
    prev: "Previous page",
    next: "Next page",
    first: "First page",
    last: "Last page",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    resetZoom: "Reset zoom",
    fullscreen: "Fullscreen reading",
    importingTitle: "Importing, please do not exit",
    elapsed: "elapsed",
    remaining: "estimated remaining",
    sort: "Sort",
    sortAz: "A to Z",
    sortZa: "Z to A",
    sortNewest: "Newest import",
    sortOldest: "Oldest import",
    sortRecent: "Recently opened",
    editTags: "Edit tags",
    tagPrompt: "Enter tags separated by commas",
    allTags: "All tags",
    coverCache: "Cover cache",
    enableCache: "Enable cover cache",
    disableCache: "Disable and clear cache",
    cacheHint: "Off by default. Enabling uses a little memory/disk space to speed up cover previews.",
    fitPage: "Fit page",
    fitWidth: "Fit width",
    actualSize: "Actual size",
    pureMode: "Pure reading",
    exitPure: "Exit pure mode",
    externalOpen: "Open externally",
    internalViewer: "Built-in viewer",
    helpText:
      "Import Folder: choose a comic folder or a mixed folder. A folder with multiple images is treated as a comic; loose single images are placed in Images. Import CBZ / ZIP: import comic archives. Favorites: click the heart to keep an item in the Favorites filter. Reader: use arrow keys or Space to turn pages, first/last buttons for quick jumps, zoom controls for scale, and fit-page/fit-width/actual-size modes for different image ratios. Pure/fullscreen reading hides the sidebar, toolbar, and system menu. External players: the app auto-detects common players such as VLC, PotPlayer, Windows Media Player, and SumatraPDF, while manual player selection is still available. Admin tools: Organize Imported Comics only touches comics already in the library; Scan Folder and Classify moves files from a source folder into Comics, Images, Text, Audio, Video, Archives, and Other. Clear Library resets only the app index and cache.",
    categories: {
      comic: "Comics",
      image: "Images",
      text: "Text",
      audio: "Audio",
      video: "Video",
      archive: "Archives",
      other: "Other"
    }
  }
};

function defaultSnapshot(): LibrarySnapshot {
  return {
    items: [],
    stats: {
      items: 0,
      favorites: 0,
      pages: 0,
      categories: { comic: 0, image: 0, text: 0, audio: 0, video: 0, archive: 0, other: 0 }
    },
    settings: { players: {}, detectedPlayers: {}, language: "zh", coverCacheEnabled: false }
  };
}

function pageLabel(page: number, count: number): string {
  return count === 0 ? "0 / 0" : `${page + 1} / ${count}`;
}

function CategoryIcon({ category, size = 28 }: { category: LibraryCategory; size?: number }): JSX.Element {
  if (category === "comic") return <BookOpen size={size} />;
  if (category === "image") return <FileImage size={size} />;
  if (category === "text") return <FileText size={size} />;
  if (category === "audio") return <Music size={size} />;
  if (category === "video") return <Video size={size} />;
  if (category === "archive") return <FileArchive size={size} />;
  return <FolderOpen size={size} />;
}

function fileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath;
}

function statFromItems(items: LibraryItem[]): LibrarySnapshot["stats"] {
  return {
    items: items.length,
    favorites: items.filter((item) => item.favorite).length,
    pages: items.reduce((sum, item) => sum + item.pageCount, 0),
    categories: categoryKeys.reduce(
      (result, category) => ({ ...result, [category]: items.filter((item) => item.category === category).length }),
      { comic: 0, image: 0, text: 0, audio: 0, video: 0, archive: 0, other: 0 } as Record<LibraryCategory, number>
    )
  };
}

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "--";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
}

function progressRatio(progress: ImportProgress): number {
  if (progress.total <= 0) return 0.08;
  return Math.max(0.04, Math.min(0.98, progress.current / progress.total));
}

function estimatedRemaining(progress: ImportProgress): number {
  const elapsed = (Date.now() - progress.startedAt) / 1000;
  const ratio = progressRatio(progress);
  if (ratio <= 0.04 || progress.current === 0) return Number.NaN;
  return elapsed * (1 / ratio - 1);
}

function App(): JSX.Element {
  const [snapshot, setSnapshot] = useState<LibrarySnapshot>(defaultSnapshot());
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<LibrarySortKey>("recent");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [busy, setBusy] = useState(false);
  const [compressFolders, setCompressFolders] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [fitMode, setFitMode] = useState<FitMode>("page");
  const [pureReading, setPureReading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [, setProgressTick] = useState(0);

  const lang: AppLanguage = snapshot.settings.language ?? "zh";
  const t = copy[lang];
  const [notice, setNotice] = useState(copy.zh.importHint);

  const selectedItem = useMemo(
    () => snapshot.items.find((item) => item.id === selectedItemId) ?? null,
    [selectedItemId, snapshot.items]
  );

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const items = snapshot.items.filter((item) => {
      const matchesFilter = filter === "all" || (filter === "favorite" ? item.favorite : item.category === filter);
      const matchesTag = tagFilter === "all" || item.tags.includes(tagFilter);
      const matchesQuery = !keyword || `${item.title} ${item.sourcePath} ${item.tags.join(" ")}`.toLowerCase().includes(keyword);
      return matchesFilter && matchesTag && matchesQuery;
    });
    return [...items].sort((a, b) => {
      if (sortKey === "az") return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
      if (sortKey === "za") return b.title.localeCompare(a.title, undefined, { numeric: true, sensitivity: "base" });
      if (sortKey === "newest") return b.addedAt.localeCompare(a.addedAt);
      if (sortKey === "oldest") return a.addedAt.localeCompare(b.addedAt);
      const aTime = a.lastOpenedAt ?? a.addedAt;
      const bTime = b.lastOpenedAt ?? b.addedAt;
      return bTime.localeCompare(aTime);
    });
  }, [filter, query, snapshot.items, sortKey, tagFilter]);

  const availableTags = useMemo(() => {
    return [...new Set(snapshot.items.flatMap((item) => item.tags))].sort((a, b) => a.localeCompare(b));
  }, [snapshot.items]);

  useEffect(() => {
    void refreshLibrary();
  }, []);

  useEffect(() => {
    return window.comicShelf.onImportProgress((progress) => {
      setImportProgress(progress.phase === "done" ? null : progress);
    });
  }, []);

  useEffect(() => {
    if (!importProgress) return undefined;
    const timer = window.setInterval(() => setProgressTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [importProgress]);

  useEffect(() => {
    setNotice(copy[lang].importHint);
  }, [lang]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!selectedItem || viewMode !== "reader") return;
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        void goToPage(selectedItem.currentPage + 1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void goToPage(selectedItem.currentPage - 1);
      }
      if (event.key === "+") setZoom((value) => Math.min(300, value + 10));
      if (event.key === "-") setZoom((value) => Math.max(40, value - 10));
      if (event.key.toLowerCase() === "f") {
        pureReading ? void exitPureReading() : void enterFullscreenReading();
      }
      if (event.key === "Escape") {
        pureReading ? void exitPureReading() : setViewMode("grid");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pureReading, selectedItem, viewMode]);

  useEffect(() => {
    if (!selectedItem || viewMode !== "viewer" || selectedItem.category !== "text") return;
    void window.comicShelf.readTextFile(selectedItem.sourcePath).then(setTextContent).catch(() => setTextContent(""));
  }, [selectedItem, viewMode]);

  async function refreshLibrary(): Promise<void> {
    const data = await window.comicShelf.getLibrary();
    setSnapshot(data);
    if (data.items.length > 0) setNotice(copy[data.settings.language ?? "zh"].ready);
  }

  function updateItems(items: LibraryItem[]): void {
    setSnapshot((current) => ({ ...current, items, stats: statFromItems(items) }));
  }

  async function importFolders(): Promise<void> {
    setBusy(true);
    try {
      setImportProgress({ phase: "scanning", current: 0, total: 1, message: "Waiting for folder selection", startedAt: Date.now() });
      const result = await window.comicShelf.importFolders();
      updateItems(result.items);
      setViewMode("grid");
      setNotice(`${t.importFolder}: ${t.moved} ${result.added + result.updated}, ${t.skipped} ${result.skipped}`);
    } finally {
      setImportProgress(null);
      setBusy(false);
    }
  }

  async function importArchives(): Promise<void> {
    setBusy(true);
    try {
      setImportProgress({ phase: "scanning", current: 0, total: 1, message: "Waiting for archive selection", startedAt: Date.now() });
      const result = await window.comicShelf.importArchives();
      updateItems(result.items);
      setViewMode("grid");
      setNotice(`${t.importArchive}: ${t.moved} ${result.added + result.updated}, ${t.skipped} ${result.skipped}`);
    } finally {
      setImportProgress(null);
      setBusy(false);
    }
  }

  async function openItem(item: LibraryItem): Promise<void> {
    setSelectedItemId(item.id);
    if ((item.category === "comic" || item.category === "image") && item.pageCount > 0) {
      setViewMode("reader");
      await markProgress(item, item.currentPage);
      return;
    }

    const hasExternal = Boolean(snapshot.settings.players[item.category] ?? snapshot.settings.detectedPlayers[item.category]);
    if (hasExternal && item.category !== "archive" && item.category !== "other") {
      const data = await window.comicShelf.openExternal(item.id);
      setSnapshot(data);
      return;
    }

    setViewMode("viewer");
  }

  async function openExternal(item: LibraryItem): Promise<void> {
    const data = await window.comicShelf.openExternal(item.id);
    setSnapshot(data);
  }

  async function markProgress(item: LibraryItem, page: number): Promise<void> {
    const nextPage = Math.max(0, Math.min(page, item.pageCount - 1));
    const updated = await window.comicShelf.updateProgress(item.id, nextPage);
    if (updated) {
      setSnapshot((current) => ({ ...current, items: current.items.map((entry) => (entry.id === updated.id ? updated : entry)) }));
    }
  }

  async function goToPage(page: number): Promise<void> {
    if (selectedItem) await markProgress(selectedItem, page);
  }

  async function toggleFavorite(item: LibraryItem): Promise<void> {
    const data = await window.comicShelf.toggleFavorite(item.id);
    setSnapshot(data);
    setNotice(item.favorite ? t.unfavorited : t.favorited);
  }

  async function editTags(item: LibraryItem): Promise<void> {
    const value = window.prompt(t.tagPrompt, item.tags.join(", "));
    if (value === null) return;
    const tags = value.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean);
    const next = await window.comicShelf.updateTags(item.id, tags);
    setSnapshot(next);
  }

  async function removeItem(item: LibraryItem): Promise<void> {
    const next = await window.comicShelf.removeItem(item.id);
    setSnapshot(next);
    if (selectedItemId === item.id) {
      setSelectedItemId(null);
      setViewMode("grid");
    }
    setNotice(t.removeDone);
  }

  async function clearLibrary(): Promise<void> {
    if (!window.confirm(t.clearConfirm)) return;
    const next = await window.comicShelf.clearLibrary();
    setSnapshot(next);
    setSelectedItemId(null);
    setViewMode("grid");
    setNotice(t.clearDone);
  }

  async function setPlayer(category: LibraryCategory): Promise<void> {
    const settings = await window.comicShelf.setPlayer(category);
    setSnapshot((current) => ({ ...current, settings }));
  }

  async function clearPlayer(category: LibraryCategory): Promise<void> {
    const settings = await window.comicShelf.clearPlayer(category);
    setSnapshot((current) => ({ ...current, settings }));
  }

  async function setLanguage(language: AppLanguage): Promise<void> {
    const settings = await window.comicShelf.setLanguage(language);
    setSnapshot((current) => ({ ...current, settings }));
  }

  async function toggleCoverCache(): Promise<void> {
    if (snapshot.settings.coverCacheEnabled) {
      await clearCoverCache();
      return;
    }
    const next = await window.comicShelf.setCoverCache(!snapshot.settings.coverCacheEnabled);
    setSnapshot(next);
  }

  async function clearCoverCache(): Promise<void> {
    const next = await window.comicShelf.clearCoverCache();
    setSnapshot(next);
  }

  async function organizeComics(): Promise<void> {
    setBusy(true);
    try {
      const result = await window.comicShelf.organizeComics(compressFolders);
      updateItems(result.items);
      setViewMode("grid");
      setNotice(
        result.destinationPath
          ? `${t.organizeDone}: ${t.moved} ${result.moved}, ${t.compressed} ${result.compressed}, ${t.skipped} ${result.skipped}. ${t.target}: ${result.destinationPath}`
          : t.cancelled
      );
    } finally {
      setBusy(false);
    }
  }

  async function autoOrganizeFolder(): Promise<void> {
    setBusy(true);
    try {
      const result = await window.comicShelf.autoOrganizeFolder();
      setViewMode("grid");
      setNotice(
        result.destinationPath
          ? `${t.organizeDone}: ${t.moved} ${result.moved}, ${t.skipped} ${result.skipped}. ${t.target}: ${result.destinationPath}`
          : t.cancelled
      );
    } finally {
      setBusy(false);
    }
  }

  function playerText(settings: AppSettings, category: LibraryCategory): string {
    const manual = settings.players[category];
    const detected = settings.detectedPlayers[category];
    if (manual) return fileName(manual);
    if (detected) return fileName(detected);
    return t.windowsDefault;
  }

  function closeReader(): void {
    setPureReading(false);
    setFullscreen(false);
    void window.comicShelf.setFullscreen(false);
    setViewMode("grid");
  }

  function showLibrary(nextFilter?: FilterKey): void {
    if (nextFilter) setFilter(nextFilter);
    setPureReading(false);
    setFullscreen(false);
    void window.comicShelf.setFullscreen(false);
    setViewMode("grid");
  }

  async function enterFullscreenReading(): Promise<void> {
    setPureReading(true);
    setFullscreen(true);
    await window.comicShelf.setFullscreen(true);
  }

  async function exitPureReading(): Promise<void> {
    setPureReading(false);
    setFullscreen(false);
    await window.comicShelf.setFullscreen(false);
  }

  const shellClass = `app-shell ${pureReading ? "pure-reading" : ""}`;
  const readerImageClass = `reader-image fit-${fitMode}`;

  return (
    <main className={shellClass}>
      {!pureReading && (
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              <Library size={22} />
            </div>
            <div>
              <h1>{t.appName}</h1>
              <p>{t.subtitle}</p>
            </div>
          </div>

          <div className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
          </div>

          <div className="actions">
            <button onClick={importFolders} disabled={busy}>
              <FolderPlus size={18} />
              <span>{t.importFolder}</span>
            </button>
            <button onClick={importArchives} disabled={busy}>
              <PackagePlus size={18} />
              <span>{t.importArchive}</span>
            </button>
          </div>

          <nav className="filters" aria-label="Library filters">
            <button className={filter === "all" ? "active" : ""} onClick={() => showLibrary("all")}>
              <Library size={17} />
              <span>{t.all}</span>
              <strong>{snapshot.stats.items}</strong>
            </button>
            <button className={filter === "favorite" ? "active" : ""} onClick={() => showLibrary("favorite")}>
              <Heart size={17} />
              <span>{t.favorite}</span>
              <strong>{snapshot.stats.favorites}</strong>
            </button>
            {categoryKeys.map((category) => (
              <button className={filter === category ? "active" : ""} key={category} onClick={() => showLibrary(category)}>
                <CategoryIcon category={category} size={17} />
                <span>{t.categories[category]}</span>
                <strong>{snapshot.stats.categories[category]}</strong>
              </button>
            ))}
          </nav>

          <section className="player-settings">
            <div className="settings-title">
              <Settings size={16} />
              <span>{t.externalPlayers}</span>
            </div>
            {categoryKeys
              .filter((category) => category !== "comic")
              .map((category) => (
                <div className="player-row" key={category}>
                  <span>{t.categories[category]}</span>
                  <small title={snapshot.settings.players[category] ?? snapshot.settings.detectedPlayers[category] ?? t.windowsDefault}>
                    {playerText(snapshot.settings, category)}
                  </small>
                  <button title={t.choosePlayer} onClick={() => void setPlayer(category)}>
                    <FolderOpen size={15} />
                  </button>
                  <button title={t.clearDefault} onClick={() => void clearPlayer(category)}>
                    <X size={15} />
                  </button>
                </div>
              ))}
          </section>

          <section className="organize-panel">
            <div className="settings-title">
              <Shield size={16} />
              <span>{t.adminTools}</span>
            </div>
            <label className="check-row">
              <input type="checkbox" checked={compressFolders} onChange={(event) => setCompressFolders(event.target.checked)} />
              <span>{t.compressComicFolders}</span>
            </label>
            <button className="admin-button" onClick={() => void window.comicShelf.relaunchAsAdmin()} disabled={busy}>
              <Shield size={16} />
              <span>{t.relaunchAdmin}</span>
            </button>
            <button className="organize-button" onClick={() => void organizeComics()} disabled={busy}>
              <FolderOpen size={16} />
              <span>{t.organizeImported}</span>
            </button>
            <button className="organize-button secondary" onClick={() => void autoOrganizeFolder()} disabled={busy}>
              <FolderPlus size={16} />
              <span>{t.autoOrganize}</span>
            </button>
            <button className="danger-button" onClick={() => void clearLibrary()} disabled={busy}>
              <Trash2 size={16} />
              <span>{t.clearLibrary}</span>
            </button>
            <p className="cache-hint">{t.cacheHint}</p>
            <button className="organize-button secondary" onClick={() => void toggleCoverCache()} disabled={busy}>
              <Settings size={16} />
              <span>{snapshot.settings.coverCacheEnabled ? t.disableCache : t.enableCache}</span>
            </button>
            {snapshot.settings.coverCacheEnabled && (
              <button className="danger-button" onClick={() => void clearCoverCache()} disabled={busy}>
                <Trash2 size={16} />
                <span>{t.disableCache}</span>
              </button>
            )}
          </section>

          <section className="utility-panel">
            <button onClick={() => void setLanguage(lang === "zh" ? "en" : "zh")}>{t.language}</button>
            <button onClick={() => setViewMode("help")}>
              <HelpCircle size={16} />
              <span>{t.help}</span>
            </button>
            <button onClick={() => void window.comicShelf.openGithub()}>
              <Github size={16} />
              <span>{t.github}</span>
            </button>
          </section>

          <p className="notice">{notice}</p>
        </aside>
      )}

      {viewMode === "grid" && (
        <section className="library-view">
          <header className="topbar">
            <div>
              <h2>{filter === "favorite" ? t.favorite : filter === "all" ? t.library : t.categories[filter]}</h2>
              <p>
                {filteredItems.length} {t.visible}
              </p>
            </div>
            <div className="topbar-controls">
              <label>
                <span>{t.sort}</span>
                <select value={sortKey} onChange={(event) => setSortKey(event.target.value as LibrarySortKey)}>
                  <option value="az">{t.sortAz}</option>
                  <option value="za">{t.sortZa}</option>
                  <option value="newest">{t.sortNewest}</option>
                  <option value="oldest">{t.sortOldest}</option>
                  <option value="recent">{t.sortRecent}</option>
                </select>
              </label>
              <label>
                <span>Tag</span>
                <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
                  <option value="all">{t.allTags}</option>
                  {availableTags.map((tag) => (
                    <option value={tag} key={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </header>

          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={42} />
              <h2>{t.noContent}</h2>
              <p>{t.noContentHint}</p>
            </div>
          ) : (
            <div className="book-grid">
              {filteredItems.map((item) => (
                <article className={`book-card category-${item.category}`} key={item.id}>
                  <button className="cover-button" onClick={() => void openItem(item)}>
                    {item.coverPath ? (
                      <img src={window.comicShelf.assetUrl(item.coverPath)} alt={item.title} loading="lazy" />
                    ) : item.category === "video" ? (
                      <video className="cover-video" src={window.comicShelf.assetUrl(item.sourcePath)} preload="metadata" muted />
                    ) : (
                      <div className="missing-cover">
                        <CategoryIcon category={item.category} size={38} />
                      </div>
                    )}
                    {item.favorite && <Star className="favorite-badge" size={19} fill="currentColor" />}
                  </button>
                  <div className="book-meta">
                    <div className="meta-line">
                      <span>{t.categories[item.category]}</span>
                      <span>{item.category === "comic" || item.category === "image" ? pageLabel(item.currentPage, item.pageCount) : t.internalViewer}</span>
                    </div>
                    <h3 title={item.title}>{item.title}</h3>
                    {item.previewText && <p className="text-preview">{item.previewText}</p>}
                    {item.tags.length > 0 && (
                      <div className="tag-list">
                        {item.tags.map((tag) => (
                          <button key={tag} onClick={() => setTagFilter(tag)}>
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="book-tools">
                    <button title={item.favorite ? t.unfavorited : t.favorite} onClick={() => void toggleFavorite(item)}>
                      <Heart size={16} fill={item.favorite ? "currentColor" : "none"} />
                    </button>
                    <button title={t.openOrRead} onClick={() => void openItem(item)}>
                      <Play size={16} />
                    </button>
                    <button title={t.externalOpen} onClick={() => void openExternal(item)}>
                      <Maximize2 size={16} />
                    </button>
                    <button title={t.editTags} onClick={() => void editTags(item)}>
                      <Settings size={16} />
                    </button>
                    <button title={t.reveal} onClick={() => void window.comicShelf.revealInExplorer(item.sourcePath)}>
                      <FolderOpen size={16} />
                    </button>
                    <button title={t.remove} onClick={() => void removeItem(item)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {viewMode === "help" && (
        <section className="help-view">
          <header className="topbar">
            <div>
              <h2>{t.help}</h2>
              <p>{t.github}: https://github.com/haoy633-star/Offline-text-repository-</p>
            </div>
          </header>
          <div className="help-content">
            <p>{t.helpText}</p>
            <button onClick={() => void window.comicShelf.openGithub()}>
              <Github size={17} />
              <span>{t.github}</span>
            </button>
          </div>
        </section>
      )}

      {viewMode === "viewer" && selectedItem && (
        <section className="reader-view">
          <header className="reader-bar">
            <button title={t.readerBack} onClick={closeReader}>
              <X size={19} />
            </button>
            <div>
              <h2>{selectedItem.title}</h2>
              <p>{t.internalViewer}</p>
            </div>
            <button onClick={() => void openExternal(selectedItem)}>
              <Maximize2 size={18} />
              <span>{t.externalOpen}</span>
            </button>
          </header>
          <div className="internal-viewer">
            {selectedItem.category === "video" && <video src={window.comicShelf.assetUrl(selectedItem.sourcePath)} controls />}
            {selectedItem.category === "audio" && <audio src={window.comicShelf.assetUrl(selectedItem.sourcePath)} controls />}
            {selectedItem.category === "text" && <pre>{textContent}</pre>}
            {!["video", "audio", "text"].includes(selectedItem.category) && (
              <button onClick={() => void openExternal(selectedItem)}>
                <Maximize2 size={18} />
                <span>{t.externalOpen}</span>
              </button>
            )}
          </div>
        </section>
      )}

      {viewMode === "reader" && selectedItem && (
        <section className="reader-view">
          {!pureReading && (
            <header className="reader-bar">
              <button title={t.readerBack} onClick={closeReader}>
                <X size={19} />
              </button>
              <div>
                <h2>{selectedItem.title}</h2>
                <p>{pageLabel(selectedItem.currentPage, selectedItem.pageCount)}</p>
              </div>
              <div className="reader-actions">
                <button title={t.first} onClick={() => void goToPage(0)}>
                  <ChevronsLeft size={20} />
                </button>
                <button title={t.prev} onClick={() => void goToPage(selectedItem.currentPage - 1)}>
                  <ChevronLeft size={20} />
                </button>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, selectedItem.pageCount - 1)}
                  value={selectedItem.currentPage}
                  onChange={(event) => void goToPage(Number(event.target.value))}
                />
                <button title={t.next} onClick={() => void goToPage(selectedItem.currentPage + 1)}>
                  <ChevronRight size={20} />
                </button>
                <button title={t.last} onClick={() => void goToPage(selectedItem.pageCount - 1)}>
                  <ChevronsRight size={20} />
                </button>
                <button title={t.zoomOut} onClick={() => setZoom((value) => Math.max(40, value - 10))}>
                  <Minus size={18} />
                </button>
                <span className="zoom-label">{zoom}%</span>
                <button title={t.zoomIn} onClick={() => setZoom((value) => Math.min(300, value + 10))}>
                  <Plus size={18} />
                </button>
                <button title={t.resetZoom} onClick={() => setZoom(100)}>
                  <RotateCcw size={18} />
                </button>
                <select value={fitMode} onChange={(event) => setFitMode(event.target.value as FitMode)}>
                  <option value="page">{t.fitPage}</option>
                  <option value="width">{t.fitWidth}</option>
                  <option value="actual">{t.actualSize}</option>
                </select>
                <button title={t.fullscreen} onClick={() => void enterFullscreenReading()}>
                  <Maximize2 size={18} />
                </button>
              </div>
            </header>
          )}
          {pureReading && (
            <button className="exit-pure" onClick={() => void exitPureReading()}>
              {t.exitPure}
            </button>
          )}
          <div className="page-stage">
            <button className="page-hitbox left" title={t.prev} onClick={() => void goToPage(selectedItem.currentPage - 1)} />
            <img
              className={readerImageClass}
              style={{ ["--zoom" as string]: `${zoom}%`, ["--zoom-scale" as string]: String(zoom / 100) }}
              src={window.comicShelf.assetUrl(selectedItem.pagePaths[selectedItem.currentPage])}
              alt={`${selectedItem.title} page ${selectedItem.currentPage + 1}`}
            />
            <button className="page-hitbox right" title={t.next} onClick={() => void goToPage(selectedItem.currentPage + 1)} />
          </div>
        </section>
      )}

      {importProgress && (
        <div className="import-overlay" role="status" aria-live="polite">
          <div className="import-panel">
            <h2>{t.importingTitle}</h2>
            <p>{importProgress.message}</p>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.round(progressRatio(importProgress) * 100)}%` }} />
            </div>
            <div className="progress-meta">
              <span>
                {importProgress.current} / {importProgress.total}
              </span>
              <span>
                {t.elapsed}: {formatSeconds((Date.now() - importProgress.startedAt) / 1000)}
              </span>
              <span>
                {t.remaining}: {formatSeconds(estimatedRemaining(importProgress))}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
