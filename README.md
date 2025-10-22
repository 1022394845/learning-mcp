# learning-mcp

> 一个基于 Vue 3 + Vite 的本地聊天界面示例。黑白简约风格、完整响应式、安全的 Markdown 渲染，支持在 sandboxed iframe 内可视化渲染与库缓存管理。

## 特性一览

- 黑白简约 UI：统一灰度调色板、干净留白、对比度友好。
- 完整响应式：
  - 桌面端固定侧边栏 + 主区域
  - 移动端抽屉式侧边栏（遮罩点击关闭）
- 安全 Markdown 渲染：
  - 基于 `marked + dompurify` 的渲染与净化
  - `<draw>` 占位生成图片（可对接你的图像 API）
  - `<htmath>` 在 sandboxed iframe 中安全渲染可视化/HTML 片段
  - MathJax 公式（自动注入，行内/块）
- 会话与消息：
  - 新建/切换/删除会话、标题自动生成
  - SSE 流式响应（示例：`/api/v1/chat/sse`）
  - 本地持久化 `localStorage`
  - 消息操作：复制、重新生成、导出为单页 HTML
- 可视化库管理：
  - 统一配置与注入第三方库（如 Plotly/ECharts/D3/Chart.js/Leaflet）
  - 支持启用/禁用、离线缓存到 Cache Storage、状态查看
  - 流式渲染阶段展示“正在加载可视化…”占位，闭合后即时注入
- 主题系统：
  - 跟随系统明暗模式（`prefers-color-scheme`）
  - 手动切换（顶部按钮）：`light / dark / 跟随系统`
- 可访问性与体验：显性焦点样式、键盘可用、自定义滚动条、尊重 reduce motion

## 快速开始

### 环境要求
- Node.js 18+（推荐）

### 安装依赖
```powershell
npm install
```

### 开发模式
```powershell
npm run dev
```

### 构建
```powershell
npm run build
```

### 预览构建产物
```powershell
npm run preview
```

> Windows 下默认 shell 为 PowerShell，以上命令可直接复制粘贴执行。

## 目录结构（关键项）

```
learning-mcp/
├─ index.html
├─ package.json
├─ vite.config.js
├─ public/
└─ src/
   ├─ main.js
   ├─ App.vue
   ├─ style.css                 # 入口样式，导入 reset 与 theme
   ├─ styles/
   │  ├─ reset.css             # 现代化最小 reset
   │  └─ theme.css             # 主题变量/滚动条/工具类
   ├─ components/
   │  ├─ ChatSidebar.vue       # 会话列表 + MCP 工具入口
   │  ├─ ToolBar.vue           # 输入区工具栏（文件/代码/图表等）
   │  ├─ SettingsModal.vue     # 设置面板（API 地址、可视化库配置）
   │  ├─ LibConfigManager.vue  # 可视化库启用与缓存管理
   │  └─ MarkdownRenderer.vue  # 安全 Markdown 渲染（含 <htmath>/<draw>）
   ├─ composables/
   │  ├─ useChat.js            # 会话/消息状态、SSE 发送/接收、持久化
   │  ├─ useToast.js           # 轻量通知（全局总线）
   │  └─ useConfirm.js         # 确认对话框（全局总线）
   ├─ config/
   │  └─ visualization-libs.config.js  # 可视化库清单/注入/安全配置
   └─ views/
      └─ ChatView.vue          # 主视图（顶部/消息区/输入区/设置）
```

## 配置与运行

### 后端 API（SSE）
- 默认 SSE 接口：`GET /api/v1/chat/sse?message=...`
- 前端配置：`src/views/ChatView.vue` 中 `apiUrl`，默认值为：
  - `http://localhost:10001/api/v1/chat/sse`
- UI 调整：在“设置”面板（右下角“设置”按钮或侧边栏底部）可修改 `API 地址`（当前版本未持久化，你可按需扩展）。

前端期望服务端以 text/event-stream 逐行发送形如下列数据：

```
data: {"text": "分片文本..."}
```

### 可视化库与 `<htmath>`
- 在 Markdown 中使用 `<htmath>...</htmath>` 包裹 HTML 片段，可在 sandboxed iframe 内安全渲染。
- 组件会移除片段内的外链脚本引用，并改为统一从配置注入：
  - 配置位置：`src/config/visualization-libs.config.js`
  - UI 管理：设置面板中的“可视化库配置”（启用/禁用、下载缓存、清理缓存）
- 已内置库：Plotly（默认启用）、ECharts、D3、Chart.js、Leaflet（默认禁用，可按需启用）
- 缓存：库可下载到 Cache Storage 离线使用；状态在设置面板中可见。
- 流式体验：
  - 流式阶段若出现 `<htmath>` 开始标签，将先展示“正在加载可视化…”占位；
  - 一旦收到闭合标签，立即注入 iframe 并自适应高度；流式结束后做一次完整渲染（含 MathJax/图片等补齐）。

示例（Plotly）：

````markdown
这里是一段图表：

<htmath>
<div id="plot" style="width:100%;height:360px"></div>
<script>
  const el = document.getElementById('plot');
  Plotly.newPlot(el, [{ y: [1,3,2,4] }], { margin: { t: 20 } });
</script>
</htmath>
````

安全与隔离：iframe 使用受限的 `sandbox` 属性。你可在 `visualization-libs.config.js` 中调整：

- `sandboxConfig.attributes`：允许的能力白名单
- `sandboxConfig.strict`：为 `true` 时禁用 `allow-same-origin` 以增强隔离
- `cacheConfig.maxSize/debug`：控制 iframe 缓存策略与日志

### 图片生成功能`<draw>`
- 在 Markdown 中使用 `<draw>描述</draw>` 插入占位图。
- 对接方法：在 `ChatView.vue` 的 `generateImage` 或 `composables/useChat.js` 的导出函数中，调用你的图片 API 并返回 base64（不含 dataurl 前缀）。

## 主题系统

主题变量定义于 `src/styles/theme.css`：

- 核心颜色：`--bg`、`--bg-elev-1/2/3`、`--fg`、`--fg-muted`、`--fg-dim`、`--border`、`--border-strong`、`--accent`、`--accent-weak`
- 尺寸：`--radius-sm/md/lg`、`--space-1..7`、`--container-max`
- 字体：`--font-sans`、`--font-mono`
- 焦点环：`--focus-ring`

运行时切换：`ChatView.vue` 顶部按钮在三态间切换：`light → dark → 跟随系统`。选择会写入 `localStorage(theme)`；移除代表跟随系统。

示例：

```css
.example-card {
  background: var(--bg-elev-1);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
```

## 组件概览

- `ChatSidebar.vue`：会话列表与 MCP 工具入口（代码、文件、可视化、图像、检索）。
- `ToolBar.vue`：输入区工具栏；支持多文件选择，工具提示显示使用建议。
- `MarkdownRenderer.vue`：
  - DOMPurify 净化
  - MathJax 自动注入
  - `<htmath>` 使用统一库注入 + 高度自适应 + 流式占位
  - `<draw>` 生成图占位，对接 `generateImage`
- `SettingsModal.vue`：API 地址输入与“可视化库配置”入口。
- `LibConfigManager.vue`：可视化库启用/下载/清理、状态显示、导出配置。
- `ToastContainer.vue` / `useToast.js`：轻量通知。
- `ConfirmDialogHost.vue` / `useConfirm.js`：确认弹窗。

## 故障排查（Troubleshooting）

- 开发服务器无法启动（`npm run dev` 失败）
  - 确认 Node.js 版本 ≥ 18：`node -v`
  - 删除锁文件与缓存后重装依赖：
    - 可尝试 `rm -force node_modules, package-lock.json; npm install`（PowerShell）
  - 若端口冲突，手动指定端口运行开发服务器（示例）：`vite --port 5173`
- 浏览器控制台提示外链脚本被移除
  - 预期行为：`<htmath>` 中的外链脚本会被移除，改为统一从配置注入；请在设置面板启用目标库。
- 图表不显示或高度为 0
  - 确认 `<div id="...">` 存在尺寸；Plotly/ECharts 绘图完成后高度会自动同步。
- SSE 无响应
  - 用浏览器直接访问 `http://localhost:10001/api/v1/chat/sse?message=ping` 观察是否有 `data: {"text": ...}` 输出。
  - 检查后端 CORS 与 `text/event-stream` 响应头。

## 开发建议

- 使用主题变量，避免硬编码颜色/尺寸。
- 组件结构优先语义化标签（`aside/main/header/section`）。
- 大量消息建议做虚拟化（可后续引入虚拟列表）。
- 若要持久化 API 地址，可在 `SettingsModal.vue` / `ChatView.vue` 中读写 `localStorage`。

## 许可证

本项目用于学习与演示目的。
