import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileArchive,
  FileText,
  FolderOpen,
  FolderPlus,
  Heart,
  Library,
  Music,
  PackagePlus,
  Play,
  Search,
  Settings,
  Shield,
  Star,
  Trash2,
  Video,
  X
} from "lucide-react";
import type { AppSettings, LibraryCategory, LibraryItem, LibrarySnapshot } from "../../shared/types";
import "./styles.css";

type ViewMode = "grid" | "reader";
type FilterKey = "all" | "favorite" | LibraryCategory;

const categories: Array<{ key: LibraryCategory; label: string; en: string }> = [
  { key: "comic", label: "漫画", en: "Comics" },
  { key: "text", label: "文本", en: "Text" },
  { key: "audio", label: "音频", en: "Audio" },
  { key: "video", label: "视频", en: "Video" },
  { key: "archive", label: "压缩包", en: "Archives" },
  { key: "other", label: "其它", en: "Other" }
];

function clampPage(item: LibraryItem, page: number): number {
  return Math.max(0, Math.min(page, item.pageCount - 1));
}

function pageLabel(page: number, count: number): string {
  if (count === 0) {
    return "外部打开";
  }
  return `${page + 1} / ${count}`;
}

function categoryLabel(category: LibraryCategory): string {
  return categories.find((item) => item.key === category)?.label ?? "其它";
}

function CategoryIcon({ category, size = 28 }: { category: LibraryCategory; size?: number }): JSX.Element {
  if (category === "comic") return <BookOpen size={size} />;
  if (category === "text") return <FileText size={size} />;
  if (category === "audio") return <Music size={size} />;
  if (category === "video") return <Video size={size} />;
  if (category === "archive") return <FileArchive size={size} />;
  return <FolderOpen size={size} />;
}

function fileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath;
}

function App(): JSX.Element {
  const [snapshot, setSnapshot] = useState<LibrarySnapshot>({
    items: [],
    stats: {
      items: 0,
      favorites: 0,
      pages: 0,
      categories: { comic: 0, text: 0, audio: 0, video: 0, archive: 0, other: 0 }
    },
    settings: { players: {} }
  });
  const [query, setQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [busy, setBusy] = useState(false);
  const [compressFolders, setCompressFolders] = useState(true);
  const [notice, setNotice] = useState("导入文件夹后会自动分类；视频、音频和文本会用外部程序打开。");

  const selectedItem = useMemo(
    () => snapshot.items.find((item) => item.id === selectedItemId) ?? null,
    [selectedItemId, snapshot.items]
  );

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return snapshot.items.filter((item) => {
      const matchesFilter = filter === "all" || (filter === "favorite" ? item.favorite : item.category === filter);
      const matchesQuery = !keyword || `${item.title} ${item.sourcePath}`.toLowerCase().includes(keyword);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, snapshot.items]);

  useEffect(() => {
    void refreshLibrary();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!selectedItem || viewMode !== "reader") {
        return;
      }
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        void goToPage(selectedItem.currentPage + 1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void goToPage(selectedItem.currentPage - 1);
      }
      if (event.key === "Escape") {
        setViewMode("grid");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedItem, viewMode]);

  async function refreshLibrary(): Promise<void> {
    const data = await window.comicShelf.getLibrary();
    setSnapshot(data);
    if (data.items.length > 0) {
      setNotice("资料库已就绪，可以搜索、筛选分类或查看收藏。");
    }
  }

  function updateItems(items: LibraryItem[]): void {
    setSnapshot((current) => ({
      ...current,
      items,
      stats: {
        items: items.length,
        favorites: items.filter((item) => item.favorite).length,
        pages: items.reduce((sum, item) => sum + item.pageCount, 0),
        categories: categories.reduce(
          (result, category) => ({
            ...result,
            [category.key]: items.filter((item) => item.category === category.key).length
          }),
          { comic: 0, text: 0, audio: 0, video: 0, archive: 0, other: 0 } as Record<LibraryCategory, number>
        )
      }
    }));
  }

  async function importFolders(): Promise<void> {
    setBusy(true);
    try {
      const result = await window.comicShelf.importFolders();
      updateItems(result.items);
      setNotice(`文件夹导入完成：新增 ${result.added} 项，更新 ${result.updated} 项，跳过 ${result.skipped} 项。`);
    } finally {
      setBusy(false);
    }
  }

  async function importArchives(): Promise<void> {
    setBusy(true);
    try {
      const result = await window.comicShelf.importArchives();
      updateItems(result.items);
      setNotice(`压缩包导入完成：新增 ${result.added} 项，更新 ${result.updated} 项，跳过 ${result.skipped} 项。`);
    } finally {
      setBusy(false);
    }
  }

  async function openItem(item: LibraryItem): Promise<void> {
    if (item.category !== "comic" || item.pageCount === 0) {
      const data = await window.comicShelf.openExternal(item.id);
      setSnapshot(data);
      setNotice(`已用${snapshot.settings.players[item.category] ? "自定义播放器" : "系统默认程序"}打开《${item.title}》。`);
      return;
    }

    setSelectedItemId(item.id);
    setViewMode("reader");
    const updated = await window.comicShelf.updateProgress(item.id, item.currentPage);
    if (updated) {
      setSnapshot((current) => ({
        ...current,
        items: current.items.map((entry) => (entry.id === updated.id ? updated : entry))
      }));
    }
  }

  async function goToPage(page: number): Promise<void> {
    if (!selectedItem) {
      return;
    }

    const updated = await window.comicShelf.updateProgress(selectedItem.id, clampPage(selectedItem, page));
    if (updated) {
      setSnapshot((current) => ({
        ...current,
        items: current.items.map((entry) => (entry.id === updated.id ? updated : entry))
      }));
    }
  }

  async function toggleFavorite(item: LibraryItem): Promise<void> {
    const data = await window.comicShelf.toggleFavorite(item.id);
    setSnapshot(data);
    setNotice(item.favorite ? `已取消收藏《${item.title}》。` : `已收藏《${item.title}》。`);
  }

  async function removeItem(item: LibraryItem): Promise<void> {
    const next = await window.comicShelf.removeItem(item.id);
    setSnapshot(next);
    if (selectedItemId === item.id) {
      setSelectedItemId(null);
      setViewMode("grid");
    }
    setNotice(`已从库中移除《${item.title}》。原始文件不会被删除。`);
  }

  async function setPlayer(category: LibraryCategory): Promise<void> {
    const settings = await window.comicShelf.setPlayer(category);
    setSnapshot((current) => ({ ...current, settings }));
    setNotice(`${categoryLabel(category)}的外部播放器已更新。`);
  }

  async function clearPlayer(category: LibraryCategory): Promise<void> {
    const settings = await window.comicShelf.clearPlayer(category);
    setSnapshot((current) => ({ ...current, settings }));
    setNotice(`${categoryLabel(category)}已恢复为 Windows 默认打开方式。`);
  }

  async function organizeComics(): Promise<void> {
    setBusy(true);
    try {
      const result = await window.comicShelf.organizeComics(compressFolders);
      updateItems(result.items);
      if (!result.destinationPath) {
        setNotice("已取消整理漫画。");
        return;
      }
      setNotice(
        `整理完成：移动 ${result.moved} 项，压缩 ${result.compressed} 项，跳过 ${result.skipped} 项。目标：${result.destinationPath}`
      );
    } finally {
      setBusy(false);
    }
  }

  function playerText(settings: AppSettings, category: LibraryCategory): string {
    return settings.players[category] ? fileName(settings.players[category]!) : "Windows 默认";
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Library size={22} />
          </div>
          <div>
            <h1>Offline Library</h1>
            <p>离线漫画与资料库</p>
          </div>
        </div>

        <div className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题或路径" />
        </div>

        <div className="actions">
          <button onClick={importFolders} disabled={busy}>
            <FolderPlus size={18} />
            <span>导入文件夹</span>
          </button>
          <button onClick={importArchives} disabled={busy}>
            <PackagePlus size={18} />
            <span>导入 CBZ / ZIP</span>
          </button>
        </div>

        <nav className="filters" aria-label="Library filters">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
            <Library size={17} />
            <span>全部</span>
            <strong>{snapshot.stats.items}</strong>
          </button>
          <button className={filter === "favorite" ? "active" : ""} onClick={() => setFilter("favorite")}>
            <Heart size={17} />
            <span>收藏</span>
            <strong>{snapshot.stats.favorites}</strong>
          </button>
          {categories.map((category) => (
            <button
              className={filter === category.key ? "active" : ""}
              key={category.key}
              onClick={() => setFilter(category.key)}
            >
              <CategoryIcon category={category.key} size={17} />
              <span>{category.label}</span>
              <strong>{snapshot.stats.categories[category.key]}</strong>
            </button>
          ))}
        </nav>

        <section className="player-settings">
          <div className="settings-title">
            <Settings size={16} />
            <span>外部播放器</span>
          </div>
          {categories
            .filter((category) => category.key !== "comic")
            .map((category) => (
              <div className="player-row" key={category.key}>
                <span>{category.label}</span>
                <small title={snapshot.settings.players[category.key] ?? "Windows 默认"}>
                  {playerText(snapshot.settings, category.key)}
                </small>
                <button title="选择播放器" onClick={() => void setPlayer(category.key)}>
                  <FolderOpen size={15} />
                </button>
                <button title="恢复默认" onClick={() => void clearPlayer(category.key)}>
                  <X size={15} />
                </button>
              </div>
            ))}
        </section>

        <section className="organize-panel">
          <div className="settings-title">
            <Shield size={16} />
            <span>管理员整理</span>
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={compressFolders}
              onChange={(event) => setCompressFolders(event.target.checked)}
            />
            <span>文件夹漫画压缩为 CBZ</span>
          </label>
          <button className="admin-button" onClick={() => void window.comicShelf.relaunchAsAdmin()} disabled={busy}>
            <Shield size={16} />
            <span>管理员模式重启</span>
          </button>
          <button className="organize-button" onClick={() => void organizeComics()} disabled={busy}>
            <FolderOpen size={16} />
            <span>整理已导入漫画</span>
          </button>
        </section>

        <p className="notice">{notice}</p>
      </aside>

      {viewMode === "grid" && (
        <section className="library-view">
          <header className="topbar">
            <div>
              <h2>{filter === "favorite" ? "收藏" : filter === "all" ? "资料库" : categoryLabel(filter)}</h2>
              <p>{filteredItems.length} 项可见</p>
            </div>
          </header>

          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={42} />
              <h2>还没有可显示的内容</h2>
              <p>导入一个混合文件夹，应用会自动识别漫画、文本、音频、视频和其它文件。</p>
            </div>
          ) : (
            <div className="book-grid">
              {filteredItems.map((item) => (
                <article className={`book-card category-${item.category}`} key={item.id}>
                  <button className="cover-button" onClick={() => void openItem(item)}>
                    {item.coverPath ? (
                      <img src={window.comicShelf.assetUrl(item.coverPath)} alt={item.title} loading="lazy" />
                    ) : (
                      <div className="missing-cover">
                        <CategoryIcon category={item.category} size={38} />
                      </div>
                    )}
                    {item.favorite && <Star className="favorite-badge" size={19} fill="currentColor" />}
                  </button>
                  <div className="book-meta">
                    <div className="meta-line">
                      <span>{categoryLabel(item.category)}</span>
                      <span>{pageLabel(item.currentPage, item.pageCount)}</span>
                    </div>
                    <h3 title={item.title}>{item.title}</h3>
                  </div>
                  <div className="book-tools">
                    <button title={item.favorite ? "取消收藏" : "收藏"} onClick={() => void toggleFavorite(item)}>
                      <Heart size={16} fill={item.favorite ? "currentColor" : "none"} />
                    </button>
                    <button title="打开或阅读" onClick={() => void openItem(item)}>
                      <Play size={16} />
                    </button>
                    <button title="打开所在位置" onClick={() => void window.comicShelf.revealInExplorer(item.sourcePath)}>
                      <FolderOpen size={16} />
                    </button>
                    <button title="从库中移除" onClick={() => void removeItem(item)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {viewMode === "reader" && selectedItem && (
        <section className="reader-view">
          <header className="reader-bar">
            <button title="返回资料库" onClick={() => setViewMode("grid")}>
              <X size={19} />
            </button>
            <div>
              <h2>{selectedItem.title}</h2>
              <p>{pageLabel(selectedItem.currentPage, selectedItem.pageCount)}</p>
            </div>
            <div className="reader-actions">
              <button title="上一页" onClick={() => void goToPage(selectedItem.currentPage - 1)}>
                <ChevronLeft size={20} />
              </button>
              <input
                type="range"
                min={0}
                max={Math.max(0, selectedItem.pageCount - 1)}
                value={selectedItem.currentPage}
                onChange={(event) => void goToPage(Number(event.target.value))}
              />
              <button title="下一页" onClick={() => void goToPage(selectedItem.currentPage + 1)}>
                <ChevronRight size={20} />
              </button>
            </div>
          </header>

          <div className="page-stage">
            <button className="page-hitbox left" title="上一页" onClick={() => void goToPage(selectedItem.currentPage - 1)} />
            <img
              src={window.comicShelf.assetUrl(selectedItem.pagePaths[selectedItem.currentPage])}
              alt={`${selectedItem.title} page ${selectedItem.currentPage + 1}`}
            />
            <button className="page-hitbox right" title="下一页" onClick={() => void goToPage(selectedItem.currentPage + 1)} />
          </div>
        </section>
      )}
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
