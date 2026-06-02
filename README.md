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
| Organize imported comics into one chosen folder. | 可以把已导入的漫画整理到指定文件夹。 |
| Compress folder-based comics into `.cbz` archives. | 可以把原本是文件夹的漫画压缩成 `.cbz`。 |
| Clear the app library without deleting original files. | 可以清空应用库，但不会删除原始文件。 |
| Scan a large folder and move files into category folders. | 可以扫描大文件夹，并把文件移动到对应分类文件夹。 |
| Use a built-in comic reader, text viewer, audio player, and video player. | 内置漫画阅读器、文本查看器、音频播放器和视频播放器。 |
| Switch between Chinese and English inside the app. | 应用内支持中英文切换。 |
| Separate comic folders from loose image files. | 区分漫画文件夹和散落图片。 |
| Preview videos with an in-app video cover. | 视频在书架中显示视频预览封面。 |

## Automatic Categories / 自动分类

The app detects content by file extension and folder contents.

应用会根据文件扩展名和文件夹内容自动判断分类。

| Category | 中文分类 | Examples |
| --- | --- | --- |
| Comics | 漫画 | folders with multiple comic pages, `.cbz`, `.zip` with images |
| Images | 图片 | loose `.jpg`, `.png`, `.webp`, `.gif` files |
| Text | 文本 | `.txt`, `.md`, `.pdf`, `.epub`, `.docx` |
| Audio | 音频 | `.mp3`, `.flac`, `.wav`, `.m4a` |
| Video | 视频 | `.mp4`, `.mkv`, `.avi`, `.mov` |
| Archives | 压缩包 | `.zip` files without comic images |
| Other | 其它 | Files that do not match the known groups |

When a selected folder mostly contains images and has no child folders, it becomes one comic item. Loose images inside a mixed folder are imported as Images instead of being forced into a comic.

如果你选择的是一个主要由图片组成、且没有子文件夹的文件夹，它会被当作一本漫画。混合文件夹里的散图会被归入图片分类，不会强行合成漫画。

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

The installer and portable executable will be generated in the `release` folder.

安装包和便携版 exe 会生成在 `release` 文件夹中。

Current local build output / 当前本机打包输出：

- `release/Offline Library-0.1.0-x64-Setup.exe`: installer / 安装版
- `release/Offline Library-0.1.0-x64-Portable.exe`: portable app / 便携版，双击即可启动
- `release/win-unpacked/Offline Library.exe`: unpacked app executable / 解压目录里的直接启动程序

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
10. In `管理员整理`, click `管理员模式重启` when you need elevated permissions, then click `整理已导入漫画`.
11. Enable `文件夹漫画压缩为 CBZ` if you want folder comics compressed while organizing.
12. Click `扫描大文件夹并分类` to choose a messy source folder and a destination folder. The app will move files into `Comics`, `Images`, `Text`, `Audio`, `Video`, `Archives`, and `Other`.
13. Click `清空库` to reset the app index and cache. Original files stay where they are.
14. Use `中文 / English` to switch the interface language.
15. Use `GitHub` inside the app to open the project page.

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
10. 如果要整理散落在电脑各处的漫画，先点 `管理员模式重启`。
11. 点 `整理已导入漫画`，选择目标文件夹；如果勾选 `文件夹漫画压缩为 CBZ`，文件夹漫画会被压缩后移动。
12. 点 `扫描大文件夹并分类`，先选择杂乱的大文件夹，再选择目标文件夹，应用会自动移动到漫画、图片、文本、音频、视频等分类目录。
13. 点 `清空库` 可以重置应用内书架和缓存，但不会删除你的原始文件。
14. 点 `中文 / English` 可以切换界面语言。
15. 点 `GitHub` 可以打开项目主页。

## Organizing Comics / 整理漫画说明

The organizer only processes comic items that are already imported into the app. It does not scan or move unrelated files by itself.

整理功能只处理当前已经导入应用的漫画项目，不会主动扫描或移动无关文件。

When compression is enabled, folder comics are written to `.cbz` archives in the chosen destination folder, and the original imported comic folder is removed after the archive is created successfully.

开启压缩时，文件夹漫画会被写成 `.cbz` 文件放进目标文件夹；压缩成功后，原来的漫画文件夹会被删除，以节省空间。

The large-folder classifier is different: it asks for a source folder and a destination folder, then moves files into category folders. Do not choose a destination folder inside the source folder.

大文件夹分类功能是另一种整理方式：它会让你选择来源文件夹和目标文件夹，然后按分类移动文件。不要把目标文件夹选在来源文件夹内部。

## Built-In Viewer / 内置查看器

The built-in comic reader supports quick page turning, first/last page buttons, zoom, fit-to-page, fit-to-width, actual-size mode, and fullscreen pure reading mode. The app hides the native menu bar for a cleaner reading feel.

内置漫画阅读器支持快速翻页、第一页/最后一页、缩放、适应页面、适应宽度、原始大小和全屏纯阅读模式。应用会隐藏原生菜单栏，让阅读界面更干净。

For text, audio, and video files, the app first checks manually configured players and common installed players. If no external player is available, it uses the built-in viewer/player.

文本、音频和视频会优先使用手动设置的外部程序和自动检测到的常见播放器。如果没有可用外部程序，就使用内置查看器/播放器。

## Current Limitations / 当前限制

| English | 中文 |
| --- | --- |
| CBR is not supported yet. | 暂不支持 CBR。 |
| The app does not include its own video or audio player. | 应用本身不内置视频或音频播放器。 |
| Very large libraries may need a future thumbnail cache. | 超大资料库后续可能需要缩略图缓存。 |

## Done Recently / 最近已推进

- Detailed in-app help / 更详细的应用内使用方法
- Chinese and English UI switch / 中英文界面切换
- Fullscreen pure reading mode / 全屏纯阅读模式
- Dark scrollbars and reader sliders / 深色滚动条和阅读滑条
- Video preview covers in the library / 书架视频预览封面
- Separate Images category for loose image files / 散图独立图片分类
- Hide native File/Edit/View menu in the app window / 隐藏原生窗口菜单栏

## Roadmap / 后续计划

- Tags and manual metadata editing / 标签和手动元数据编辑
- Double-page comic reading mode / 漫画双页阅读模式
- Vertical scroll reading mode / 纵向滚动阅读模式
- Duplicate detection and cleanup report / 重复文件检测和清理报告
- Optional CBR support / 可选 CBR 支持
- GitHub Actions release builds / 使用 GitHub Actions 自动生成安装包

## License / 许可证

MIT
