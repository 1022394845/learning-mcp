<script setup>
import { computed, h, inject } from 'vue'
import { XMarkdown } from 'vue-element-plus-x'
import { useToast } from '@/composables/useToast'
import { getSystemTheme } from '@/utils/getSystemTheme'
import 'katex/dist/katex.min.css' // 数学公式样式
// 导入自定义代码块映射的组件
import Htmath from './Visualization/Htmath.vue' // iframe
import Echarts from './Visualization/Echarts.vue' // echarts

const theme = inject('theme')
const toast = useToast()

const props = defineProps({
  content: { type: String, required: true },
  generateImage: { type: Function, required: true },
  messageId: { type: String, required: true },
  streaming: { type: Boolean, default: false },
  toolCalls: { type: Array, default: () => [] }
})
const emits = defineEmits(['updateHeight'])

const processedContent = computed(() => {
  return props.content
    .replace(/<htmath>/g, '```htmath\n')
    .replace(/<\/htmath>/g, '\n```')
})

// 自定义内置渲染
const selfCodeXSlot = {
  // 自定义渲染代码块的右侧控制按钮
  codeHeaderControl: (props) => {
    return h(
      'button',
      {
        class: 'code-top-tool',
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(props.raw.content)
            toast.success('复制成功')
          } catch {
            toast.error('复制失败')
          }
        }
      },
      // 嵌入SVG
      h(
        'svg',
        {
          xmlns: 'http://www.w3.org/2000/svg',
          viewBox: '0 0 1024 1024',
          width: '14',
          height: '14',
          style: { fill: 'currentColor' }
        },
        [
          h('path', {
            fill: 'currentColor',
            d: 'M768 832a128 128 0 0 1-128 128H192A128 128 0 0 1 64 832V384a128 128 0 0 1 128-128v64a64 64 0 0 0-64 64v448a64 64 0 0 0 64 64h448a64 64 0 0 0 64-64z'
          }),
          h('path', {
            fill: 'currentColor',
            d: 'M384 128a64 64 0 0 0-64 64v448a64 64 0 0 0 64 64h448a64 64 0 0 0 64-64V192a64 64 0 0 0-64-64zm0-64h448a128 128 0 0 1 128 128v448a128 128 0 0 1-128 128H384a128 128 0 0 1-128-128V192A128 128 0 0 1 384 64'
          })
        ]
      )
    )
  }
}

// 渲染自定义代码块
const selfCodeXRender = {
  // 劫持块标识: (props) => h(映射组件, { 给组件传递props，代码块中的内容位于 props.raw.content })
  // 可以在映射组件前先对闭合性（流式传输）校验再映射（推荐），也可以先映射，在组件中校验
  // 例如 echarts 为代码块语言, Echarts 是自己封装的映射组件
  echarts: (props) => {
    try {
      const option = JSON.parse(props.raw.content)
      if (option) return h(Echarts, { option })
      else return null
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
      :markdown="processedContent"
      :code-x-render="selfCodeXRender"
      :code-x-slot="selfCodeXSlot"
      :allow-html="true"
      :default-theme-mode="theme || getSystemTheme()"
      class="markdown-prase"
    >
      <template #img="{ ...props }">
        <img
          :key="props.key"
          :src="props.src"
          :alt="props.alt"
          onerror="this.classList.add('error');"
        />
      </template>
    </XMarkdown>
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
.markdown-container {
  width: 100%;
  padding: 10px;
  overflow-y: auto;
}

.markdown-prase {
  --main-color: #81abe2;

  line-height: 1.5;
  word-wrap: break-word;
  text-align: left;
  color: var(--fg);

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 24px 0;
    font-weight: 600;
    line-height: 1.25;
    color: var(--main-color);
  }

  p {
    margin: 16px 0;
  }

  ul,
  ol {
    margin: 16px 0;
    padding-left: 1em;
  }

  li {
    margin: 0.5em 0;
  }

  a {
    color: var(--main-color);
    text-decoration: underline;
  }

  img {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 1.5em 0;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease;
  }

  img:hover {
    transform: scale(1.01);
  }

  img.error {
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

  blockquote {
    margin: 16px 0;
    padding: 0.5em 1.2em;
    border-left: 0.25em solid var(--main-color);
    background-color: rgba(230, 244, 255, 0.2);
    border-radius: 0 6px 6px 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    background-color: transparent;

    th,
    td {
      padding: 12px 15px;
      border: 1px solid #dfe2e5;
    }

    th {
      font-weight: 600;
      background-color: rgba(230, 244, 255, 0.4);
      text-align: center;
    }

    tr:nth-child(odd) {
      background-color: transparent;
    }

    tr:nth-child(even) {
      background-color: var(--bg-dim);
    }
  }

  .code-top-tool {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin-right: 4px;
    padding: 0px;
    border: none;
    background-color: transparent;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s ease;
    border-radius: 4px;
    color: var(--fg-dim);
  }

  .code-top-tool:hover {
    background-color: var(--bg-dim);
  }
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
