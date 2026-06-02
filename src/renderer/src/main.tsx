import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  ImageOff,
  Library,
  PackagePlus,
  Search,
  Trash2,
  X
} from "lucide-react";
import type { ComicBook, LibrarySnapshot } from "../../shared/types";
import "./styles.css";

type ViewMode = "grid" | "reader";

function clampPage(book: ComicBook, page: number): number {
  return Math.max(0, Math.min(page, book.pageCount - 1));
}

function pageLabel(page: number, count: number): string {
  if (count === 0) {
    return "0 / 0";
  }
  return `${page + 1} / ${count}`;
}

function App(): JSX.Element {
  const [snapshot, setSnapshot] = useState<LibrarySnapshot>({ books: [], stats: { books: 0, pages: 0 } });
  const [query, setQuery] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("导入文件夹或 CBZ 后会在这里生成离线漫画库。");

  const selectedBook = useMemo(
    () => snapshot.books.find((book) => book.id === selectedBookId) ?? null,
    [selectedBookId, snapshot.books]
  );

  const filteredBooks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return snapshot.books;
    }
    return snapshot.books.filter((book) => {
      return `${book.title} ${book.sourcePath}`.toLowerCase().includes(keyword);
    });
  }, [query, snapshot.books]);

  useEffect(() => {
    void refreshLibrary();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!selectedBook || viewMode !== "reader") {
        return;
      }
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        void goToPage(selectedBook.currentPage + 1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void goToPage(selectedBook.currentPage - 1);
      }
      if (event.key === "Escape") {
        setViewMode("grid");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedBook, viewMode]);

  async function refreshLibrary(): Promise<void> {
    const data = await window.comicShelf.getLibrary();
    setSnapshot(data);
    if (data.books.length > 0) {
      setNotice("漫画库已就绪，可以搜索标题或路径。");
    }
  }

  async function importFolders(): Promise<void> {
    setBusy(true);
    try {
      const result = await window.comicShelf.importFolders();
      setSnapshot({ books: result.books, stats: { books: result.books.length, pages: result.books.reduce((sum, book) => sum + book.pageCount, 0) } });
      setNotice(`文件夹导入完成：新增 ${result.added} 本，更新 ${result.updated} 本，跳过 ${result.skipped} 项。`);
    } finally {
      setBusy(false);
    }
  }

  async function importArchives(): Promise<void> {
    setBusy(true);
    try {
      const result = await window.comicShelf.importArchives();
      setSnapshot({ books: result.books, stats: { books: result.books.length, pages: result.books.reduce((sum, book) => sum + book.pageCount, 0) } });
      setNotice(`CBZ 导入完成：新增 ${result.added} 本，更新 ${result.updated} 本，跳过 ${result.skipped} 项。`);
    } finally {
      setBusy(false);
    }
  }

  async function openBook(book: ComicBook): Promise<void> {
    setSelectedBookId(book.id);
    setViewMode("reader");
    const updated = await window.comicShelf.updateProgress(book.id, book.currentPage);
    if (updated) {
      setSnapshot((current) => ({
        ...current,
        books: current.books.map((item) => (item.id === updated.id ? updated : item))
      }));
    }
  }

  async function goToPage(page: number): Promise<void> {
    if (!selectedBook) {
      return;
    }

    const updated = await window.comicShelf.updateProgress(selectedBook.id, clampPage(selectedBook, page));
    if (updated) {
      setSnapshot((current) => ({
        ...current,
        books: current.books.map((item) => (item.id === updated.id ? updated : item))
      }));
    }
  }

  async function removeBook(book: ComicBook): Promise<void> {
    const next = await window.comicShelf.removeBook(book.id);
    setSnapshot(next);
    if (selectedBookId === book.id) {
      setSelectedBookId(null);
      setViewMode("grid");
    }
    setNotice(`已从库中移除《${book.title}》。原始文件不会被删除。`);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Library size={22} />
          </div>
          <div>
            <h1>Offline Comic Shelf</h1>
            <p>本地漫画库</p>
          </div>
        </div>

        <div className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索漫画标题或路径" />
        </div>

        <div className="actions">
          <button onClick={importFolders} disabled={busy}>
            <FolderPlus size={18} />
            <span>导入文件夹</span>
          </button>
          <button onClick={importArchives} disabled={busy}>
            <PackagePlus size={18} />
            <span>导入 CBZ</span>
          </button>
        </div>

        <div className="stats">
          <div>
            <strong>{snapshot.stats.books}</strong>
            <span>本漫画</span>
          </div>
          <div>
            <strong>{snapshot.stats.pages}</strong>
            <span>张页面</span>
          </div>
        </div>

        <p className="notice">{notice}</p>
      </aside>

      {viewMode === "grid" && (
        <section className="library-view">
          <header className="topbar">
            <div>
              <h2>{query ? "搜索结果" : "漫画书架"}</h2>
              <p>{filteredBooks.length} 本可见</p>
            </div>
          </header>

          {filteredBooks.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={42} />
              <h2>还没有可显示的漫画</h2>
              <p>导入包含图片的文件夹，或选择 .cbz / .zip 漫画压缩包。</p>
            </div>
          ) : (
            <div className="book-grid">
              {filteredBooks.map((book) => (
                <article className="book-card" key={book.id}>
                  <button className="cover-button" onClick={() => void openBook(book)}>
                    {book.coverPath ? (
                      <img src={window.comicShelf.assetUrl(book.coverPath)} alt={book.title} loading="lazy" />
                    ) : (
                      <div className="missing-cover">
                        <ImageOff size={34} />
                      </div>
                    )}
                  </button>
                  <div className="book-meta">
                    <h3 title={book.title}>{book.title}</h3>
                    <p>{pageLabel(book.currentPage, book.pageCount)}</p>
                  </div>
                  <div className="book-tools">
                    <button title="打开所在位置" onClick={() => void window.comicShelf.revealInExplorer(book.sourcePath)}>
                      <FolderPlus size={16} />
                    </button>
                    <button title="从库中移除" onClick={() => void removeBook(book)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {viewMode === "reader" && selectedBook && (
        <section className="reader-view">
          <header className="reader-bar">
            <button title="返回书架" onClick={() => setViewMode("grid")}>
              <X size={19} />
            </button>
            <div>
              <h2>{selectedBook.title}</h2>
              <p>{pageLabel(selectedBook.currentPage, selectedBook.pageCount)}</p>
            </div>
            <div className="reader-actions">
              <button title="上一页" onClick={() => void goToPage(selectedBook.currentPage - 1)}>
                <ChevronLeft size={20} />
              </button>
              <input
                type="range"
                min={0}
                max={Math.max(0, selectedBook.pageCount - 1)}
                value={selectedBook.currentPage}
                onChange={(event) => void goToPage(Number(event.target.value))}
              />
              <button title="下一页" onClick={() => void goToPage(selectedBook.currentPage + 1)}>
                <ChevronRight size={20} />
              </button>
            </div>
          </header>

          <div className="page-stage">
            <button className="page-hitbox left" title="上一页" onClick={() => void goToPage(selectedBook.currentPage - 1)} />
            <img
              src={window.comicShelf.assetUrl(selectedBook.pagePaths[selectedBook.currentPage])}
              alt={`${selectedBook.title} page ${selectedBook.currentPage + 1}`}
            />
            <button className="page-hitbox right" title="下一页" onClick={() => void goToPage(selectedBook.currentPage + 1)} />
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
