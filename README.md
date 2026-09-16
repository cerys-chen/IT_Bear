# JokeBear Deskpet

一个基于 Electron 的 Windows 桌面宠物应用。桌面上会显示一只可以互动的自嘲熊，同时提供轻量的待办事项和历史记录功能。

## 当前功能

### 桌面宠物

- 启动时自动读取 `assets/gif` 中所有 `.gif` 和 `.GIF` 动作素材。
- 每次启动随机选择一个起始动作。
- 左键点击熊切换到下一个动作，动作列表循环播放。
- 按住熊可以拖动整个桌宠窗口。
- 只有熊本身可以拖动，透明区域和待办纸张不会拖动窗口。
- 右键熊打开功能菜单。
- 默认始终置顶，可以在右键菜单中关闭或重新开启。
- 记住桌宠上次所在的位置。

### 待办事项

- 熊旁边显示简约的手绘风格待办纸张。
- 添加、完成、恢复和删除待办事项。
- 双击待办正文可以编辑，按 `Enter` 保存、按 `Esc` 取消。
- 长文字自动换行，鼠标悬停可以查看完整内容。
- 按住待办事项可以调整顺序，排序会自动保存。
- 点击纸张右上角的 `-` 隐藏待办纸张。
- 右键熊并选择“打开今天待办”可以重新显示纸张。
- 每天自动建立独立的待办记录。
- 右键熊可以打开历史记录，历史日期为只读状态。

## 环境要求

- Windows
- Node.js 和 npm

## 安装与运行

在 VS Code 终端执行：

```powershell
cd D:\IT_Bear
npm install
npm.cmd start
```

停止应用时，在终端按 `Ctrl + C`。

## 打包 Windows 免安装版本

安装依赖后执行：

```powershell
npm run dist
```

或：

```powershell
npm.cmd run dist
```

打包完成后，便携版和压缩包会输出到：

```text
dist/
```

当前配置会生成两个 x64 Windows 版本：

- `JokeBear Deskpet-1.0.0-x64.exe`：便携版，直接双击运行
- `JokeBear Deskpet-1.0.0-x64.zip`：解压后运行

## 项目结构

```text
IT_Bear/
├─ assets/
│  └─ gif/                 # 桌宠 GIF 动作素材
├─ src/
│  ├─ main/
│  │  ├─ main.js           # Electron 主进程、窗口、菜单和数据存储
│  │  └─ preload.js        # 主进程与渲染进程之间的安全接口
│  └─ renderer/
│     ├─ pet.html          # 桌宠主页面
│     ├─ pet.css           # 桌宠和待办纸张样式
│     └─ pet.js            # 桌宠交互和待办逻辑
├─ .gitignore
├─ package.json
├─ package-lock.json
└─ README.md
```

## 添加或替换动作素材

将 GIF 文件放入：

```text
assets/gif/
```

文件名可以自由命名，只要扩展名是 `.gif` 或 `.GIF`。程序启动时会自动扫描，不需要修改 JavaScript 文件。

## 数据保存位置

待办事项和桌宠位置保存在 Electron 用户数据目录中的：

```text
jokebear.json
```

## 开发检查

修改 JavaScript 后，可以运行：

```powershell
node --check src/main/main.js
node --check src/main/preload.js
node --check src/renderer/pet.js
```

## 注意事项

- `node_modules/` 和 `dist/` 已通过 `.gitignore` 排除。
- 历史待办记录只读，不能重新排序或修改。
- 当前打包目标为 x64 Windows 便携版和 ZIP 版，不写入系统安装目录。
