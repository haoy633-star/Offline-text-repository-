# Offline Library 源码导览和 Mac 适配说明

这个项目目前是一个 Electron 桌面软件。你可以简单理解成：

前端界面是 React 写的，底层桌面能力靠 Electron，文件扫描和缓存处理跑在 Electron 主进程里。它现在主要是按 Windows 使用习惯做的，所以如果要适配 Mac，重点不是重写全部 UI，而是把“系统相关”的地方换成 Mac 友好的写法。

## 技术栈

- Electron：负责桌面窗口、系统托盘、文件选择、打开外部程序、打包安装程序。
- React：负责界面，比如左侧分类、书架卡片、阅读器、设置页。
- TypeScript：整个项目主要语言。
- electron-vite：开发和构建工具。
- electron-builder：打 Windows 安装包，现在用的是 NSIS。
- sharp：生成封面缓存、压缩封面、控制图片处理性能。
- JSZip：读取和生成 zip/cbz 漫画压缩包。
- pdfjs-dist：内置 PDF 预览和阅读。
- lucide-react：界面图标库。

## 源码主要在哪里

项目根目录：

```text
D:\TABLE\Offline-Library-整理归档-20260604\03_旧版Electron源码_项目
```

主要文件是这些：

```text
package.json
electron.vite.config.ts
build/installer.nsh
src/main/index.ts
src/preload/index.ts
src/shared/types.ts
src/renderer/index.html
src/renderer/src/main.tsx
src/renderer/src/styles.css
src/renderer/src/assets/tao.jpg
```

## 每个文件大概是干嘛的

### package.json

这个是项目配置和依赖表。

里面能看到：

- 项目版本号，比如现在是 `0.32.0`
- 启动命令：`npm run dev`
- 构建命令：`npm run build`
- 打包命令：`npm run dist`
- Electron Builder 的安装包配置

现在里面主要是 Windows 的打包配置：

```json
"win": {
  "target": ["nsis"]
}
```

如果要做 Mac，后面大概要加：

```json
"mac": {
  "target": ["dmg", "zip"]
}
```

不过 Mac 签名、公证、权限提示这些后面还要单独处理。

### build/installer.nsh

这是 Windows NSIS 安装器脚本。

它主要处理：

- 如果已经安装旧版本，就按升级处理
- 安装前尝试关掉正在运行的 `Offline Library.exe`

Mac 不走这个文件。Mac 打包一般会走 `.dmg` 或 `.zip`，这里基本可以先不管。

### src/main/index.ts

这个是最重要的底层入口，也就是 Electron 主进程。

它负责这些事：

- 创建主窗口
- 创建系统托盘
- 扫描文件夹
- 导入图片集、图片、文本、音频、视频、压缩包
- 自动分类
- 归档、压缩、缓存封面
- 调用外部播放器
- 打开系统文件夹
- 保存 `library.json` 和 `settings.json`
- 处理性能模式、空闲释放、封面缓存

Mac 适配最需要看这个文件。

特别要注意这些地方：

- Windows 外部播放器路径检测，比如 VLC、PotPlayer、Windows Media Player
- `taskkill` 这种 Windows 命令
- `revealInExplorer` 或打开文件夹的行为
- 托盘图标在 Mac 菜单栏里的表现
- 安装包逻辑和管理员权限逻辑
- 文件路径大小写和特殊字符兼容

### src/preload/index.ts

这个文件是安全桥。

React 前端不能直接调用 Node 和 Electron，所以这里把主进程功能包装成：

```ts
window.comicShelf
```

比如前端想导入文件夹，不是直接碰硬盘，而是调用：

```ts
window.comicShelf.importFolders()
```

然后 preload 再通过 IPC 去叫主进程做事。

如果 Mac 适配时新增系统能力，比如“打开 Finder 中的位置”，也可以从这里加 API。

### src/shared/types.ts

这里是共用类型。

比如：

- 一个资源卡片长什么样：`LibraryItem`
- 设置长什么样：`AppSettings`
- 性能设置长什么样：`PerformanceSettings`
- 分类有哪些：`LibraryCategory`

这个文件看起来不复杂，但很关键。因为主进程、preload、React 前端都引用它。

如果改了字段，最好同时检查：

- 老用户的 settings/library 能不能兼容
- readSettings / migrateItem 有没有默认值
- 前端有没有读这个字段

### src/renderer/src/main.tsx

这个是 React UI 主入口。

目前这个文件比较大，很多界面都在这里：

- 左侧栏
- 分类筛选
- 搜索和排序
- 图片集/视频/文本卡片
- 阅读器
- PDF/TXT/文档查看
- 设置页
- 性能设置
- 编辑者模式
- GitHub/作者弹窗

如果后面想整理代码，可以从这里拆组件。比如先拆：

```text
VideoCoverPreview
DocumentCover
SettingToggle
PDFViewer
ReaderView
SettingsView
Sidebar
BookGrid
```

不过 Mac 适配不一定要先拆，先跑起来更重要。

### src/renderer/src/styles.css

整个 UI 的样式基本都在这里。

包括：

- 暗色主题
- 左侧栏
- 卡片
- 阅读器
- 设置页
- 滚动条
- 弹窗
- PDF/文本阅读器

Mac 上字体、滚动条、窗口边框会和 Windows 不一样。如果 UI 看着怪，主要改这个文件。

### src/renderer/src/assets/tao.jpg

这个是 GitHub/作者信息按钮里用的图片。

## 怎么运行

先进入项目目录：

```powershell
cd "D:\TABLE\Offline-Library-整理归档-20260604\03_旧版Electron源码_项目"
```

安装依赖：

```powershell
npm install
```

开发运行：

```powershell
npm run dev
```

构建检查：

```powershell
npm run build
```

打 Windows 安装包：

```powershell
npm run dist
```

## Mac 适配优先级

我建议不要一上来就改很多。先按这个顺序来：

1. 先让 `npm run dev` 在 Mac 上跑起来。
2. 看 Electron 窗口能不能打开。
3. 测试导入一个普通图片文件夹。
4. 测试打开图片集阅读器。
5. 测试打开 Finder 定位文件。
6. 测试外部播放器逻辑。
7. 最后再做 `.dmg` 打包。

## Mac 适配最可能要改的点

### 1. 外部播放器检测

现在主进程里有一些 Windows 程序路径，比如：

```text
C:\Program Files\...
```

Mac 上应该换成：

```text
/Applications/VLC.app
/Applications/IINA.app
/Applications/QuickTime Player.app
```

但 Mac 打开 `.app` 的方式不一定是直接 spawn exe，可能要用：

```ts
shell.openPath(filePath)
```

或者：

```ts
open -a "IINA" filePath
```

### 2. 安装器

Windows 现在是 NSIS。

Mac 应该用 dmg/zip。`build/installer.nsh` 不用。

### 3. 托盘

Windows 是系统托盘，Mac 是菜单栏图标。Electron 的 `Tray` 都能用，但图标尺寸、颜色、点击菜单行为可能要调。

Mac 菜单栏图标最好用模板图，也就是黑白透明那种，否则深浅色主题下可能不好看。

### 4. 文件定位

Windows 里是“在资源管理器显示”。

Mac 上应该是 Finder 显示。Electron 的：

```ts
shell.showItemInFolder(path)
```

理论上跨平台，但还是要实际测。

### 5. 权限

Mac 对桌面、下载、文档、外接硬盘可能会弹权限。

如果用户导入很大的文件夹，Mac 可能会因为隐私权限拦一下。这个需要测试，不是代码看一眼就能完全确定。

### 6. 文件路径

Mac 路径是 `/Users/...`，Windows 是 `D:\...`。

代码里大部分用了 Node 的 `path`，还好。但如果哪里手写了 Windows 风格路径，就要小心。

## 一句话总结

这个软件本质上不是 Windows 独占架构，它是 Electron，所以 Mac 适配是有希望的。真正需要改的主要是：

- 打包配置
- 外部播放器检测
- 托盘图标
- Finder/权限体验
- 少量 Windows 专用命令

UI 和大部分导入、分类、阅读逻辑应该可以继续复用。

