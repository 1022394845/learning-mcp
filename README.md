# learning-mcp

> 一个基于 Vue 3 + Vite 的本地聊天界面示例。已重构为黑白简约风格，支持完整响应式，并保留原有功能与 Markdown 渲染能力。

## 特性

- 黑白简约 UI：统一的灰度调色板与留白层次，清晰、干净、对比度高。
- 完整响应式：
  - 桌面端固定侧边栏 + 主区域
  - 移动端抽屉式侧边栏（遮罩层点击关闭）
- 安全的 Markdown 渲染：
  - 基于 `marked + dompurify` 的渲染与净化
  - 支持 `<draw>` 占位生成图片（可对接 API）
  - 支持 `<htmath>` 使用 sandboxed iframe 安全渲染可视化内容
  - 支持 MathJax 公式渲染（行内/块）
- 会话与消息管理：
  - 新建/切换/删除会话
  - SSE 流式响应（示例：`/api/v1/chat/sse`）
  - 本地持久化 `localStorage`
- 主题系统：
  - 跟随系统明暗模式（`prefers-color-scheme`）
  - 手动切换（顶部按钮）：`light / dark / 跟随系统`
- 可访问性与体验
  - 明确的焦点样式、键盘可用
  - 细腻滚动条样式与运动约束（支持 reduce motion）

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

### 预览构建产物（可选）
```powershell
npm run preview
```

## 目录结构

```
learning-mcp/
├─ index.html
├─ package.json
├─ README.md
├─ vite.config.js
├─ public/
└─ src/
   ├─ main.js
   ├─ App.vue
   ├─ style.css               # 入口样式：导入 reset 与 theme，并提供通用工具
   ├─ styles/
   │  ├─ reset.css           # 现代化最小 reset
   │  └─ theme.css           # 黑白主题变量、滚动条、focus 样式、工具类
   ├─ assets/
   ├─ components/
   │  ├─ ChatSidebar.vue     # 会话列表 + 工具入口（移动端抽屉式）
   │  ├─ ToolBar.vue         # 输入区工具栏（文件上传/代码/图表等）
   │  └─ MarkdownRenderer.vue# 安全 Markdown 渲染（勿改动功能）
   ├─ composables/
   │  └─ useChat.js          # 会话与消息状态、SSE 发送/接收、持久化
   └─ views/
      └─ ChatView.vue        # 主视图（包含顶部、消息区、输入区、设置）
```

## 主题系统

主题变量定义在 `src/styles/theme.css`。

- 核心颜色变量：
  - 背景：`--bg`、`--bg-elev-1/2/3`
  - 文本：`--fg`、`--fg-muted`、`--fg-dim`
  - 边框：`--border`、`--border-strong`
  - 强调：`--accent`、`--accent-weak`
- 尺寸变量：
  - 圆角：`--radius-sm/md/lg`
  - 间距：`--space-1 ~ --space-7`
  - 容器宽度：`--container-max`
- 字体：`--font-sans`、`--font-mono`
- 焦点环：`--focus-ring`

### 跟随系统 & 手动覆盖
- 默认跟随系统的明暗偏好（`prefers-color-scheme`）。
- 手动覆盖：在 `html` 上使用 `data-theme` 属性即可：
  - `data-theme="light"`/`data-theme="dark"` 强制浅/深色
  - 移除该属性则恢复跟随系统
- 运行时切换：`ChatView.vue` 中的“月亮”按钮会在三种状态间切换：`light → dark → 跟随系统 → ...`，并持久化在 `localStorage`（键：`theme`）。

### 使用主题变量（示例）
```css
.example-card {
  background: var(--bg-elev-1);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
```

## 响应式与交互
- 宽度 ≤ 1024px 时：
  - 侧边栏变为抽屉：点击顶部“菜单”按钮弹出；点击遮罩关闭。
  - 样式过渡使用 `transform`，性能友好。
- 滚动容器建议加类 `u-scrollbar` 以使用主题滚动条样式。

## Markdown 渲染说明（保持原有功能）
- 文件：`src/components/MarkdownRenderer.vue`
- 依赖：`marked` + `dompurify`
- 安全策略：HTML 净化与 sandboxed iframe（用于 `<htmath>` 可视化内容），避免风险脚本注入。
- 支持：
  - 公式渲染（MathJax 自动注入）
  - 图片生成占位（`<draw>...</draw>`）— 通过 `generateImage` 对接实际 API
  - 轻量与完整渲染模式（流式/非流式）

> 注意：应避免修改该组件的行为逻辑。如需扩展，请在组件外封装，或通过 props 新增可选能力。

## 后端 API（示例）
- SSE 接口：`GET /api/v1/chat/sse?message=...`
- 前端配置位置：`ChatView.vue` → `apiUrl`，默认 `http://localhost:10001/api/v1/chat/sse`
- 你可以将此 URL 替换为实际后端服务地址。

## 常见问题（FAQ）

- 如何切换主题？
  - 顶部右侧“月亮”图标，浅色/深色/跟随系统三态轮换。
- 移动端如何打开/关闭侧边栏？
  - 顶部“菜单”图标打开；点击遮罩层关闭。
- 如何接入真实的图像生成功能？
  - 在 `useChat.js` 或 `ChatView.vue` 的 `generateImage` 方法中对接你的图像生成 API，返回 base64 数据字符串即可。
- 如何自定义滚动条？
  - 修改 `src/styles/theme.css` 中的滚动条相关样式，或在目标容器上添加自定义的 `::-webkit-scrollbar` 样式。

## 开发指南

### 代码风格
- 尽量使用主题变量（颜色、尺寸等）避免硬编码，便于整体风格统一与切换。
- 新增组件时：
  - 结构：优先语义化标签（如 `aside`、`main`、`header`、`section`）。
  - 样式：引用主题变量、使用 `.u-card`、`.u-border`、`.u-container` 等工具类。
  - 交互：保留键盘可用性与焦点可见性。

### 扩展建议（from Next Steps）
- 主题：
  - 可新增 `--radius-xl`、`--space-8/9`、更细的阴影分级。
  - 通过 `data-theme` 添加“高对比度”皮肤。
- UI：
  - 消息操作浮层（复制/重生成）在 hover 时延时显示。
  - 快速指令卡片模块化配置。
- 性能：
  - 大量消息时对消息列表进行虚拟化。
- 测试：
  - 对 `useChat` 补充单元测试，对 `MarkdownRenderer` 增加快照测试。

## 许可

本项目用于学习与演示目的，请根据你的实际需求在此补充许可证信息。
