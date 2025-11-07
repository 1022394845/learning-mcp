<script setup>
import { h } from 'vue'
import { XMarkdown } from 'vue-element-plus-x'
import 'katex/dist/katex.min.css' // 数学公式样式
// 导入自定义代码块映射的组件
import Htmath from './Visualization/Htmath.vue' // iframe
import Echarts from './Visualization/Echarts.vue' // echarts

const props = defineProps({
  content: { type: String, required: true },
  generateImage: { type: Function, required: true },
  messageId: { type: String, required: true },
  streaming: { type: Boolean, default: false },
  toolCalls: { type: Array, default: () => [] }
})
const emits = defineEmits(['updateHeight'])

// 渲染自定义代码块
const selfCodeXRender = {
  // 劫持块标识: (props) => h(映射组件, { 给组件传递props，代码块中的内容位于 props.raw.content })
  // 可以在映射组件前先对闭合性（流式传输）校验再映射（推荐），也可以先映射，在组件中校验
  // 例如 echarts 为代码块语言, Echarts 是自己封装的映射组件
  echarts: (props) => {
    try {
      // 校验option是否闭合
      let cleanedStr = props.raw.content
        .replace(/^option\s*=\s*/, '')
        .replace(/;\s*$/, '')
      cleanedStr = cleanedStr.replace(/'/g, '"')
      cleanedStr = cleanedStr.replace(/(\w+)\s*:/g, '"$1":')

      return h(Echarts, { option: JSON.parse(cleanedStr) })
    } catch (error) {
      return null
    }
  },

  htmath: (props) => {
    const html = props.raw.content
    if (!html || !/<\/html\s*>/i.test(html)) return null
    return h(Htmath, {
      html,
      onUpdateHeight: () => {
        emits('updateHeight')
      }
    })
  }
}
</script>

<template>
  <div class="markdown-container">
    <XMarkdown
      :markdown="content"
      :code-x-render="selfCodeXRender"
      :allow-html="true"
    />
    <!-- MCP 工具调用状态条 -->
    <div
      v-if="props.toolCalls && props.toolCalls.length"
      class="tool-call-banner"
    >
      <span class="tool-call-title">正在调用工具：</span>
      <span v-for="name in props.toolCalls" :key="name" class="tool-call-chip">
        <span class="tool-call-spinner" aria-hidden="true"></span>
        <span class="tool-call-name">{{ name }}</span>
      </span>
    </div>
  </div>
</template>

<style>
.image-container {
  min-height: 100px;
  margin: 15px 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.markdown-container {
  line-height: 1.6;
  word-wrap: break-word;
  text-align: left;
  width: 100%;
  overflow-y: auto;
}

.markdown-container h1,
.markdown-container h2,
.markdown-container h3,
.markdown-container h4,
.markdown-container h5,
.markdown-container h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  text-align: left;
  color: #81abe2;
}

.markdown-container p {
  margin: 0 0 16px;
  text-align: left;
}

.markdown-container ul,
.markdown-container ol {
  padding-left: 2em;
  margin-bottom: 16px;
  text-align: left;
}

.markdown-container li {
  margin-bottom: 0.5em;
  text-align: left;
}

.markdown-container code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 90%;
  background-color: var(--code-inline-bg);
  border-radius: 6px;
  font-family: 'Fira Code', 'Consolas', monospace;
}

.markdown-container pre {
  padding: 16px;
  overflow: auto;
  font-size: 90%;
  line-height: 1.45;
  background-color: var(--code-bg);
  color: var(--fg);
  border-radius: 10px;
  margin-bottom: 16px;
  border: 1px solid var(--code-border);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.markdown-container pre code {
  background-color: transparent;
  padding: 0;
}

.markdown-container img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.5em 0;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.markdown-container img:hover {
  transform: scale(1.01);
}

.markdown-container blockquote {
  padding: 0.5em 1.2em;
  color: #6a737d;
  border-left: 0.25em solid #1a73e8;
  background-color: rgba(230, 244, 255, 0.4);
  border-radius: 0 6px 6px 0;
  margin: 0 0 16px;
}

.image-placeholder {
  padding: 30px;
  background-color: rgba(240, 240, 240, 0.7);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border-radius: 10px;
  margin: 15px 0;
  text-align: center;
  border: 1px dashed #ccc;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.image-placeholder.loading {
  animation: pulse 1.5s infinite;
}

.html-container {
  margin: 20px 0;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 10px;
  overflow-x: auto;
  max-width: 100%;
  box-sizing: border-box;
  background-color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.html-container:hover {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  border-color: #1a73e8;
}

/* iframe 加载动画 */
.iframe-loading-indicator {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(240, 240, 240, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  color: #666;
  font-size: 14px;
}
.iframe-loading-indicator .spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ccc;
  border-top-color: #1a73e8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.generated-image {
  max-width: 100%;
  border-radius: 10px;
  margin: 15px 0;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.generated-image:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.image-error {
  padding: 15px;
  background-color: rgba(255, 235, 238, 0.7);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  color: #c62828;
  border-radius: 8px;
  margin: 15px 0;
  text-align: left;
  border-left: 4px solid #c62828;
  box-shadow: 0 4px 10px rgba(198, 40, 40, 0.1);
}

/* MCP 工具调用状态样式 */
.tool-call-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  padding: 10px 12px;
  margin: 0 0 10px 0;
  background: rgba(240, 240, 240, 0.7);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  color: #555;
  font-size: 14px;
}
.tool-call-title {
  font-weight: 600;
  color: #444;
}
.tool-call-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #333;
}
.tool-call-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #cbd5e1;
  border-top-color: #1a73e8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
.tool-call-name {
  font-weight: 500;
}

.processing-indicator {
  display: inline-block;
  padding: 10px 15px;
  background-color: rgba(240, 240, 240, 0.7);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border-radius: 20px;
  font-size: 14px;
  color: #666;
  margin: 15px 0;
  animation: pulse 1.5s infinite;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  text-align: left;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

table th,
table td {
  padding: 12px 15px;
  border: 1px solid #dfe2e5;
}

table th {
  font-weight: 600;
  background-color: rgba(230, 244, 255, 0.6);
}

table tr:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.02);
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}
</style>
