# Offline Library

Offline Library is a local-first desktop library for comics, image collections, loose images, text documents, audio, video, video sets, archives, and mixed folders.

It is built for people who keep files on their own computer and want fast offline browsing, cover previews, search, tags, favorites, built-in readers, external player support, archive tools, and performance controls for large libraries.

中文：Offline Library 是一个本地优先的离线资料库软件，可以管理图片集、单张图片、文本、音频、视频、视频集、压缩包和混合文件夹。它适合把文件下载到自己电脑里，然后希望离线搜索、看封面、收藏、打标签、归档整理和阅读的人。

日本語：Offline Library はローカル優先のデスクトップ資料ライブラリです。画像集、単体画像、テキスト、音声、動画、動画セット、圧縮ファイル、混在フォルダーを整理して閲覧できます。

## Download

Installers are not stored directly in this source repository.

Please download the installer from the GitHub Releases page when a release package is uploaded:

[GitHub Releases](https://github.com/haoy633-star/Offline-text-repository-/releases)

中文：安装包不再直接放在源码仓库里。需要下载 exe 时，请到 GitHub Releases 页面下载。

日本語：インストーラーはこのソースリポジトリには直接置いていません。ダウンロードは GitHub Releases から行ってください。

## What This App Can Do

### Library and Import

- Import normal folders, mixed folders, CBZ, and ZIP archives.
- Automatically classify resources into Image Collections, Images, Text, Audio, Video, Video Sets, Archives, and Other.
- Detect multi-item parent folders instead of treating every large folder as one item.
- Detect loose images separately from image collections.
- Support PNG/JPG/JPEG/WEBP/GIF/BMP/AVIF image sources.
- Keep imported resources searchable offline.

### Browsing

- Search by title, file path, and tags.
- Sort by A-Z, Z-A, newest import, oldest import, and recently opened.
- Filter by category and custom tags.
- Add favorites.
- Choose cards per row.
- Switch between paged mode and scroll mode.
- Scroll mode remembers your position after opening and closing an item.
- Large-library virtualization reduces the number of cards rendered at once.

### Readers and Preview

- Built-in image collection reader.
- Built-in loose image viewer.
- Built-in text viewer with font size, line height, spacing, text color, page color, background color, and custom font import.
- Built-in PDF viewing support.
- Built-in audio/video viewer when external players are not used.
- Video and video set cards can use static preview covers.
- Text and document cards show useful preview information.
- Reading progress memory for images, text, audio, and video.
- Fullscreen and pure reading mode.
- Page jump controls.
- Mouse and keyboard page turning.

### External Players

- Supports Windows default opening behavior.
- Supports custom external players per category.
- Supports built-in viewer mode per category.
- Separate document opener settings for TXT/Markdown, PDF, Word, and eBook files.

### Organization and Editing

- Choose an archive folder.
- Compress folder image collections into CBZ.
- Archive and classify imported resources into category folders.
- Avoid repeatedly archiving items that are already inside the archive folder.
- Clear the app library without deleting original files.
- Editor mode for batch selection.
- Rename real files/folders from the app.
- Create a new image collection from selected loose images.
- Delete selected real files when the user confirms.

### Performance and Cache

- Performance presets: Low-end device, Balanced, High performance, Extreme performance.
- Detect local CPU/memory and recommend a preset.
- Cover cache pixel and quality controls.
- Optional static-only video preview.
- Tighter huge-library virtualization.
- Idle auto release to lower memory while the app stays open.
- Tray/background mode reduces resource usage.
- Preload all content when the user prefers speed over memory.
- Cover cache can be enabled, cleared, and moved to a custom directory.

### UI and Language

- Chinese, English, and Japanese UI.
- First launch can choose the language based on the Windows system language.
- GitHub/author information dialog.
- System tray minimize instead of always quitting.
- Version display in the sidebar.

## Tech Stack

- Electron
- React
- TypeScript
- electron-vite
- electron-builder
- sharp
- JSZip
- pdfjs-dist
- lucide-react

## Source Code Map

```text
src/main/index.ts
```

Electron main process. It handles windows, tray behavior, file scanning, import, archive tools, cache generation, external players, settings, and system-level actions.

```text
src/preload/index.ts
```

Safe IPC bridge. The React UI talks to the main process through `window.comicShelf`.

```text
src/renderer/src/main.tsx
```

React UI entry. Most screens live here: sidebar, shelf, readers, settings, editor mode, dialogs, and performance controls.

```text
src/renderer/src/styles.css
```

Main app styling.

```text
src/shared/types.ts
```

Shared TypeScript types used by the main process, preload, and renderer.

```text
build/installer.nsh
```

Windows NSIS installer customization. Mac builds do not use this file.

```text
MAC_PORTING_NOTES_中文.md
```

Chinese notes for anyone who wants to help port the project to macOS.

## Build From Source

```bash
npm install
npm run build
```

For Windows packaging:

```bash
npm run dist
```

The generated installer appears in `release/`.

## Notes For macOS Porting

The project is Electron-based, so most UI and library logic should be reusable on macOS.

The main areas that need checking are:

- macOS packaging config in `package.json`
- external player detection
- Finder reveal/open behavior
- tray/menu bar icon behavior
- app permission prompts for Documents, Downloads, Desktop, and external drives
- Windows-only installer logic

See:

[MAC_PORTING_NOTES_中文.md](./MAC_PORTING_NOTES_%E4%B8%AD%E6%96%87.md)

## License

MIT
