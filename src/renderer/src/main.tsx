import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.js?url";
import {
  BookOpen,
  CheckSquare,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileArchive,
  FileImage,
  FileText,
  FolderOpen,
  FolderPlus,
  Github,
  Heart,
  HelpCircle,
  Library,
  Tags,
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
  Square,
  Star,
  Trash2,
  Video,
  X
} from "lucide-react";
import type {
  AppLanguage,
  AppSettings,
  DocumentKind,
  ImportProgress,
  LibraryCategory,
  LibraryItem,
  LibrarySnapshot,
  LibrarySortKey
} from "../../shared/types";
import "./styles.css";
import taoImage from "./assets/tao.jpg";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type ViewMode = "grid" | "reader" | "viewer" | "help";
type FilterKey = "all" | "favorite" | LibraryCategory;
type FitMode = "page" | "width" | "actual";
type DisplayMode = "paged" | "scroll";
type TextTheme = {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontFamily: string;
  textColor: string;
  pageColor: string;
  backgroundColor: string;
};
type EditorDialog =
  | { kind: "rename"; item: LibraryItem; value: string }
  | { kind: "collection"; itemIds: string[]; value: string };

const categoryKeys: LibraryCategory[] = ["comic", "image", "text", "audio", "video", "series", "archive", "other"];
const documentKinds: DocumentKind[] = ["plain", "pdf", "word", "ebook"];
const gridColumnOptions = [4, 5, 6] as const;
const defaultTextTheme: TextTheme = {
  fontSize: 18,
  lineHeight: 1.8,
  letterSpacing: 0,
  fontFamily: "system",
  textColor: "#e7e1d8",
  pageColor: "#17191c",
  backgroundColor: "#0f1114"
};
const archiveCategoryFolders: Record<LibraryCategory, string> = {
  comic: "Comics",
  image: "Images",
  text: "Text",
  audio: "Audio",
  video: "Video",
  series: "Series",
  archive: "Archives",
  other: "Other"
};

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
    documentPlayers: "文档打开方式",
    documentPlain: "TXT / Markdown",
    documentPdf: "PDF",
    documentWord: "Word",
    documentEbook: "电子书",
    internalDocumentFallback: "系统默认程序无法打开时，会使用内置文档查看器。",
    unsupportedDocument: "这个文档格式只能使用系统默认程序或外部程序打开。",
    windowsDefault: "内置/系统默认",
    choosePlayer: "选择播放器",
    clearDefault: "恢复默认",
    adminTools: "资源工具",
    compressComicFolders: "文件夹漫画压缩为 CBZ",
    relaunchAdmin: "管理员模式重启",
    organizeImported: "压缩/归档已导入资源",
    autoOrganize: "归档并分类已导入资源",
    chooseArchiveFolder: "选择归档目录",
    archiveFolder: "归档目录",
    archiveConfirm: "将处理以下新资源，已在归档目录内的资源会跳过。是否继续？",
    noNewArchiveItems: "没有需要归档的新资源。",
    organizeWarning:
      "这个操作会移动当前库中已导入资源的原始文件/文件夹到你接下来选择的新目录，并按分类放入子文件夹。旧位置的文件会被移走。请确认没有其它程序正在使用这些文件。",
    compressWarning:
      "压缩模式会把文件夹漫画压缩为 CBZ，压缩成功后删除原漫画文件夹。视频、音频、文本通常已经压缩，不会强行二次压缩。",
    clearLibrary: "清空库",
    clearConfirm: "确定清空库吗？这不会删除你的原始文件，只会清空应用里的索引和缓存。",
    help: "使用方法",
    github: "GitHub",
    quitApp: "退出软件",
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
    tagEditor: "编辑标签",
    save: "保存",
    cancel: "取消",
    allTags: "全部标签",
    coverCache: "封面缓存",
    enableCache: "启用封面缓存",
    disableCache: "关闭并清除缓存",
    chooseCacheFolder: "选择缓存目录",
    cacheFolder: "缓存目录",
    cacheHint: "默认关闭。开启后会占用少量内存/磁盘来加快封面预览。",
    highPerformance: "高性能模式",
    enableHighPerformance: "启用高性能模式",
    disableHighPerformance: "关闭高性能模式",
    rememberProgress: "记忆阅读进度",
    enableRememberProgress: "开启记忆功能",
    disableRememberProgress: "关闭记忆功能",
    rememberProgressHint: "开启后会记住图片集页码、文本滚动位置、视频和音频播放进度。",
    preloadAll: "预加载全部内容",
    preloadingAll: "正在预加载全部内容",
    highPerformanceHint: "如果导入超过几千个文件，建议开启。它会使用更多内存和封面缓存，书架会按批次显示来保持流畅。",
    page: "页",
    jumpPage: "跳转页",
    nextPage: "下一页",
    prevPage: "上一页",
    fitPage: "适应页面",
    fitWidth: "适应宽度",
    actualSize: "原始大小",
    pureMode: "纯阅读",
    exitPure: "退出纯阅读",
    externalOpen: "使用外部程序打开",
    internalViewer: "内置查看器",
    columnsPerRow: "每排数量",
    displayMode: "显示模式",
    pagedMode: "翻页",
    scrollMode: "滚动",
    episode: "剧集",
    editorMode: "编辑者模式",
    exitEditorMode: "退出编辑",
    selectedCount: "已选择",
    selectAll: "全选当前页",
    clearSelection: "清除选择",
    renameSelected: "重命名",
    createComicFromImages: "选中图片新建漫画",
    deleteSelectedFiles: "删除选中文件",
    renamePrompt: "输入新名称。这个操作会同时重命名外部文件或文件夹。",
    newComicPrompt: "输入新漫画文件夹名称。选中的图片会被移动到这个新文件夹里。",
    deleteFilesConfirm: "确定删除选中的外部文件/文件夹吗？这个操作会从磁盘删除，不只是从库中移除。",
    editorOnlyImages: "请先在图片分类中选择至少一张图片。",
    editorDone: "编辑完成，外部文件已经同步更新。",
    author: "作者",
    githubPrompt: "是否打开 GitHub 项目页面？",
    languageSetting: "界面语言",
    editorOff: "关闭",
    editorOn: "开启",
    pageFileName: "图片文件名",
    pinReference: "作为参考图",
    textSettings: "文本设置",
    fontSize: "字号",
    lineHeight: "行距",
    letterSpacing: "字距",
    importFont: "导入字体",
    textColor: "文字",
    pageColor: "页面",
    backgroundColor: "背景",
    referenceImage: "参考图",
    referenceWidth: "宽度",
    referenceHeight: "高度",
    keepRatio: "锁定比例",
    freeRatio: "自由比例",
    closeReference: "关闭参考图",
    helpText:
      "导入文件夹：选择一个漫画文件夹或混合资料文件夹。多张图片组成的文件夹会被识别为漫画；散落单图会归入图片分类；文本、音频、视频、压缩包会自动归类。导入 CBZ / ZIP：用于导入漫画压缩包，应用会解包到缓存用于阅读。搜索：会匹配标题、原始路径和标签。排序：可按 A-Z、Z-A、最新导入、最早导入、最近打开排列。收藏：点爱心后会出现在收藏筛选中。标签：点卡片上的标签按钮，输入逗号分隔的标签，例如 已读, 喜欢, 作者名；之后可以用顶部 Tag 下拉筛选。每排数量：可以选择每行 4、5 或 6 个卡片；显示模式可以在翻页和滚动之间切换，文件很多时建议使用翻页和较少卡片。视频和电视剧：书架卡片会显示轻量视频预览，电视剧会使用第一集预览，打开后可以在内置播放器里选集。阅读器：方向键或空格翻页，第一页/最后一页按钮快速跳转，缩放和适应模式用于不同图片比例。全屏阅读会隐藏侧边栏、顶部工具栏和系统菜单。外部播放器：如果检测到 VLC、PotPlayer、Windows Media Player、SumatraPDF 等会自动使用，也可以手动指定。清空库：只清空应用索引和缓存，不删除原始文件。整理已导入资源：会把库里已导入的原始文件移动到你选择的新目录并按分类归档；压缩模式会把文件夹漫画压缩为 CBZ。归档并分类已导入资源：这是大型整理操作，会移动库中所有已导入资源到新目录下的 Comics、Images、Text、Audio、Video、Archives、Other，请务必先确认目标目录。",
    categories: {
      comic: "漫画",
      image: "图片",
      text: "文本",
      audio: "音频",
      video: "视频",
      series: "电视剧",
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
    documentPlayers: "Document Openers",
    documentPlain: "TXT / Markdown",
    documentPdf: "PDF",
    documentWord: "Word",
    documentEbook: "Ebook",
    internalDocumentFallback: "If the system default app cannot open it, the built-in document viewer is used.",
    unsupportedDocument: "This document format needs the system default app or an external program.",
    windowsDefault: "Built-in / system default",
    choosePlayer: "Choose player",
    clearDefault: "Clear player",
    adminTools: "Resource Tools",
    compressComicFolders: "Compress folder comics to CBZ",
    relaunchAdmin: "Relaunch as Admin",
    organizeImported: "Compress / Archive Imported Resources",
    autoOrganize: "Archive and Classify Imported Resources",
    chooseArchiveFolder: "Choose archive folder",
    archiveFolder: "Archive folder",
    archiveConfirm: "The following new resources will be processed. Items already inside the archive folder will be skipped. Continue?",
    noNewArchiveItems: "No new resources need archiving.",
    organizeWarning:
      "This will move original files/folders already imported in the library to a new folder you choose next, placing them into category subfolders. Files will be moved away from their old locations. Make sure no other app is using them.",
    compressWarning:
      "Compression mode converts folder-based comics to CBZ and removes the original comic folder after success. Video, audio, and text are usually already compressed and will not be recompressed.",
    clearLibrary: "Clear Library",
    clearConfirm: "Clear the library? Original files will not be deleted; only the app index and cache will be reset.",
    help: "Help",
    github: "GitHub",
    quitApp: "Quit app",
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
    tagEditor: "Edit tags",
    save: "Save",
    cancel: "Cancel",
    allTags: "All tags",
    coverCache: "Cover cache",
    enableCache: "Enable cover cache",
    disableCache: "Disable and clear cache",
    chooseCacheFolder: "Choose cache folder",
    cacheFolder: "Cache folder",
    cacheHint: "Off by default. Enabling uses a little memory/disk space to speed up cover previews.",
    highPerformance: "High performance mode",
    enableHighPerformance: "Enable high performance",
    disableHighPerformance: "Disable high performance",
    rememberProgress: "Remember progress",
    enableRememberProgress: "Enable memory",
    disableRememberProgress: "Disable memory",
    rememberProgressHint: "When enabled, the app remembers image pages, text scroll position, and video/audio playback time.",
    preloadAll: "Preload all content",
    preloadingAll: "Preloading all content",
    highPerformanceHint: "Recommended when importing thousands of files. It uses more memory and cover cache, while rendering the shelf in batches for smoothness.",
    page: "Page",
    jumpPage: "Jump",
    nextPage: "Next page",
    prevPage: "Previous page",
    fitPage: "Fit page",
    fitWidth: "Fit width",
    actualSize: "Actual size",
    pureMode: "Pure reading",
    exitPure: "Exit pure mode",
    externalOpen: "Open externally",
    internalViewer: "Built-in viewer",
    columnsPerRow: "Per row",
    displayMode: "Mode",
    pagedMode: "Pages",
    scrollMode: "Scroll",
    episode: "Episode",
    editorMode: "Editor mode",
    exitEditorMode: "Exit editor",
    selectedCount: "Selected",
    selectAll: "Select current page",
    clearSelection: "Clear selection",
    renameSelected: "Rename",
    createComicFromImages: "Create image collection",
    deleteSelectedFiles: "Delete selected files",
    renamePrompt: "Enter a new name. This also renames the external file or folder.",
    newComicPrompt: "Enter the new image collection folder name. Selected images will be moved into that folder.",
    deleteFilesConfirm: "Delete the selected external files/folders from disk? This is not just removing them from the library.",
    editorOnlyImages: "Select at least one image item in the Images category first.",
    editorDone: "Edit complete. External files were updated too.",
    author: "Author",
    githubPrompt: "Open the GitHub project page?",
    languageSetting: "Language",
    editorOff: "Off",
    editorOn: "On",
    pageFileName: "Image file name",
    pinReference: "Use as reference",
    textSettings: "Text settings",
    fontSize: "Font",
    lineHeight: "Line",
    letterSpacing: "Spacing",
    importFont: "Import font",
    textColor: "Text",
    pageColor: "Page",
    backgroundColor: "Background",
    referenceImage: "Reference image",
    referenceWidth: "Width",
    referenceHeight: "Height",
    keepRatio: "Lock ratio",
    freeRatio: "Free ratio",
    closeReference: "Close reference",
    helpText:
      "Import Folder: choose a comic folder or mixed media folder. Folders with multiple images are treated as comics; loose images go to Images; text, audio, video, and archives are classified automatically. Import CBZ / ZIP: imports comic archives and extracts them to app cache for reading. Search: matches title, original path, and tags. Sort: choose A-Z, Z-A, newest import, oldest import, or recently opened. Favorites: click the heart to keep an item in Favorites. Tags: click the tag button on a card and enter comma-separated tags such as Read, Favorite, Author. Then use the Tag dropdown to filter. Per row: choose 4, 5, or 6 cards per row. Mode switches between page-style and scroll-style browsing; for huge libraries, use page mode and fewer cards. Video and Series: shelf cards show lightweight video previews; Series previews the first episode and opens with a built-in episode selector. Reader: Arrow keys or Space turn pages; first/last buttons jump quickly; zoom and fit modes handle different image ratios. Fullscreen reading hides the sidebar, toolbar, and native menu. External players: common players such as VLC, PotPlayer, Windows Media Player, and SumatraPDF are detected automatically, and manual selection is still available. Clear Library: resets only the app index and cache, not original files. Organize Imported Resources: moves original imported files into a new destination folder and category subfolders. Compression mode converts folder comics to CBZ. Archive and Classify Imported Resources is a large operation that moves all imported resources into Comics, Images, Text, Audio, Video, Archives, and Other, so confirm the destination carefully.",
    categories: {
      comic: "Image Collections",
      image: "Images",
      text: "Text",
      audio: "Audio",
      video: "Video",
      series: "Series",
      archive: "Archives",
      other: "Other"
    }
  }
};

const localizedCopy = {
  ...copy,
  zh: {
    ...copy.zh,
    compressComicFolders: "文件夹图片集压缩为 CBZ",
    createComicFromImages: "选中图片新建图片集",
    newComicPrompt: "输入新图片集文件夹名称。选中的图片会被移动到这个新文件夹里。",
    categories: {
      ...copy.zh.categories,
      comic: "图片集"
    }
  },
  ja: {
    ...copy.en,
    subtitle: "オフライン漫画とメディアライブラリ",
    importHint: "フォルダーを取り込むと自動分類します。外部プレイヤーがない場合は内蔵ビューアーを使います。",
    ready: "ライブラリの準備ができました。検索、分類、收藏から閲覧できます。",
    search: "タイトルまたはパスを検索",
    importFolder: "フォルダーを取り込む",
    importArchive: "CBZ / ZIP を取り込む",
    all: "すべて",
    favorite: "お気に入り",
    library: "ライブラリ",
    visible: "件を表示",
    noContent: "まだ内容がありません",
    noContentHint: "混在フォルダーを取り込むと、漫画、画像、テキスト、音声、動画などを自動判定します。",
    externalPlayers: "外部プレイヤー",
    documentPlayers: "文書を開くアプリ",
    documentPlain: "TXT / Markdown",
    documentPdf: "PDF",
    documentWord: "Word",
    documentEbook: "電子書籍",
    internalDocumentFallback: "システム既定アプリで開けない場合は内蔵文書ビューアーを使います。",
    unsupportedDocument: "この文書形式はシステム既定アプリまたは外部アプリが必要です。",
    windowsDefault: "内蔵 / システム既定",
    choosePlayer: "プレイヤーを選択",
    clearDefault: "既定に戻す",
    adminTools: "リソースツール",
    compressComicFolders: "フォルダー漫画を CBZ に圧縮",
    organizeImported: "取り込み済みリソースを圧縮 / 归档",
    autoOrganize: "取り込み済みリソースを归档して分類",
    chooseArchiveFolder: "归档フォルダーを選択",
    archiveFolder: "归档フォルダー",
    archiveConfirm: "次の新しいリソースを処理します。すでに归档フォルダー内にある項目はスキップします。続行しますか？",
    noNewArchiveItems: "归档が必要な新しいリソースはありません。",
    organizeWarning:
      "この操作は取り込み済みの外部ファイル/フォルダーを選択した保存先へ移動し、分類フォルダーへ整理します。古い場所からは移動されるため、他のアプリで開いていないことを確認してください。",
    compressWarning:
      "圧縮モードはフォルダー漫画を CBZ に変換し、成功後に元フォルダーを削除します。動画、音声、テキストは通常再圧縮しません。",
    clearLibrary: "ライブラリを空にする",
    clearConfirm: "ライブラリを空にしますか？元ファイルは削除せず、アプリ内の索引とキャッシュだけをリセットします。",
    help: "ヘルプ",
    quitApp: "アプリを終了",
    language: "中文 / English / 日本語",
    openOrRead: "開く / 読む",
    reveal: "場所を開く",
    remove: "ライブラリから削除",
    removeDone: "ライブラリから削除しました。元ファイルは削除していません。",
    favorited: "お気に入りに追加しました",
    unfavorited: "お気に入りから外しました",
    cancelled: "キャンセルしました。",
    clearDone: "ライブラリを空にしました。元ファイルは削除していません。",
    organizeDone: "整理が完了しました",
    moved: "移動",
    compressed: "圧縮",
    skipped: "スキップ",
    target: "保存先",
    source: "ソース",
    readerBack: "ライブラリへ戻る",
    prev: "前のページ",
    next: "次のページ",
    first: "最初のページ",
    last: "最後のページ",
    zoomIn: "拡大",
    zoomOut: "縮小",
    resetZoom: "ズームをリセット",
    fullscreen: "全画面読書",
    importingTitle: "処理中です。終了しないでください",
    elapsed: "経過",
    remaining: "残り目安",
    sort: "並び順",
    sortAz: "A から Z",
    sortZa: "Z から A",
    sortNewest: "新しい取り込み順",
    sortOldest: "古い取り込み順",
    sortRecent: "最近開いた順",
    editTags: "タグ編集",
    tagPrompt: "タグをカンマ区切りで入力",
    tagEditor: "タグ編集",
    save: "保存",
    cancel: "キャンセル",
    allTags: "すべてのタグ",
    coverCache: "表紙キャッシュ",
    enableCache: "表紙キャッシュを有効化",
    disableCache: "無効化してキャッシュ削除",
    chooseCacheFolder: "キャッシュフォルダーを選択",
    cacheFolder: "キャッシュフォルダー",
    cacheHint: "既定ではオフです。有効にすると少量のメモリ/ディスクを使って表紙表示を高速化します。",
    highPerformance: "高性能モード",
    enableHighPerformance: "高性能モードを有効化",
    disableHighPerformance: "高性能モードを無効化",
    preloadAll: "すべてをプリロード",
    preloadingAll: "プリロード中",
    highPerformanceHint: "数千件以上を取り込む場合に推奨します。メモリと表紙キャッシュを多めに使い、一覧を軽く表示します。",
    page: "ページ",
    jumpPage: "移動",
    nextPage: "次ページ",
    prevPage: "前ページ",
    fitPage: "ページに合わせる",
    fitWidth: "幅に合わせる",
    actualSize: "原寸",
    pureMode: "読書専用",
    exitPure: "読書専用を終了",
    externalOpen: "外部アプリで開く",
    internalViewer: "内蔵ビューアー",
    columnsPerRow: "1行の数",
    displayMode: "表示モード",
    pagedMode: "ページ",
    scrollMode: "スクロール",
    episode: "エピソード",
    editorMode: "編集者モード",
    exitEditorMode: "編集を終了",
    selectedCount: "選択中",
    selectAll: "現在ページを選択",
    clearSelection: "選択解除",
    renameSelected: "名前変更",
    createComicFromImages: "画像から漫画を作成",
    deleteSelectedFiles: "選択ファイルを削除",
    renamePrompt: "新しい名前を入力してください。外部ファイルまたはフォルダー名も同時に変更します。",
    newComicPrompt: "新しい漫画フォルダー名を入力してください。選択した画像をそのフォルダーへ移動します。",
    deleteFilesConfirm: "選択した外部ファイル/フォルダーをディスクから削除しますか？ライブラリから消すだけではありません。",
    editorOnlyImages: "先に画像カテゴリで画像項目を少なくとも1つ選択してください。",
    editorDone: "編集が完了しました。外部ファイルも更新しました。",
    author: "作者",
    githubPrompt: "GitHub プロジェクトページを開きますか？",
    languageSetting: "表示言語",
    editorOff: "オフ",
    editorOn: "オン",
    pageFileName: "画像ファイル名",
    pinReference: "参考画像にする",
    referenceImage: "参考画像",
    referenceWidth: "幅",
    referenceHeight: "高さ",
    keepRatio: "比率固定",
    freeRatio: "自由比率",
    closeReference: "参考画像を閉じる",
    helpText:
      "取り込み: フォルダー取り込みは混在フォルダーを走査し、複数画像のフォルダーを漫画、単独画像を画像、テキスト/音声/動画/圧縮ファイルを各分類へ入れます。\n閲覧: 漫画と画像は内蔵リーダーで開き、方向キー、スペース、前後ボタンでページ移動できます。ズーム、幅合わせ、全画面読書も使えます。\n一覧: 検索はタイトル、パス、タグを対象にします。並び順、タグ、カテゴリ、1行の表示数、ページ/スクロール表示を切り替えられます。大量ファイルではページ表示とプリロードがおすすめです。\n編集者モード: 上部の編集者モードをオンにすると複数選択できます。画像カテゴリで画像を選び「画像から漫画を作成」を押すと、実際の画像ファイルを新フォルダーへ移動し、新しい漫画として登録します。名前変更は外部ファイル/フォルダー名も変更します。削除はディスク上の実ファイルを削除するため確認してください。\n归档/圧縮: 归档フォルダーを設定すると新しい取り込み内容を分類フォルダーへ移動できます。圧縮はフォルダー漫画を CBZ に変換します。どちらも大きな操作なので、確認画面と進捗バーを見て完了を待ってください。\n外部プレイヤー: 動画、音声、テキストなどは検出済みプレイヤーまたは Windows 既定アプリで開けます。手動でプレイヤーを指定することもできます。\nキャッシュと高性能: 表紙キャッシュ、動画静止画、すべてをプリロードを使うと一覧表示が速くなります。容量を戻したい場合はキャッシュ削除を使います。\nトレイ: 閉じるとトレイへ最小化します。完全終了は左側の終了ボタンまたはトレイメニューから行います。",
    categories: {
      comic: "漫画",
      image: "画像",
      text: "テキスト",
      audio: "音声",
      video: "動画",
      series: "テレビ/シリーズ",
      archive: "圧縮ファイル",
      other: "その他"
    }
  }
};

localizedCopy.ja.createComicFromImages = "画像集を作成";
localizedCopy.ja.newComicPrompt = "新しい画像集フォルダー名を入力してください。選択した画像をそのフォルダーへ移動します。";
localizedCopy.ja.categories.comic = "画像集";
localizedCopy.ja.compressComicFolders = "フォルダー画像集を CBZ に圧縮";
localizedCopy.zh.categories.series = "视频集";
localizedCopy.zh.episode = "视频";
localizedCopy.en.categories.series = "Video Sets";
localizedCopy.en.episode = "Video";
localizedCopy.ja.categories.series = "動画集";
localizedCopy.ja.episode = "動画";
localizedCopy.ja.rememberProgress = "読書位置を記憶";
localizedCopy.ja.enableRememberProgress = "記憶をオン";
localizedCopy.ja.disableRememberProgress = "記憶をオフ";
localizedCopy.ja.rememberProgressHint = "画像集のページ、テキストのスクロール位置、動画と音声の再生位置を記憶します。";
localizedCopy.ja.textSettings = "テキスト設定";
localizedCopy.ja.fontSize = "文字サイズ";
localizedCopy.ja.lineHeight = "行間";
localizedCopy.ja.letterSpacing = "字間";
localizedCopy.ja.importFont = "フォント追加";
localizedCopy.ja.textColor = "文字";
localizedCopy.ja.pageColor = "ページ";
localizedCopy.ja.backgroundColor = "背景";

function helpParagraphs(language: AppLanguage): string[] {
  if (language === "en") {
    return [
      "Importing: Use Import Folder for normal folders or mixed folders. The app scans subfolders, treats image-heavy folders as comics, loose pictures as Images, multi-video folders as Series, and text/audio/video/archive files as their own categories. Use Import CBZ / ZIP when the comic is already compressed.",
      "Browsing: Search matches title, path, and tags. Category buttons filter the shelf. Favorites are toggled with the heart button. Sort can use A-Z, Z-A, newest import, oldest import, or recently opened. The Tag dropdown filters custom tags.",
      "Display performance: Per row controls how many cards appear on each row. Pages mode renders only the current page and is faster for huge libraries; Scroll mode behaves like the older continuous shelf. Preload all content loads covers and video still images in advance.",
      "Reading: Comics and images open in the built-in reader. Use arrow keys, Space, previous/next buttons, first/last buttons, the page slider, zoom, fit-to-page, fit-to-width, and fullscreen reading. Pure reading hides the sidebar and toolbar.",
      "Editor mode: Turn on Editor mode in the top bar, select cards, then rename one selected item, delete selected external files, or create a new comic from selected Images. These actions change the real files/folders on disk, not only the app database, so read the confirmation dialogs carefully.",
      "Tags: Click the tag button on a card, enter comma-separated tags, and save. Tags stay in the app library and can be used for filtering, for example Read, Favorite, Artist, or Series.",
      "Archive and compression: Choose an archive folder first if you want a fixed destination. Compress / Archive Imported Resources can move imported items into category folders and optionally convert folder comics into CBZ. Archive and Classify Imported Resources is a larger move operation and shows progress.",
      "Players and viewers: If an external player is detected or manually selected, the app can open video/audio/text with that player. Otherwise it uses the built-in viewer or Windows default app. Reveal opens the file location in Explorer.",
      "Cache and high performance: Cover cache stores WebP-like cover previews and video stills for faster loading. High performance mode enables more caching. Clear cache removes generated previews only; Clear Library resets the app index without deleting original files.",
      "Tray and exit: Closing the window minimizes to the system tray. Use Quit app in the sidebar or the tray menu when you want to fully exit."
    ];
  }

  if (language === "ja") {
    return localizedCopy.ja.helpText.split("\n");
  }

  return [
    "导入：导入文件夹适合普通漫画文件夹和混合大文件夹。软件会扫描子文件夹，把图片数量很多的文件夹识别成漫画，把散落的单张图片放进图片分类，把多集视频文件夹识别成电视剧/系列，把文本、音频、视频、压缩包放进对应分类。导入 CBZ / ZIP 用来导入已经压缩好的漫画包。",
    "浏览：搜索会匹配标题、文件路径和 tag。左侧分类按钮可以只看漫画、图片、文本、音频、视频、电视剧、压缩包或收藏。爱心按钮用于收藏。排序支持 A-Z、Z-A、最新导入、最早导入、最近打开。Tag 下拉框可以按自定义标签筛选。",
    "显示和性能：每排数量可以控制一行显示多少卡片。翻页模式只渲染当前页，文件很多时更快；滚动模式是连续书架。预加载全部内容会提前加载封面和视频静态预览，减少翻页时卡顿。",
    "阅读：漫画和图片会进入内置阅读器。可以用方向键、空格、上一页/下一页、第一页/最后一页、滑条、缩放、适应页面、适应宽度。全屏阅读会隐藏侧边栏和顶部工具栏，纯阅读模式更适合连续看漫画。",
    "编辑者模式：在顶端打开编辑者模式后，可以批量选择卡片。选择一个项目可以重命名；选择图片分类里的散图后可以新建成一个漫画文件夹；也可以删除选中的外部文件。注意这些操作会同步修改磁盘上的真实文件/文件夹，不只是修改软件内部索引，所以请确认弹窗内容。",
    "Tag：点击卡片上的标签按钮，输入用逗号分隔的标签并保存。之后可以在顶部 Tag 下拉框筛选，例如 已读、喜欢、作者名、系列名。",
    "归档和压缩：先选择归档目录可以固定保存位置。压缩/归档已导入资源会把资源移动到分类文件夹中，勾选压缩时会把文件夹漫画转成 CBZ。归档并分类已导入资源是大型移动操作，会显示进度条，建议等待完成后再关闭软件。",
    "播放器：视频、音频、文本等可以使用自动检测到的外部播放器，也可以手动指定播放器。如果没有外部播放器，软件会使用内置查看器或 Windows 默认程序。打开所在位置会在资源管理器中定位文件。",
    "缓存和高性能：封面缓存会保存更快读取的封面和视频静态预览；高性能模式会启用更多缓存。清除缓存只删除生成的预览，不删除原始文件。清空库只重置软件索引，不删除磁盘文件。",
    "托盘和退出：关闭窗口会最小化到系统托盘。需要完全退出时，用左侧退出软件按钮，或托盘菜单里的退出。"
  ];
}

function defaultSnapshot(): LibrarySnapshot {
  return {
    items: [],
    stats: {
      items: 0,
      favorites: 0,
      pages: 0,
      categories: { comic: 0, image: 0, text: 0, audio: 0, video: 0, series: 0, archive: 0, other: 0 }
    },
    settings: {
      players: {},
      documentPlayers: {},
      internalPlayerCategories: [],
      internalDocumentKinds: [],
      detectedPlayers: {},
      language: "zh",
      coverCacheEnabled: false,
      coverCacheDirectory: null,
      archiveDirectory: null,
      scannedArchiveDirectories: [],
      highPerformanceMode: false,
      rememberProgressEnabled: true
    }
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
  if (category === "series") return <Video size={size} />;
  if (category === "archive") return <FileArchive size={size} />;
  return <FolderOpen size={size} />;
}

function fileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath;
}

function extensionOf(filePath: string): string {
  const name = fileName(filePath).toLowerCase();
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index) : "";
}

function documentKindForPath(filePath: string): DocumentKind {
  const extension = extensionOf(filePath);
  if ([".txt", ".md", ".markdown"].includes(extension)) return "plain";
  if (extension === ".pdf") return "pdf";
  if ([".doc", ".docx"].includes(extension)) return "word";
  return "ebook";
}

function documentTypeSuffix(filePath: string): string {
  const extension = extensionOf(filePath);
  if (extension === ".pdf") return "PDF";
  if ([".doc", ".docx"].includes(extension)) return "Word";
  if ([".txt"].includes(extension)) return "TXT";
  if ([".md", ".markdown"].includes(extension)) return "Markdown";
  if ([".epub", ".mobi", ".azw3"].includes(extension)) return extension.slice(1).toUpperCase();
  return "Document";
}

function isInsidePath(parentPath: string, childPath: string): boolean {
  const normalizedParent = parentPath.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  const normalizedChild = childPath.replace(/\\/g, "/").toLowerCase();
  return normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}/`);
}

function isInsideArchive(item: LibraryItem, archiveDirectory: string | null): boolean {
  if (!archiveDirectory) return false;
  if (!isInsidePath(archiveDirectory, item.sourcePath)) return false;
  if (isInsidePath(`${archiveDirectory}/${archiveCategoryFolders[item.category]}`, item.sourcePath)) return true;
  const relativePath = item.sourcePath.replace(/\\/g, "/").slice(archiveDirectory.replace(/\\/g, "/").replace(/\/+$/, "").length + 1);
  const firstFolder = relativePath.split("/")[0];
  return Object.values(archiveCategoryFolders).includes(firstFolder);
}

function previewVideoPath(item: LibraryItem): string | null {
  if (item.category === "video") return item.sourcePath;
  if (item.category === "series") return item.files.find((file) => file.category === "video")?.path ?? null;
  return null;
}

function VideoCoverPreview({ item }: { item: LibraryItem }): JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const sourcePath = previewVideoPath(item);

  function seekPreviewFrame(): void {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const targetTime = Math.min(Math.max(1, video.duration * 0.08), Math.max(0.1, video.duration - 0.1));
    if (Math.abs(video.currentTime - targetTime) > 0.25) {
      video.currentTime = targetTime;
    }
  }

  function playPreview(): void {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => undefined);
  }

  function pausePreview(): void {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
  }

  if (!sourcePath) {
    return (
      <div className="missing-cover video-cover">
        <Video size={38} />
      </div>
    );
  }

  return (
    <div className="video-preview-shell" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {item.videoCoverPath ? (
        <img src={window.comicShelf.assetUrl(item.videoCoverPath)} alt={item.title} loading="lazy" />
      ) : (
        <div className="missing-cover video-cover">
          <Video size={38} />
        </div>
      )}
      {hovered && (
        <video
          ref={videoRef}
          className="cover-video"
          src={window.comicShelf.assetUrl(sourcePath)}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={seekPreviewFrame}
          onSeeked={playPreview}
          onMouseEnter={playPreview}
          onMouseLeave={pausePreview}
        />
      )}
    </div>
  );
}

function DocumentCover({ item }: { item: LibraryItem }): JSX.Element {
  const suffix = documentTypeSuffix(item.sourcePath);
  const preview = item.previewText?.trim();
  return (
    <div className={`document-cover document-cover-${documentKindForPath(item.sourcePath)}`}>
      <div className="document-cover-top">
        <FileText size={23} />
        <strong>{suffix}</strong>
      </div>
      {preview ? (
        <p>{preview}</p>
      ) : (
        <div className="document-cover-empty">
          <span>{suffix}</span>
          <small>{item.title}</small>
        </div>
      )}
    </div>
  );
}

function PdfCanvasViewer({
  fileUrl,
  page,
  zoom,
  fitWidth,
  title,
  onPageCount
}: {
  fileUrl: string;
  page: number;
  zoom: number;
  fitWidth: boolean;
  title: string;
  onPageCount: (count: number) => void;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    setLoading(true);

    async function renderPdfPage(): Promise<void> {
      renderTaskRef.current?.cancel();
      const documentTask = pdfjsLib.getDocument({ url: fileUrl });
      const pdf = await documentTask.promise;
      if (cancelled) return;
      onPageCount(pdf.numPages);
      const safePage = Math.max(1, Math.min(page, pdf.numPages));
      const pdfPage = await pdf.getPage(safePage);
      if (cancelled) return;

      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const shellWidth = Math.max(360, shellRef.current?.clientWidth ?? baseViewport.width);
      const scale = fitWidth ? Math.max(0.2, (shellWidth - 36) / baseViewport.width) : Math.max(0.25, zoom / 100);
      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;

      const outputScale = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

      const renderTask = pdfPage.render({ canvasContext: context, viewport });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      if (!cancelled) setLoading(false);
    }

    void renderPdfPage().catch((reason) => {
      if (cancelled || reason?.name === "RenderingCancelledException") return;
      setError(reason instanceof Error ? reason.message : "PDF render failed");
      setLoading(false);
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [fileUrl, fitWidth, onPageCount, page, zoom]);

  return (
    <div className="pdf-canvas-shell" ref={shellRef}>
      {loading && <div className="pdf-loading">Loading...</div>}
      {error ? (
        <div className="document-fallback">
          <FileText size={42} />
          <p>{error}</p>
        </div>
      ) : (
        <canvas className="pdf-canvas" ref={canvasRef} aria-label={title} />
      )}
    </div>
  );
}

function statFromItems(items: LibraryItem[]): LibrarySnapshot["stats"] {
  return {
    items: items.length,
    favorites: items.filter((item) => item.favorite).length,
    pages: items.reduce((sum, item) => sum + item.pageCount, 0),
    categories: categoryKeys.reduce(
      (result, category) => ({ ...result, [category]: items.filter((item) => item.category === category).length }),
      { comic: 0, image: 0, text: 0, audio: 0, video: 0, series: 0, archive: 0, other: 0 } as Record<LibraryCategory, number>
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

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

function captureVideoCover(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    let done = false;
    const finish = (dataUrl: string | null): void => {
      if (done) return;
      done = true;
      video.removeAttribute("src");
      video.load();
      resolve(dataUrl);
    };
    const timer = window.setTimeout(() => finish(null), 8000);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = Math.min(Math.max(1, video.duration * 0.08), Math.max(0.1, video.duration - 0.1));
      } else {
        window.clearTimeout(timer);
        finish(null);
      }
    };
    video.onseeked = () => {
      window.clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, video.videoWidth);
        canvas.height = Math.max(1, video.videoHeight);
        const context = canvas.getContext("2d");
        if (!context || canvas.width <= 1 || canvas.height <= 1) {
          finish(null);
          return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.78));
      } catch {
        finish(null);
      }
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };
    video.src = url;
  });
}

function App(): JSX.Element {
  const [snapshot, setSnapshot] = useState<LibrarySnapshot>(defaultSnapshot());
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<LibrarySortKey>("recent");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
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
  const [textTheme, setTextTheme] = useState<TextTheme>(() => {
    try {
      return { ...defaultTextTheme, ...JSON.parse(window.localStorage.getItem("offline-library-text-theme") ?? "{}") };
    } catch {
      return defaultTextTheme;
    }
  });
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [tagEditorItem, setTagEditorItem] = useState<LibraryItem | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [editorDialog, setEditorDialog] = useState<EditorDialog | null>(null);
  const [gridColumns, setGridColumns] = useState<number>(() => {
    const saved = Number(window.localStorage.getItem("offline-library-grid-columns"));
    return gridColumnOptions.includes(saved as (typeof gridColumnOptions)[number]) ? saved : 5;
  });
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    () => (window.localStorage.getItem("offline-library-display-mode") === "scroll" ? "scroll" : "paged")
  );
  const [selectedEpisodePath, setSelectedEpisodePath] = useState<string | null>(null);
  const [pageDraft, setPageDraft] = useState("1");
  const [readerPageDraft, setReaderPageDraft] = useState("1");
  const [pdfPageDraft, setPdfPageDraft] = useState("1");
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [pdfFitWidth, setPdfFitWidth] = useState(true);
  const [editorMode, setEditorMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showGithubCard, setShowGithubCard] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const documentScrollRef = useRef<HTMLDivElement | null>(null);
  const readingSaveTimer = useRef<number | null>(null);
  const [, setProgressTick] = useState(0);

  const lang: AppLanguage = snapshot.settings.language ?? "zh";
  const t = localizedCopy[lang];
  const [notice, setNotice] = useState(copy.zh.importHint);
  const deferredQuery = useDeferredValue(query);

  const selectedItem = useMemo(
    () => snapshot.items.find((item) => item.id === selectedItemId) ?? null,
    [selectedItemId, snapshot.items]
  );
  const selectedEditorItems = useMemo(
    () => snapshot.items.filter((item) => selectedIds.includes(item.id)),
    [selectedIds, snapshot.items]
  );

  const filteredItems = useMemo(() => {
    const keyword = deferredQuery.trim().toLowerCase();
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
  }, [deferredQuery, filter, snapshot.items, sortKey, tagFilter]);

  const availableTags = useMemo(() => {
    return [...new Set(snapshot.items.flatMap((item) => item.tags))].sort((a, b) => a.localeCompare(b));
  }, [snapshot.items]);

  const rowsPerPage = displayMode === "paged" ? 3 : snapshot.settings.highPerformanceMode ? 5 : 6;
  const pageSize = gridColumns * rowsPerPage;
  const pageCount = displayMode === "paged" ? Math.max(1, Math.ceil(filteredItems.length / pageSize)) : 1;
  const visibleItems = useMemo(() => {
    if (displayMode === "scroll") return filteredItems;
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [displayMode, filteredItems, page, pageCount, pageSize]);

  useEffect(() => {
    if (displayMode !== "paged") return;
    const nextStart = page * pageSize;
    const previousStart = Math.max(0, (page - 2) * pageSize);
    const preloadItems = [...filteredItems.slice(previousStart, previousStart + pageSize), ...filteredItems.slice(nextStart, nextStart + pageSize)];
    for (const item of preloadItems) {
      if (!item.coverPath) continue;
      const image = new Image();
      image.src = window.comicShelf.assetUrl(item.coverPath);
    }
  }, [displayMode, filteredItems, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [displayMode, filter, gridColumns, query, sortKey, tagFilter]);

  useEffect(() => {
    const existingIds = new Set(snapshot.items.map((item) => item.id));
    setSelectedIds((current) => current.filter((id) => existingIds.has(id)));
  }, [snapshot.items]);

  useEffect(() => {
    setPageDraft(String(Math.min(page, pageCount)));
  }, [page, pageCount]);

  useEffect(() => {
    if (!selectedItem) return;
    setReaderPageDraft(String(selectedItem.currentPage + 1));
  }, [selectedItem?.currentPage, selectedItem?.id]);

  useEffect(() => {
    window.localStorage.setItem("offline-library-grid-columns", String(gridColumns));
  }, [gridColumns]);

  useEffect(() => {
    window.localStorage.setItem("offline-library-display-mode", displayMode);
  }, [displayMode]);

  useEffect(() => {
    window.localStorage.setItem("offline-library-text-theme", JSON.stringify(textTheme));
  }, [textTheme]);

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
    setNotice(localizedCopy[lang].importHint);
  }, [lang]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, textarea")) return;
      if (viewMode === "grid") {
        if (displayMode === "paged") {
          if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
            event.preventDefault();
            setPage((value) => Math.min(pageCount, value + 1));
          }
          if (event.key === "ArrowLeft" || event.key === "PageUp") {
            event.preventDefault();
            setPage((value) => Math.max(1, value - 1));
          }
          return;
        }

        const grid = gridRef.current;
        if (!grid) return;
        if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
          event.preventDefault();
          grid.scrollBy({ top: Math.max(320, grid.clientHeight * 0.82), behavior: "smooth" });
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "PageUp") {
          event.preventDefault();
          grid.scrollBy({ top: -Math.max(320, grid.clientHeight * 0.82), behavior: "smooth" });
        }
        return;
      }

      if (selectedItem && viewMode === "viewer") {
        const isPdf = selectedItem.category === "text" && documentKindForPath(selectedItem.sourcePath) === "pdf";
        if (isPdf) {
          if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
            event.preventDefault();
            changePdfPage(1);
          }
          if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "PageUp") {
            event.preventDefault();
            changePdfPage(-1);
          }
          if (event.key === "+") {
            setPdfFitWidth(false);
            setPdfZoom((value) => Math.min(300, value + 10));
          }
          if (event.key === "-") {
            setPdfFitWidth(false);
            setPdfZoom((value) => Math.max(25, value - 10));
          }
          if (event.key.toLowerCase() === "f") {
            pureReading ? void exitPureReading() : void enterFullscreenReading();
          }
          if (event.key === "Escape") {
            pureReading ? void exitPureReading() : setViewMode("grid");
          }
          return;
        }

        if (event.key === "Escape") {
          pureReading ? void exitPureReading() : setViewMode("grid");
        }
        return;
      }

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
  }, [displayMode, pageCount, pdfPage, pdfPageCount, pureReading, selectedItem, viewMode]);

  useEffect(() => {
    if (!selectedItem || viewMode !== "viewer" || selectedItem.category !== "text") return;
    const kind = documentKindForPath(selectedItem.sourcePath);
    if (kind === "pdf") {
      setTextContent("");
      return;
    }
    void window.comicShelf.readDocumentText(selectedItem.sourcePath).then(setTextContent).catch(() => setTextContent(""));
  }, [selectedItem, viewMode]);

  useEffect(() => {
    if (!selectedItem || viewMode !== "viewer" || selectedItem.category !== "text" || !textContent) return;
    if (!snapshot.settings.rememberProgressEnabled) return;
    const frame = window.requestAnimationFrame(() => {
      const element = documentScrollRef.current;
      if (!element) return;
      const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
      element.scrollTop = maxScroll * Math.max(0, Math.min(1, selectedItem.textScrollRatio));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedItem?.id, selectedItem?.textScrollRatio, snapshot.settings.rememberProgressEnabled, textContent, viewMode]);

  useEffect(() => {
    if (!selectedItem || selectedItem.category !== "series") return;
    setSelectedEpisodePath((current) =>
      current && selectedItem.files.some((file) => file.path === current) ? current : previewVideoPath(selectedItem)
    );
  }, [selectedItem]);

  useEffect(() => {
    if (!selectedItem || selectedItem.category !== "text" || documentKindForPath(selectedItem.sourcePath) !== "pdf") return;
    setPdfPage(1);
    setPdfPageDraft("1");
    setPdfPageCount(1);
    setPdfZoom(100);
    setPdfFitWidth(true);
  }, [selectedItem?.id, selectedItem?.sourcePath]);

  async function refreshLibrary(): Promise<void> {
    const data = await window.comicShelf.getLibrary();
    setSnapshot(data);
    if (data.items.length > 0) setNotice(localizedCopy[data.settings.language ?? "zh"].ready);
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
    setSelectedEpisodePath(previewVideoPath(item));
    if ((item.category === "comic" || item.category === "image") && item.pageCount > 0) {
      setViewMode("reader");
      await markProgress(item, item.currentPage);
      return;
    }

    if (item.category === "text") {
      if (snapshot.settings.internalDocumentKinds.includes(documentKindForPath(item.sourcePath))) {
        setViewMode("viewer");
        return;
      }
      const data = await window.comicShelf.openExternal(item.id);
      setSnapshot(data);
      if (data.opened) return;
      setViewMode("viewer");
      return;
    }

    const hasExternal = Boolean(snapshot.settings.players[item.category] ?? snapshot.settings.detectedPlayers[item.category]);
    const forceInternal = snapshot.settings.internalPlayerCategories.includes(item.category);
    if (!forceInternal && hasExternal && item.category !== "archive" && item.category !== "other") {
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

  function saveReadingState(item: LibraryItem, state: { page?: number; mediaPosition?: number; textScrollRatio?: number }): void {
    if (!snapshot.settings.rememberProgressEnabled) return;
    if (readingSaveTimer.current) window.clearTimeout(readingSaveTimer.current);
    readingSaveTimer.current = window.setTimeout(() => {
      void window.comicShelf.updateReadingState(item.id, state).then((updated) => {
        if (!updated) return;
        setSnapshot((current) => ({
          ...current,
          items: current.items.map((entry) => (entry.id === updated.id ? updated : entry))
        }));
      });
    }, 700);
  }

  function restoreMediaPosition(event: React.SyntheticEvent<HTMLMediaElement>, item: LibraryItem): void {
    if (!snapshot.settings.rememberProgressEnabled || item.mediaPosition <= 0) return;
    const media = event.currentTarget;
    if (Number.isFinite(media.duration) && item.mediaPosition < media.duration - 2) {
      media.currentTime = item.mediaPosition;
    }
  }

  function saveMediaPosition(event: React.SyntheticEvent<HTMLMediaElement>, item: LibraryItem): void {
    saveReadingState(item, { mediaPosition: event.currentTarget.currentTime });
  }

  function saveTextScrollPosition(item: LibraryItem): void {
    const element = documentScrollRef.current;
    if (!element) return;
    const maxScroll = Math.max(1, element.scrollHeight - element.clientHeight);
    saveReadingState(item, { textScrollRatio: element.scrollTop / maxScroll });
  }

  async function importFont(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const family = `OfflineFont-${Date.now()}`;
    const font = new FontFace(family, buffer);
    await font.load();
    document.fonts.add(font);
    setTextTheme((current) => ({ ...current, fontFamily: family }));
  }

  function jumpToReaderPage(): void {
    if (!selectedItem) return;
    const value = Number.parseInt(readerPageDraft, 10);
    if (!Number.isFinite(value)) {
      setReaderPageDraft(String(selectedItem.currentPage + 1));
      return;
    }
    const nextPage = Math.max(1, Math.min(selectedItem.pageCount, value));
    setReaderPageDraft(String(nextPage));
    void goToPage(nextPage - 1);
  }

  function jumpToPdfPage(): void {
    const value = Number.parseInt(pdfPageDraft, 10);
    if (!Number.isFinite(value)) {
      setPdfPageDraft(String(pdfPage));
      return;
    }
    const nextPage = Math.max(1, Math.min(pdfPageCount, value));
    setPdfPage(nextPage);
    setPdfPageDraft(String(nextPage));
  }

  function changePdfPage(delta: number): void {
    const nextPage = Math.max(1, Math.min(pdfPageCount, pdfPage + delta));
    setPdfPage(nextPage);
    setPdfPageDraft(String(nextPage));
  }

  function printPdf(): void {
    const canvas = document.querySelector(".pdf-canvas") as HTMLCanvasElement | null;
    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!canvas || !printWindow) {
      if (selectedItem) void openExternal(selectedItem);
      return;
    }
    const imageUrl = canvas.toDataURL("image/png");
    printWindow.document.write(`<!doctype html><html><head><title>Print PDF page</title></head><body style="margin:0;background:#fff;"><img src="${imageUrl}" style="width:100%;height:auto;display:block;" onload="window.print();window.close();" /></body></html>`);
    printWindow.document.close();
  }

  async function toggleFavorite(item: LibraryItem): Promise<void> {
    const data = await window.comicShelf.toggleFavorite(item.id);
    setSnapshot(data);
    setNotice(item.favorite ? t.unfavorited : t.favorited);
  }

  function openTagEditor(item: LibraryItem): void {
    setTagEditorItem(item);
    setTagDraft(item.tags.join(", "));
  }

  async function saveTags(): Promise<void> {
    if (!tagEditorItem) return;
    const tags = tagDraft.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);
    const next = await window.comicShelf.updateTags(tagEditorItem.id, tags);
    setSnapshot(next);
    setTagEditorItem(null);
    setTagDraft("");
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

  async function useInternalPlayer(category: LibraryCategory): Promise<void> {
    const settings = await window.comicShelf.useInternalPlayer(category);
    setSnapshot((current) => ({ ...current, settings }));
  }

  async function setDocumentPlayer(kind: DocumentKind): Promise<void> {
    const settings = await window.comicShelf.setDocumentPlayer(kind);
    setSnapshot((current) => ({ ...current, settings }));
  }

  async function clearDocumentPlayer(kind: DocumentKind): Promise<void> {
    const settings = await window.comicShelf.clearDocumentPlayer(kind);
    setSnapshot((current) => ({ ...current, settings }));
  }

  async function useInternalDocumentPlayer(kind: DocumentKind): Promise<void> {
    const settings = await window.comicShelf.useInternalDocumentPlayer(kind);
    setSnapshot((current) => ({ ...current, settings }));
  }

  async function setLanguage(language: AppLanguage): Promise<void> {
    const settings = await window.comicShelf.setLanguage(language);
    setSnapshot((current) => ({ ...current, settings }));
  }

  async function cycleLanguage(): Promise<void> {
    const languages: AppLanguage[] = ["zh", "en", "ja"];
    const currentIndex = Math.max(0, languages.indexOf(lang));
    await setLanguage(languages[(currentIndex + 1) % languages.length]);
  }

  function setEditorEnabled(enabled: boolean): void {
    setEditorMode(enabled);
    setSelectedIds([]);
  }

  function toggleSelected(itemId: string): void {
    setSelectedIds((current) => (current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]));
  }

  function selectVisibleItems(): void {
    setSelectedIds((current) => [...new Set([...current, ...visibleItems.map((item) => item.id)])]);
  }

  async function renameSelectedItem(): Promise<void> {
    const item = selectedEditorItems[0];
    if (!item) return;
    setEditorDialog({ kind: "rename", item, value: item.title });
  }

  async function createComicFromSelectedImages(): Promise<void> {
    const images = selectedEditorItems.filter((item) => item.category === "image");
    if (images.length === 0) {
      window.alert(t.editorOnlyImages);
      return;
    }
    setEditorDialog({ kind: "collection", itemIds: images.map((item) => item.id), value: "New Image Collection" });
  }

  async function confirmEditorDialog(): Promise<void> {
    if (!editorDialog || !editorDialog.value.trim()) return;
    setBusy(true);
    try {
      const next =
        editorDialog.kind === "rename"
          ? await window.comicShelf.renameItem(editorDialog.item.id, editorDialog.value.trim())
          : await window.comicShelf.createComicFromImages(editorDialog.itemIds, editorDialog.value.trim());
      setSnapshot(next);
      setSelectedIds([]);
      if (editorDialog.kind === "collection") setFilter("comic");
      setEditorDialog(null);
      setNotice(t.editorDone);
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedFiles(): Promise<void> {
    if (selectedIds.length === 0) return;
    if (!window.confirm(t.deleteFilesConfirm)) return;
    setBusy(true);
    try {
      const next = await window.comicShelf.deleteItems(selectedIds);
      setSnapshot(next);
      setSelectedIds([]);
      setNotice(t.editorDone);
    } finally {
      setBusy(false);
    }
  }

  function showGithubInfo(): void {
    setShowGithubCard(true);
  }

  function currentReadableImage(item: LibraryItem): string | null {
    if ((item.category === "comic" || item.category === "image") && item.pagePaths.length > 0) {
      return item.pagePaths[Math.max(0, Math.min(item.currentPage, item.pagePaths.length - 1))];
    }
    return item.coverPath;
  }

  function addReferenceImage(item: LibraryItem): void {
    const imagePath = currentReadableImage(item);
    if (!imagePath) return;
    void window.comicShelf.openReferenceImage(imagePath, fileName(imagePath));
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

  function jumpToShelfPage(): void {
    const value = Number.parseInt(pageDraft, 10);
    if (!Number.isFinite(value)) {
      setPageDraft(String(Math.min(page, pageCount)));
      return;
    }
    setPage(Math.max(1, Math.min(pageCount, value)));
  }

  async function chooseCoverCacheDirectory(): Promise<void> {
    const next = await window.comicShelf.setCoverCacheDirectory();
    setSnapshot(next);
  }

  async function chooseArchiveDirectory(): Promise<void> {
    setBusy(true);
    try {
      setImportProgress({ phase: "scanning", current: 0, total: 1, message: "Scanning archive folder", startedAt: Date.now() });
      const next = await window.comicShelf.setArchiveDirectory();
      setSnapshot(next);
      setViewMode("grid");
    } finally {
      setImportProgress(null);
      setBusy(false);
    }
  }

  async function toggleHighPerformance(): Promise<void> {
    const enable = !snapshot.settings.highPerformanceMode;
    const next = await window.comicShelf.setHighPerformance(enable);
    setSnapshot(next);
    if (enable) {
      window.alert(t.highPerformanceHint);
    }
  }

  async function toggleRememberProgress(): Promise<void> {
    const next = await window.comicShelf.setRememberProgress(!snapshot.settings.rememberProgressEnabled);
    setSnapshot(next);
  }

  async function preloadAllContent(): Promise<void> {
    const coverPaths = snapshot.items.map((item) => item.coverPath).filter((path): path is string => Boolean(path));
    const videoItems = snapshot.items.filter((item) => previewVideoPath(item) && !item.videoCoverPath);
    const tasks = [
      ...coverPaths.map((path) => ({ type: "cover" as const, path })),
      ...videoItems.map((item) => ({ type: "video" as const, item, path: previewVideoPath(item)! }))
    ];
    if (tasks.length === 0) return;

    setBusy(true);
    const startedAt = Date.now();
    try {
      for (let index = 0; index < tasks.length; index += 1) {
        const task = tasks[index];
        setImportProgress({
          phase: "importing",
          current: index,
          total: tasks.length,
          message: `${t.preloadingAll}: ${fileName(task.path)}`,
          startedAt
        });
        const url = window.comicShelf.assetUrl(task.path);
        if (task.type === "cover") {
          await preloadImage(url);
        } else {
          const dataUrl = await captureVideoCover(url);
          if (dataUrl) {
            const next = await window.comicShelf.saveVideoCover(task.item.id, dataUrl);
            setSnapshot(next);
          }
        }
      }
      setImportProgress({ phase: "done", current: tasks.length, total: tasks.length, message: "Done", startedAt });
    } finally {
      setImportProgress(null);
      setBusy(false);
    }
  }

  async function organizeComics(): Promise<void> {
    if (!confirmArchivePlan()) return;
    if (!window.confirm(t.organizeWarning)) return;
    if (compressFolders && !window.confirm(t.compressWarning)) return;
    setBusy(true);
    try {
      setImportProgress({ phase: "scanning", current: 0, total: snapshot.items.length, message: "Preparing archive/compression", startedAt: Date.now() });
      const result = await window.comicShelf.organizeComics(compressFolders);
      updateItems(result.items);
      setViewMode("grid");
      setNotice(
        result.destinationPath
          ? `${t.organizeDone}: ${t.moved} ${result.moved}, ${t.compressed} ${result.compressed}, ${t.skipped} ${result.skipped}. ${t.target}: ${result.destinationPath}`
          : t.cancelled
      );
    } finally {
      setImportProgress(null);
      setBusy(false);
    }
  }

  async function autoOrganizeFolder(): Promise<void> {
    if (!confirmArchivePlan()) return;
    if (!window.confirm(t.organizeWarning)) return;
    setBusy(true);
    try {
      setImportProgress({ phase: "scanning", current: 0, total: snapshot.items.length, message: "Preparing archive classification", startedAt: Date.now() });
      const result = await window.comicShelf.autoOrganizeFolder();
      if (result.destinationPath) {
        updateItems(result.items);
      }
      setViewMode("grid");
      setNotice(
        result.destinationPath
          ? `${t.organizeDone}: ${t.moved} ${result.moved}, ${t.skipped} ${result.skipped}. ${t.target}: ${result.destinationPath}`
          : t.cancelled
      );
    } finally {
      setImportProgress(null);
      setBusy(false);
    }
  }

  function confirmArchivePlan(): boolean {
    const candidates = snapshot.items.filter((item) => !isInsideArchive(item, snapshot.settings.archiveDirectory));
    if (snapshot.settings.archiveDirectory && candidates.length === 0) {
      window.alert(t.noNewArchiveItems);
      return false;
    }
    const sample = candidates
      .slice(0, 12)
      .map((item, index) => `${index + 1}. ${item.title}`)
      .join("\n");
    const more = candidates.length > 12 ? `\n... +${candidates.length - 12}` : "";
    return window.confirm(`${t.archiveConfirm}\n\n${sample}${more}`);
  }

  function playerText(settings: AppSettings, category: LibraryCategory): string {
    if (settings.internalPlayerCategories.includes(category)) return t.internalViewer;
    const manual = settings.players[category];
    const detected = settings.detectedPlayers[category];
    if (manual) return fileName(manual);
    if (detected) return fileName(detected);
    return t.windowsDefault;
  }

  function documentKindLabel(kind: DocumentKind): string {
    if (kind === "plain") return t.documentPlain;
    if (kind === "pdf") return t.documentPdf;
    if (kind === "word") return t.documentWord;
    return t.documentEbook;
  }

  function documentPlayerText(settings: AppSettings, kind: DocumentKind): string {
    if (settings.internalDocumentKinds.includes(kind)) return t.internalViewer;
    const manual = settings.documentPlayers[kind];
    if (manual) return fileName(manual);
    return t.windowsDefault;
  }

  function itemCategoryLabel(item: LibraryItem): string {
    if (item.category === "text") return `${t.categories.text} - ${documentTypeSuffix(item.sourcePath)}`;
    return t.categories[item.category];
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
  const isPdfViewer = selectedItem?.category === "text" && documentKindForPath(selectedItem.sourcePath) === "pdf";
  const handlePdfPageCount = useCallback((count: number) => {
    setPdfPageCount(count);
    setPdfPage((current) => Math.max(1, Math.min(count, current)));
  }, []);
  const documentTextStyle = {
    ["--doc-font-size" as string]: `${textTheme.fontSize}px`,
    ["--doc-line-height" as string]: String(textTheme.lineHeight),
    ["--doc-letter-spacing" as string]: `${textTheme.letterSpacing}px`,
    ["--doc-font-family" as string]:
      textTheme.fontFamily === "system" ? "\"Segoe UI\", \"Microsoft YaHei\", sans-serif" : `"${textTheme.fontFamily}"`,
    ["--doc-text-color" as string]: textTheme.textColor,
    ["--doc-page-color" as string]: textTheme.pageColor,
    ["--doc-bg-color" as string]: textTheme.backgroundColor
  };

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
                  <button
                    className={snapshot.settings.internalPlayerCategories.includes(category) ? "active" : ""}
                    title={t.internalViewer}
                    onClick={() => void useInternalPlayer(category)}
                  >
                    <BookOpen size={15} />
                  </button>
                  <button title={t.clearDefault} onClick={() => void clearPlayer(category)}>
                    <X size={15} />
                  </button>
                </div>
              ))}
            <div className="settings-title sub-title">
              <FileText size={16} />
              <span>{t.documentPlayers}</span>
            </div>
            {documentKinds.map((kind) => (
              <div className="player-row" key={kind}>
                <span>{documentKindLabel(kind)}</span>
                <small title={snapshot.settings.documentPlayers[kind] ?? t.windowsDefault}>{documentPlayerText(snapshot.settings, kind)}</small>
                <button title={t.choosePlayer} onClick={() => void setDocumentPlayer(kind)}>
                  <FolderOpen size={15} />
                </button>
                <button
                  className={snapshot.settings.internalDocumentKinds.includes(kind) ? "active" : ""}
                  title={t.internalViewer}
                  onClick={() => void useInternalDocumentPlayer(kind)}
                >
                  <BookOpen size={15} />
                </button>
                <button title={t.clearDefault} onClick={() => void clearDocumentPlayer(kind)}>
                  <X size={15} />
                </button>
              </div>
            ))}
            <p className="cache-hint">{t.internalDocumentFallback}</p>
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
            <button className="organize-button" onClick={() => void organizeComics()} disabled={busy}>
              <FolderOpen size={16} />
              <span>{t.organizeImported}</span>
            </button>
            <button className="organize-button secondary" onClick={() => void autoOrganizeFolder()} disabled={busy}>
              <FolderPlus size={16} />
              <span>{t.autoOrganize}</span>
            </button>
            <button className="organize-button secondary" onClick={() => void chooseArchiveDirectory()} disabled={busy}>
              <FolderOpen size={16} />
              <span>{t.chooseArchiveFolder}</span>
            </button>
            <p className="cache-hint" title={snapshot.settings.archiveDirectory ?? ""}>
              {t.archiveFolder}: {snapshot.settings.archiveDirectory ?? "Default"}
            </p>
            <button className="danger-button" onClick={() => void clearLibrary()} disabled={busy}>
              <Trash2 size={16} />
              <span>{t.clearLibrary}</span>
            </button>
            <p className="cache-hint">{t.cacheHint}</p>
            <p className="cache-hint">{t.highPerformanceHint}</p>
            <button className="admin-button" onClick={() => void toggleHighPerformance()} disabled={busy}>
              <Shield size={16} />
              <span>{snapshot.settings.highPerformanceMode ? t.disableHighPerformance : t.enableHighPerformance}</span>
            </button>
            <p className="cache-hint">{t.rememberProgressHint}</p>
            <button className="organize-button secondary" onClick={() => void toggleRememberProgress()} disabled={busy}>
              <BookOpen size={16} />
              <span>{snapshot.settings.rememberProgressEnabled ? t.disableRememberProgress : t.enableRememberProgress}</span>
            </button>
            <button className="organize-button secondary" onClick={() => void preloadAllContent()} disabled={busy}>
              <Settings size={16} />
              <span>{t.preloadAll}</span>
            </button>
            <button className="organize-button secondary" onClick={() => void toggleCoverCache()} disabled={busy}>
              <Settings size={16} />
              <span>{snapshot.settings.coverCacheEnabled ? t.disableCache : t.enableCache}</span>
            </button>
            <button className="organize-button secondary" onClick={() => void chooseCoverCacheDirectory()} disabled={busy}>
              <FolderOpen size={16} />
              <span>{t.chooseCacheFolder}</span>
            </button>
            <p className="cache-hint" title={snapshot.settings.coverCacheDirectory ?? ""}>
              {t.cacheFolder}: {snapshot.settings.coverCacheDirectory ?? "Default"}
            </p>
            {snapshot.settings.coverCacheEnabled && (
              <button className="danger-button" onClick={() => void clearCoverCache()} disabled={busy}>
                <Trash2 size={16} />
                <span>{t.disableCache}</span>
              </button>
            )}
          </section>

          <section className="utility-panel">
            <label className="language-setting">
              <span>{t.languageSetting}</span>
              <select value={lang} onChange={(event) => void setLanguage(event.target.value as AppLanguage)}>
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </label>
            <button onClick={() => setViewMode("help")}>
              <HelpCircle size={16} />
              <span>{t.help}</span>
            </button>
            <button onClick={showGithubInfo}>
              <Github size={16} />
              <span>{t.github}</span>
            </button>
            <button onClick={() => void window.comicShelf.quitApp()}>
              <X size={16} />
              <span>{t.quitApp}</span>
            </button>
          </section>

          <p className="notice">{notice}</p>
        </aside>
      )}

      {viewMode === "grid" && (
        <section className={`library-view display-${displayMode} ${editorMode ? "has-editor-bar" : ""}`}>
          <header className="topbar">
            <div>
              <h2>{filter === "favorite" ? t.favorite : filter === "all" ? t.library : t.categories[filter]}</h2>
              <p>
                {filteredItems.length} {t.visible}
                {displayMode === "paged" ? ` · ${t.page} ${Math.min(page, pageCount)} / ${pageCount}` : ""}
              </p>
            </div>
            <div className="topbar-controls">
              <label>
                <span>{t.editorMode}</span>
                <select value={editorMode ? "on" : "off"} onChange={(event) => setEditorEnabled(event.target.value === "on")}>
                  <option value="off">{t.editorOff}</option>
                  <option value="on">{t.editorOn}</option>
                </select>
              </label>
              {displayMode === "paged" && (
                <>
                  <button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                    {t.prevPage}
                  </button>
                  <label className="page-jump">
                    <span>{t.jumpPage}</span>
                    <input
                      value={pageDraft}
                      inputMode="numeric"
                      onChange={(event) => setPageDraft(event.target.value.replace(/\D/g, ""))}
                      onBlur={jumpToShelfPage}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          jumpToShelfPage();
                        }
                      }}
                    />
                  </label>
                  <button disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
                    {t.nextPage}
                  </button>
                </>
              )}
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
              <label>
                <span>{t.columnsPerRow}</span>
                <select value={gridColumns} onChange={(event) => setGridColumns(Number(event.target.value))}>
                  {gridColumnOptions.map((count) => (
                    <option value={count} key={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t.displayMode}</span>
                <select value={displayMode} onChange={(event) => setDisplayMode(event.target.value as DisplayMode)}>
                  <option value="paged">{t.pagedMode}</option>
                  <option value="scroll">{t.scrollMode}</option>
                </select>
              </label>
            </div>
          </header>

          {editorMode && (
            <div className="editor-action-bar">
              <div>
                <Edit3 size={16} />
                <span>
                  {t.editorMode} - {t.selectedCount} {selectedIds.length}
                </span>
              </div>
              <button onClick={selectVisibleItems}>
                <CheckSquare size={15} />
                <span>{t.selectAll}</span>
              </button>
              <button onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0}>
                <Square size={15} />
                <span>{t.clearSelection}</span>
              </button>
              <button onClick={() => void renameSelectedItem()} disabled={selectedIds.length !== 1 || busy}>
                {t.renameSelected}
              </button>
              <button onClick={() => void createComicFromSelectedImages()} disabled={selectedIds.length === 0 || busy}>
                {t.createComicFromImages}
              </button>
              <button className="danger-inline" onClick={() => void deleteSelectedFiles()} disabled={selectedIds.length === 0 || busy}>
                <Trash2 size={15} />
                <span>{t.deleteSelectedFiles}</span>
              </button>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={42} />
              <h2>{t.noContent}</h2>
              <p>{t.noContentHint}</p>
            </div>
          ) : (
            <div ref={gridRef} className="book-grid" style={{ ["--grid-columns" as string]: String(gridColumns), ["--grid-rows" as string]: String(rowsPerPage) }}>
              {visibleItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const previewName = currentReadableImage(item) ? fileName(currentReadableImage(item)!) : null;
                return (
                <article className={`book-card category-${item.category} ${isSelected ? "selected" : ""}`} key={item.id}>
                  {editorMode && (
                    <button className="select-toggle" title={isSelected ? t.clearSelection : t.selectAll} onClick={() => toggleSelected(item.id)}>
                      {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                  )}
                  <button className="cover-button" onClick={() => (editorMode ? toggleSelected(item.id) : void openItem(item))}>
                    {item.category === "text" ? (
                      <DocumentCover item={item} />
                    ) : item.coverPath ? (
                      <img src={window.comicShelf.assetUrl(item.coverPath)} alt={item.title} loading="lazy" />
                    ) : item.category === "video" || item.category === "series" ? (
                      <VideoCoverPreview item={item} />
                    ) : (
                      <div className="missing-cover">
                        <CategoryIcon category={item.category} size={38} />
                      </div>
                    )}
                    {item.favorite && <Star className="favorite-badge" size={19} fill="currentColor" />}
                  </button>
                  <div className="book-meta">
                    <div className="meta-line">
                      <span>{itemCategoryLabel(item)}</span>
                      <span>{item.category === "comic" || item.category === "image" ? pageLabel(item.currentPage, item.pageCount) : t.internalViewer}</span>
                    </div>
                    <h3 title={item.title}>{item.title}</h3>
                    {(item.category === "comic" || item.category === "image") && previewName && (
                      <p className="page-file-name" title={previewName}>
                        {t.pageFileName}: {previewName}
                      </p>
                    )}
                    {item.previewText && item.category !== "text" && <p className="text-preview">{item.previewText}</p>}
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
                    <button title={t.editTags} onClick={() => openTagEditor(item)}>
                      <Tags size={16} />
                    </button>
                    <button title={t.reveal} onClick={() => void window.comicShelf.revealInExplorer(item.sourcePath)}>
                      <FolderOpen size={16} />
                    </button>
                    <button title={t.remove} onClick={() => void removeItem(item)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
                );
              })}
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
            {helpParagraphs(lang).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <button onClick={showGithubInfo}>
              <Github size={17} />
              <span>{t.github}</span>
            </button>
          </div>
        </section>
      )}

      {viewMode === "viewer" && selectedItem && (
        <section className="reader-view">
          {!pureReading && (
            <header className="reader-bar">
              <button title={t.readerBack} onClick={closeReader}>
                <X size={19} />
              </button>
              <div>
                <h2 title={selectedItem.title}>{selectedItem.title}</h2>
                <p>{t.internalViewer}</p>
              </div>
              <div className="reader-actions document-actions">
                {selectedItem.category === "text" && documentKindForPath(selectedItem.sourcePath) === "pdf" && (
                  <>
                    <button title={t.prev} onClick={() => changePdfPage(-1)}>
                      <ChevronLeft size={18} />
                    </button>
                    <label className="pdf-page-jump" title={t.jumpPage}>
                      <input
                        type="number"
                        min={1}
                        max={pdfPageCount}
                        value={pdfPageDraft}
                        onChange={(event) => setPdfPageDraft(event.target.value)}
                        onBlur={jumpToPdfPage}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") jumpToPdfPage();
                        }}
                      />
                      <span>/ {pdfPageCount}</span>
                    </label>
                    <button title={t.next} onClick={() => changePdfPage(1)}>
                      <ChevronRight size={18} />
                    </button>
                    <button
                      title={t.zoomOut}
                      onClick={() => {
                        setPdfFitWidth(false);
                        setPdfZoom((value) => Math.max(25, value - 10));
                      }}
                    >
                      <Minus size={17} />
                    </button>
                    <span className="zoom-label">{pdfFitWidth ? t.fitWidth : `${pdfZoom}%`}</span>
                    <button
                      title={t.zoomIn}
                      onClick={() => {
                        setPdfFitWidth(false);
                        setPdfZoom((value) => Math.min(300, value + 10));
                      }}
                    >
                      <Plus size={17} />
                    </button>
                    <button title={t.fitWidth} onClick={() => setPdfFitWidth(true)}>
                      <ChevronsRight size={17} />
                    </button>
                    <button
                      title={t.resetZoom}
                      onClick={() => {
                        setPdfFitWidth(false);
                        setPdfZoom(100);
                      }}
                    >
                      <RotateCcw size={17} />
                    </button>
                    <button title="Print" onClick={printPdf}>
                      <FileText size={17} />
                    </button>
                  </>
                )}
                {selectedItem.category === "text" && documentKindForPath(selectedItem.sourcePath) !== "pdf" && (
                  <>
                    <label>
                      <span>{t.fontSize}</span>
                      <input
                        type="range"
                        min={12}
                        max={34}
                        value={textTheme.fontSize}
                        onChange={(event) => setTextTheme((current) => ({ ...current, fontSize: Number(event.target.value) }))}
                      />
                    </label>
                    <label>
                      <span>{t.lineHeight}</span>
                      <input
                        type="range"
                        min={1.2}
                        max={2.6}
                        step={0.1}
                        value={textTheme.lineHeight}
                        onChange={(event) => setTextTheme((current) => ({ ...current, lineHeight: Number(event.target.value) }))}
                      />
                    </label>
                    <label>
                      <span>{t.letterSpacing}</span>
                      <input
                        type="range"
                        min={0}
                        max={6}
                        step={0.5}
                        value={textTheme.letterSpacing}
                        onChange={(event) => setTextTheme((current) => ({ ...current, letterSpacing: Number(event.target.value) }))}
                      />
                    </label>
                    <label className="color-control">
                      <span>{t.textColor}</span>
                      <input type="color" value={textTheme.textColor} onChange={(event) => setTextTheme((current) => ({ ...current, textColor: event.target.value }))} />
                    </label>
                    <label className="color-control">
                      <span>{t.pageColor}</span>
                      <input type="color" value={textTheme.pageColor} onChange={(event) => setTextTheme((current) => ({ ...current, pageColor: event.target.value }))} />
                    </label>
                    <label className="color-control">
                      <span>{t.backgroundColor}</span>
                      <input
                        type="color"
                        value={textTheme.backgroundColor}
                        onChange={(event) => setTextTheme((current) => ({ ...current, backgroundColor: event.target.value }))}
                      />
                    </label>
                    <label className="font-import-button">
                      <span>{t.importFont}</span>
                      <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={(event) => void importFont(event)} />
                    </label>
                  </>
                )}
                <button className="viewer-icon-button" title={t.fullscreen} onClick={() => void enterFullscreenReading()}>
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
          <div className={`internal-viewer ${isPdfViewer ? "pdf-internal-viewer" : ""}`}>
            {selectedItem.category === "video" && (
              <video
                src={window.comicShelf.assetUrl(selectedItem.sourcePath)}
                controls
                onLoadedMetadata={(event) => restoreMediaPosition(event, selectedItem)}
                onTimeUpdate={(event) => saveMediaPosition(event, selectedItem)}
              />
            )}
            {selectedItem.category === "series" && (
              <div className="series-viewer">
                {selectedEpisodePath && (
                  <video
                    src={window.comicShelf.assetUrl(selectedEpisodePath)}
                    controls
                    onLoadedMetadata={(event) => restoreMediaPosition(event, selectedItem)}
                    onTimeUpdate={(event) => saveMediaPosition(event, selectedItem)}
                  />
                )}
                <div className="episode-list">
                  {selectedItem.files.map((file, index) => (
                    <button
                      className={selectedEpisodePath === file.path ? "active" : ""}
                      key={file.path}
                      onClick={() => setSelectedEpisodePath(file.path)}
                      title={file.name}
                    >
                      {t.episode} {index + 1}: {file.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedItem.category === "audio" && (
              <audio
                src={window.comicShelf.assetUrl(selectedItem.sourcePath)}
                controls
                onLoadedMetadata={(event) => restoreMediaPosition(event, selectedItem)}
                onTimeUpdate={(event) => saveMediaPosition(event, selectedItem)}
              />
            )}
            {selectedItem.category === "text" &&
              (documentKindForPath(selectedItem.sourcePath) === "pdf" ? (
                <div className="document-reader pdf-reader">
                  <PdfCanvasViewer
                    fileUrl={window.comicShelf.assetUrl(selectedItem.sourcePath)}
                    fitWidth={pdfFitWidth}
                    onPageCount={handlePdfPageCount}
                    page={pdfPage}
                    title={selectedItem.title}
                    zoom={pdfZoom}
                  />
                </div>
              ) : textContent ? (
                <div className="document-reader text-reader-shell" style={documentTextStyle}>
                  <div
                    ref={documentScrollRef}
                    className="document-text-scroll"
                    onScroll={() => {
                      if (selectedItem) saveTextScrollPosition(selectedItem);
                    }}
                  >
                    <article className="document-page">
                      <pre>{textContent}</pre>
                    </article>
                  </div>
                </div>
              ) : (
                <div className="document-fallback">
                  <FileText size={42} />
                  <p>{t.unsupportedDocument}</p>
                  <button onClick={() => void openExternal(selectedItem)}>
                    <Maximize2 size={18} />
                    <span>{t.externalOpen}</span>
                  </button>
                </div>
              ))}
            {!["video", "series", "audio", "text"].includes(selectedItem.category) && (
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
                <h2 title={selectedItem.title}>{selectedItem.title}</h2>
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
                <label className="reader-page-jump" title={t.jumpPage}>
                  <span>{t.jumpPage}</span>
                  <input
                    type="number"
                    min={1}
                    max={selectedItem.pageCount}
                    value={readerPageDraft}
                    onChange={(event) => setReaderPageDraft(event.target.value)}
                    onBlur={jumpToReaderPage}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") jumpToReaderPage();
                    }}
                  />
                </label>
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
                <button title={t.pinReference} onClick={() => addReferenceImage(selectedItem)}>
                  <FileImage size={18} />
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

      {tagEditorItem && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="tag-editor">
            <h2>{t.tagEditor}</h2>
            <p>{tagEditorItem.title}</p>
            <textarea value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} placeholder={t.tagPrompt} autoFocus />
            <div className="modal-actions">
              <button onClick={() => setTagEditorItem(null)}>{t.cancel}</button>
              <button className="primary" onClick={() => void saveTags()}>
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {editorDialog && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="tag-editor">
            <h2>{editorDialog.kind === "rename" ? t.renameSelected : t.createComicFromImages}</h2>
            <p>{editorDialog.kind === "rename" ? t.renamePrompt : t.newComicPrompt}</p>
            <input
              className="editor-input"
              value={editorDialog.value}
              onChange={(event) => setEditorDialog({ ...editorDialog, value: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") void confirmEditorDialog();
                if (event.key === "Escape") setEditorDialog(null);
              }}
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={() => setEditorDialog(null)}>{t.cancel}</button>
              <button className="primary" onClick={() => void confirmEditorDialog()} disabled={!editorDialog.value.trim() || busy}>
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGithubCard && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="github-card">
            <img src={taoImage} alt="TAO" />
            <h2>{t.author}: TAO</h2>
            <p>https://github.com/haoy633-star/Offline-text-repository-</p>
            <p>{t.githubPrompt}</p>
            <div className="modal-actions">
              <button onClick={() => setShowGithubCard(false)}>{t.cancel}</button>
              <button
                className="primary"
                onClick={() => {
                  setShowGithubCard(false);
                  void window.comicShelf.openGithub();
                }}
              >
                {t.github}
              </button>
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
