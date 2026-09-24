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
- 右键菜单可以打开设置，调整熊、待办纸和正文的大小。
- 可以开启调整大小模式，分别拖动熊或待办纸右下角改变尺寸。
- 支持启动时显示昨日总结，以及按设定时间提醒当天未完成事项。
- 支持定时站立提醒，默认每 60 分钟提醒一次，并自动切换到下一个熊的动作；提醒开关和间隔可以在独立设置窗口中调整。
- 支持下班倒计时：默认按“今天第一次启动桌宠的时间 + 工作小时数”推算下班时间，也可以在设置中改为填写固定的上下班时间。
- 下班倒计时包含午饭提醒、下午剩余时间播报、下班前提醒、下班庆祝和下班后的加班提醒，每个节点可以单独开关，提醒时间均可调整。
- 每个节点每天最多提醒一次；错过超过 45 分钟的节点不再补提醒；上班前不会推送。
- 左键点击熊切换动作时，顺带弹出一个气泡说明距离下班还有多久（可在设置中关闭）。
- 支持开机自动启动，在设置中开关；每次启动会按当前 exe 位置重新注册，便携版移动目录后自动修正。
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

打包完成后，便携版会输出到：

```text
dist/
```

当前配置会生成 x64 Windows 便携版：

- `JokeBear Deskpet-1.0.2-x64.exe`：便携版，直接双击运行

## 项目结构

```text
IT_Bear/
├─ assets/
│  ├─ gif/                 # 桌宠 GIF 动作素材
│  └─ icon.ico             # 应用图标（exe、窗口）
├─ src/
│  ├─ main/
│  │  ├─ main.js           # Electron 主进程、窗口、菜单和数据存储
│  │  └─ preload.js        # 主进程与渲染进程之间的安全接口
│  └─ renderer/
│     ├─ pet.html          # 桌宠主页面
│     ├─ pet.css           # 桌宠和待办纸张样式
│     ├─ pet.js            # 桌宠交互、待办逻辑和定时提醒
│     ├─ workday.js        # 下班倒计时设置字段的读取与填充
│     ├─ settings.html     # 独立设置窗口
│     ├─ settings.css      # 设置窗口样式
│     └─ settings.js       # 设置读取与保存
├─ test/
│  └─ workday.test.js      # 下班倒计时逻辑测试（node test/workday.test.js）
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

待办事项、桌宠位置、提醒状态和当天第一次启动桌宠的时间保存在 Electron 用户数据目录中的：

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

下班倒计时的时间计算和提醒触发逻辑有独立的测试，不需要启动 Electron：

```powershell
node test/workday.test.js
```

## 注意事项

- `node_modules/` 和 `dist/` 已通过 `.gitignore` 排除。
- 历史待办记录只读，不能重新排序或修改。
- 当前打包目标为 x64 Windows 便携版，不写入系统安装目录。
