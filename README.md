# JokeBear Deskpet

一个基于 Electron 的 Windows 桌面宠物应用。桌面上会显示一只可以互动的自嘲熊，同时提供轻量的待办事项和历史记录功能。

## 当前功能

### 桌面宠物

- 启动时从 `assets/gif` 自动读取所有 `.gif` 和 `.GIF` 动作素材。
- 每次启动时随机选择一个起始动作。
- 左键点击熊切换到下一个动作，动作列表会循环播放。
- 按住熊可以拖动整个桌宠窗口。
- 只有熊本身可以拖动，透明窗口和待办纸张不会抢占其他应用的点击操作。
- 右键熊打开功能菜单。
- 默认始终置顶，可以在右键菜单中关闭或重新开启。
- 记住桌宠上次所在的位置。

### 待办事项

- 熊旁边显示简约的手绘风格待办纸张。
- 添加、完成、恢复和删除待办事项。
- 较长的待办内容会自动换行，鼠标悬停可以查看完整文字。
- 按住待办事项可以拖动调整顺序，排序会自动保存。
- 点击纸张右上角的 `-` 隐藏待办纸张。
- 在隐藏状态下，右键熊并选择“打开今天待办”可以重新显示。
- 每天自动建立独立的待办记录。
- 右键熊可以打开待办历史记录，历史日期为只读状态。

## 环境要求

- Windows
- Node.js 和 npm
- Electron 依赖会通过 npm 自动安装

## 安装与运行

在 VS Code 终端执行：

```powershell
cd D:\IT_Bear
npm install
npm.cmd start
```

也可以使用：

```powershell
npm start
```

停止应用时，在终端按 `Ctrl + C`。

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
│     ├─ pet.js            # 桌宠交互和待办逻辑
│     ├─ todo.html         # 旧版独立待办页面，目前未被主窗口使用
│     ├─ todo.css
│     └─ todo.js
├─ .gitignore
├─ package.json
└─ README.md
```

## 添加或替换动作素材

将 GIF 文件放入：

```text
assets/gif/
```

文件名可以自由命名，只要扩展名是 `.gif` 或 `.GIF`。程序启动时会自动扫描，不需要再修改 JavaScript 文件。

## 数据保存位置

待办事项和桌宠位置保存在 Electron 的用户数据目录中，文件名为：

```text
jokebear.json
```

应用代码不会把待办数据写入项目目录，也不会上传待办内容到 GitHub。

## 开发检查

修改 JavaScript 后，可以运行以下命令检查语法：

```powershell
node --check src/main/main.js
node --check src/main/preload.js
node --check src/renderer/pet.js
```

## 注意事项

- 当前项目没有配置打包脚本，开发阶段使用 `npm.cmd start` 运行。
- 历史待办记录只读，不能重新排序或修改。
- GIF 素材会被提交到 Git 仓库；`node_modules` 和 `dist` 已通过 `.gitignore` 排除。
