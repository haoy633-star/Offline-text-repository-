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
| Show import progress, elapsed time, and estimated remaining time. | 导入时显示进度、已用时间和预计剩余时间。 |
| Preview plain text files on library cards. | 文本文件在卡片上显示内容预览。 |
| Sort by A-Z, Z-A, newest, oldest, or recently opened. | 支持按 A-Z、Z-A、最新、最早、最近打开排序。 |
| Add custom tags to library items and filter by tag. | 支持给作品添加自定义标签，并按标签筛选。 |
| Optional cover cache for faster library previews. | 可选封面缓存，加快书架预览加载。 |
| High performance mode for very large libraries. | 面向超大资料库的高性能模式。 |

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

When a selected folder mostly contains images, it becomes one comic item. If a comic has chapter folders inside it, the importer can treat the root folder as one comic when most child folders contain images. Loose images inside a mixed folder are imported as Images instead of being forced into a comic.

如果你选择的是一个主要由图片组成的文件夹，它会被当作一本漫画。如果漫画下面还有章节子文件夹，导入器会在大多数子文件夹都包含图片时把根目录识别为一本漫画。混合文件夹里的散图会被归入图片分类，不会强行合成漫画。

## Download / 下载方法

### Quick Download / 快速下载

For beginners, download the portable executable directly from the repository:

小白用户可以直接下载仓库里的便携版 exe：

- `downloads/Offline-Library-Portable.exe`

After downloading, double-click the file to run the app.

下载后双击即可运行。

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

### Main Library / 主资料库

The library grid is the main screen. Every card represents one imported resource: a comic, image, text file, audio file, video file, archive, or other file.

主资料库是软件的主界面。每张卡片代表一个已经导入的资源：漫画、图片、文本、音频、视频、压缩包或其它文件。

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
16. Use the sort controls to choose A-Z, Z-A, newest, oldest, or recently opened order.
17. Use the tag button on an item card to add comma-separated custom tags.
18. Enable cover cache from Admin Tools if you want faster cover previews and can accept a small cache.

### Card Buttons / 卡片按钮

- Heart / 爱心：add or remove from Favorites / 加入或取消收藏。
- Play / 播放：open the item. Comics and images open in the built-in reader; other files use detected/custom players when possible.
- External open / 外部打开：force the item to open in an external app or Windows default app.
- Tag / 标签：edit custom tags. Enter tags separated by commas, for example `read, favorite, author`.
- Folder / 文件夹：reveal the original file location in Windows Explorer.
- Trash / 移除：remove from the app library only. Original files are not deleted.

### Sorting And Tags / 排序与标签

Use the sort dropdown at the top of the library to choose `A-Z`, `Z-A`, newest import, oldest import, or recently opened. Use the Tag dropdown to filter by a custom tag. Tags are useful for read status, author, favorite type, translation group, or anything personal.

顶部排序下拉框可以选择 `A-Z`、`Z-A`、最新导入、最早导入、最近打开。Tag 下拉框可以按自定义标签筛选。标签适合记录已读/未读、作者、喜好、汉化组、题材等。

### Admin Tools / 管理员工具

These tools may move files. Read the confirmation dialog carefully before continuing.

这些工具可能会移动文件。继续前请仔细阅读确认窗口。

- `整理已导入资源`: choose a destination folder, then move all imported resources into category subfolders. This changes the original file locations.
- `归档并分类已导入资源`: a larger organization operation for the whole library. It moves imported resources into `Comics`, `Images`, `Text`, `Audio`, `Video`, `Archives`, and `Other`.
- `文件夹漫画压缩为 CBZ`: when enabled, folder-based comics are compressed to `.cbz`; after successful compression, the original comic folder is removed.
- Cover cache / 封面缓存：off by default. When enabled, the app caches cover previews only, not full books. You can disable and clear it later.
- High performance mode / 高性能模式：recommended when importing thousands of files. It uses more memory, enables cover caching, and renders the shelf in pages instead of drawing every item at once.

- `整理已导入资源`：选择目标文件夹后，把当前库里的资源移动到分类子文件夹。原文件位置会改变。
- `归档并分类已导入资源`：面向整个库的大整理操作，会移动已导入资源到 `Comics`、`Images`、`Text`、`Audio`、`Video`、`Archives`、`Other`。
- `文件夹漫画压缩为 CBZ`：开启后，文件夹漫画会被压缩成 `.cbz`；压缩成功后原漫画文件夹会被删除。
- 封面缓存：默认关闭。开启后只缓存封面预览，不缓存整本漫画，可随时关闭并清除。
- 高性能模式：如果导入了几千到上万文件，建议开启。它会占用更多内存、启用封面缓存，并把书架分页渲染，避免一次性显示所有卡片导致卡顿。

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
16. 在顶部排序控件里选择 A-Z、Z-A、最新、最早或最近打开。
17. 点卡片上的标签按钮，可以输入逗号分隔的自定义标签。
18. 如果希望封面预览加载更快，可以在管理员工具里启用封面缓存；它默认关闭，只缓存封面预览。

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
- Import progress overlay with a do-not-exit warning / 导入进度遮罩和不要退出提示
- Reader toolbar fix for very long Japanese/Chinese titles / 修复超长中日文标题挤出阅读器工具栏的问题
- Plain text preview snippets / 纯文本预览摘要
- Sorting controls / 排序控件
- Custom tags and tag filters / 自定义标签和标签筛选
- Optional cover cache / 可选封面缓存
- Nested comic folder detection / 多层漫画文件夹识别
- High performance mode and paged shelf rendering / 高性能模式和分页书架渲染
- Multi-comic parent folder import, such as `Example_2019_ArtPack` and `Example_2020_ArtPack_Vol2` as separate items / 多漫画父文件夹导入，会把类似 `Example_2019_ArtPack` 和 `Example_2020_ArtPack_Vol2` 识别为独立作品
- Series folder category for TV/drama folders with multiple video files / 多视频电视剧文件夹会归入独立剧集分类

## Roadmap / 后续计划

- Manual metadata editing / 手动元数据编辑
- Double-page comic reading mode / 漫画双页阅读模式
- Vertical scroll reading mode / 纵向滚动阅读模式
- Duplicate detection and cleanup report / 重复文件检测和清理报告
- Optional CBR support / 可选 CBR 支持
- GitHub Actions release builds / 使用 GitHub Actions 自动生成安装包

## License / 许可证

MIT
