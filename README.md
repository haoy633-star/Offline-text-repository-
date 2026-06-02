# Offline Library / 离线漫画与资料库

Offline Library is a local-first Windows desktop app for people who keep comics, novels, audio, video, and mixed folders on their own computer.

Offline Library 是一款本地优先的 Windows 桌面应用，适合把漫画、小说、音频、视频和混合文件夹都保存在自己电脑上的用户。

## What It Does / 它能做什么

| English | 中文 |
| --- | --- |
| Import folders and automatically classify files. | 导入文件夹后自动分类文件。 |
| Read image-folder comics and CBZ/ZIP comics inside the app. | 在应用内阅读图片文件夹漫画和 CBZ/ZIP 漫画。 |
| Open text, audio, video, archives, and other files with an external program. | 文本、音频、视频、压缩包和其它文件会用外部程序打开。 |
| Choose a custom player or reader for each category. | 可以为每个分类设置自定义播放器或阅读器。 |
| Fall back to the Windows default app when no custom player is set. | 没有设置自定义程序时，会使用 Windows 默认打开方式。 |
| Favorite items for quick access later. | 可以收藏内容，方便下次快速找到。 |
| Search by title or original file path. | 支持按标题或原始路径搜索。 |

## Automatic Categories / 自动分类

The app detects content by file extension and folder contents.

应用会根据文件扩展名和文件夹内容自动判断分类。

| Category | 中文分类 | Examples |
| --- | --- | --- |
| Comics | 漫画 | `.jpg`, `.png`, `.webp`, `.cbz`, `.zip` with images |
| Text | 文本 | `.txt`, `.md`, `.pdf`, `.epub`, `.docx` |
| Audio | 音频 | `.mp3`, `.flac`, `.wav`, `.m4a` |
| Video | 视频 | `.mp4`, `.mkv`, `.avi`, `.mov` |
| Archives | 压缩包 | `.zip` files without comic images |
| Other | 其它 | Files that do not match the known groups |

When a folder mostly contains images, it becomes one comic item. When a folder contains mixed files, the app imports the files as separate categorized items.

如果一个文件夹主要是图片，它会被当作一本漫画。如果一个文件夹里混有文本、音频、视频等内容，应用会把这些文件分别作为不同分类项目导入。

## Download / 下载方法

### Option 1: Download Source Code / 下载源码

1. Open the GitHub repository page.
2. Click `Code`.
3. Click `Download ZIP`.
4. Extract the ZIP file.

中文：

1. 打开这个 GitHub 仓库页面。
2. 点击绿色的 `Code` 按钮。
3. 点击 `Download ZIP`。
4. 解压下载后的压缩包。

### Option 2: Clone With Git / 使用 Git 克隆

```bash
git clone https://github.com/haoy633-star/Offline-text-repository-.git
cd Offline-text-repository-
```

### Option 3: Build a Windows Installer / 自己打包 Windows 安装包

```bash
npm install
npm run dist
```

The installer will be generated in the `release` folder.

安装包会生成在 `release` 文件夹中。

## Development / 开发运行

Install dependencies:

安装依赖：

```bash
npm install
```

Run in development mode:

开发模式运行：

```bash
npm run dev
```

Build the app:

构建应用：

```bash
npm run build
```

## How To Use / 使用方法

1. Launch the app.
2. Click `导入文件夹` to import a folder that contains comics, text files, audio, video, or mixed content.
3. Click `导入 CBZ / ZIP` to import comic archives.
4. Use the left sidebar to filter `全部`, `收藏`, `漫画`, `文本`, `音频`, `视频`, `压缩包`, or `其它`.
5. Click the heart button to favorite an item.
6. Click the play/read button to open an item.
7. For comics, the app opens the built-in reader.
8. For text, audio, video, archives, and other files, the app opens an external program.
9. In `外部播放器`, choose a custom program for each category, or clear it to use the Windows default app.

中文简版：

1. 打开应用。
2. 点 `导入文件夹`，选择你的漫画/小说/音频/视频混合文件夹。
3. 点 `导入 CBZ / ZIP`，导入漫画压缩包。
4. 在左侧选择 `全部`、`收藏` 或某个分类。
5. 点爱心收藏内容。
6. 点播放/阅读按钮打开内容。
7. 漫画会在应用内阅读。
8. 文本、音频、视频等会启动外部播放器或 Windows 默认程序。
9. 在 `外部播放器` 区域可以给每个分类设置你喜欢的软件。

## Current Limitations / 当前限制

| English | 中文 |
| --- | --- |
| CBR is not supported yet. | 暂不支持 CBR。 |
| The app does not include its own video or audio player. | 应用本身不内置视频或音频播放器。 |
| Very large libraries may need a future thumbnail cache. | 超大资料库后续可能需要缩略图缓存。 |

## Roadmap / 后续计划

- Tags and manual metadata editing / 标签和手动元数据编辑
- Double-page comic reading mode / 漫画双页阅读模式
- Vertical scroll reading mode / 纵向滚动阅读模式
- Duplicate detection / 重复文件检测
- Optional CBR support / 可选 CBR 支持
- GitHub Actions release builds / 使用 GitHub Actions 自动生成安装包

## License / 许可证

MIT
