<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { cacheConfig } from '../config/visualization-libs.config.js'
import { useLibraryCache } from '../composables/useLibraryCache.js'
import { initMarked, ensureDomPurifyImageHook, parseMarkdown, processStreamingHtmath } from '../utils/htmlProcessor.js'
import { ensureMathJaxLoaded, typesetMath } from '../utils/mathJaxRenderer.js'
import { createHtmathIframeManager, globalIframeCache } from '../utils/iframeManager.js'

const props = defineProps({
  content: { type: String, required: true },
  generateImage: { type: Function, required: true },
  messageId: { type: String, required: true },
  streaming: { type: Boolean, default: false },
  toolCalls: { type: Array, default: () => [] }
})

const { allLibs, initialize } = useLibraryCache()

const renderedContent = ref('')
// 仅在检测到 htmath 且处于流式阶段时展示加载指示
const processingComplete = ref(false)
const hasHtmathInContent = ref(false)
const imageElements = ref([])
const contentCopy = ref('')
// iframe 管理器实例
const iframeMgr = ref(null)
// 当前组件实例使用的 iframe ID 集合
const activeIframeIds = new Set()
// 记录已插入的 iframe 内容，避免在流式轻量渲染中重复注入
const iframeContentCache = new Map()

// 本组件级的可见性/进入视口后的“自愈”机制句柄
let intersectionObserver = null
let visibilityHandlerInstalled = false

onMounted(async () => {
  // Markdown/DOMPurify 初始化与库缓存
  initMarked()
  ensureDomPurifyImageHook()
  await initialize()
  // MathJax 按需加载
  ensureMathJaxLoaded()

  // 预加载配置的可视化库到主文档（只加载一次，供所有 iframe 使用）
  if (!window.__htmathLibsLoaded) {
    window.__htmathLibsLoaded = {}
    
    const enabledLibs = allLibs.value.filter(lib => lib.enabled)
    if (cacheConfig.debug) {
      console.log(`📦 准备预加载 ${enabledLibs.length} 个可视化库`)
    }
    
    // 按优先级顺序加载库
    enabledLibs.forEach(lib => {
      window.__htmathLibsLoaded[lib.id] = false
      
      const script = document.createElement('script')
      script.src = lib.url
      
      if (lib.integrity) {
        script.integrity = lib.integrity
      }
      if (lib.crossOrigin) {
        script.crossOrigin = lib.crossOrigin
      }
      
      script.onload = () => {
        window.__htmathLibsLoaded[lib.id] = true
        if (cacheConfig.debug) {
          console.log(`✅ ${lib.name} (${lib.version}) 已加载到主文档`)
        }
      }
      
      script.onerror = () => {
        console.error(`❌ ${lib.name} 加载失败: ${lib.url}`)
      }
      
      // 设置超时
      if (lib.timeout) {
        setTimeout(() => {
          if (!window.__htmathLibsLoaded[lib.id]) {
            console.warn(`⚠️ ${lib.name} 加载超时 (${lib.timeout}ms)`)
          }
        }, lib.timeout)
      }
      
      document.head.appendChild(script)
      
      // 如果有样式表，也加载它们
      if (lib.stylesheets && lib.stylesheets.length > 0) {
        lib.stylesheets.forEach(styleUrl => {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = styleUrl
          document.head.appendChild(link)
        })
      }
    })
  }

  // iframe 管理器：提供 insertHtmlToDom / rehydrateIfBlank
  const getEnabledLibs = () => allLibs.value.filter(lib => lib.enabled)
  iframeMgr.value = createHtmathIframeManager(getEnabledLibs)

  // 安装页面可见性与 pageshow 自愈钩子（用于恢复被浏览器丢弃为 about:blank 的 iframe）
  if (!visibilityHandlerInstalled) {
    const handler = () => {
      // 仅处理当前组件内的 iframe
      activeIframeIds.forEach((id) => {
        try { iframeMgr.value.rehydrateIfBlank(id) } catch (_) {}
      })
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handler()
    })
    window.addEventListener('pageshow', handler)
    visibilityHandlerInstalled = true
  }

  // 安装 IntersectionObserver，用于进入视口时自愈
  if ('IntersectionObserver' in window && !intersectionObserver) {
    intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target
          const id = el?.getAttribute?.('data-htmath-id')
          if (id) {
            try { iframeMgr.value.rehydrateIfBlank(id) } catch (_) {}
          }
        }
      }
    }, { root: null, threshold: 0 })
  }

  // 初始化完成后，依据当前模式主动渲染一次，避免初始化与首帧渲染时序竞争导致的首屏异常
  if (props.streaming) {
    await renderLight()
  } else {
    await renderContent()
  }
})

// 组件卸载时，不删除 iframe（保留在全局缓存中供下次使用）
// 但清理当前实例的引用
onUnmounted(() => {
  activeIframeIds.clear()
  // 解绑观察器
  if (intersectionObserver) {
    intersectionObserver.disconnect()
    intersectionObserver = null
  }
  
  // LRU 缓存清理策略（从配置文件读取）
  if (cacheConfig.enabled && globalIframeCache.size > cacheConfig.maxSize) {
    const entries = Array.from(globalIframeCache.entries())
    // 按时间戳排序，删除最旧的
    entries.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0))
    
    // 保留前 maxSize 个，删除其余的
    for (let i = cacheConfig.maxSize; i < entries.length; i++) {
      const [key, data] = entries[i]
      if (data.iframe && data.iframe.parentElement) {
        data.iframe.parentElement.removeChild(data.iframe)
      }
      globalIframeCache.delete(key)
    }
    
    if (cacheConfig.debug) {
      console.log(`🧹 清理了 ${entries.length - cacheConfig.maxSize} 个旧的 iframe 缓存`)
    }
  }
})

// MathJax typeset 封装
function renderMathJax() { typesetMath() }

// 轻量渲染：仅在流式阶段执行，避免重型 DOM 与脚本注入
async function renderLight() {
  // 仅当存在 htmath 片段时才显示加载指示
  const hasOpenOrClosed = /<htmath>[\s\S]*?$|<htmath>[\s\S]*?<\/htmath>/i.test(props.content)
  hasHtmathInContent.value = hasOpenOrClosed
  processingComplete.value = !hasOpenOrClosed
  // 针对流式内容，提前占位 <htmath>，在闭合标签出现后再异步注入 iframe
  const { replacedText, tasks } = processStreamingHtmath(props.content, props.messageId)
  renderedContent.value = await parseMarkdown(replacedText)
  // 闭合后立即（在本次 DOM 更新完成后）注入 iframe，确保与后续文本同步呈现
  if (tasks.length) {
    await nextTick()
    tasks.forEach(({ id, html }) => {
      const prev = iframeContentCache.get(id)
      if (prev !== html) {
        iframeContentCache.set(id, html)
        // 标记为当前组件使用的 iframe
        activeIframeIds.add(id)
        // 使用 iframe 管理器插入，传入视口观察回调
        iframeMgr.value.insertHtmlToDom(id, html, { observeContainer: (el) => intersectionObserver && intersectionObserver.observe(el) })
      }
    })
  }
  // 其他重处理（MathJax/<draw> 等）在流式结束时的完整渲染中统一处理
}

async function renderContent() {
  let content = props.content
  contentCopy.value = content
  // 完整渲染仅在有特殊块时短暂显示加载
  hasHtmathInContent.value = /<htmath>[\s\S]*?<\/htmath>/i.test(content)
  processingComplete.value = !hasHtmathInContent.value
  imageElements.value = []

  const drawRegex = /<draw>(.*?)<\/draw>/gs
  const drawMatches = [...content.matchAll(drawRegex)]
  const placeholderMap = new Map()

  for (let i = 0; i < drawMatches.length; i++) {
    const fullMatch = drawMatches[i][0]
    const promptText = drawMatches[i][1]
    const imageId = `img-${props.messageId}-${i}-${Date.now()}`
    const placeholder = `<div id="${imageId}" class="image-placeholder loading">正在生成图像...</div>`
    placeholderMap.set(fullMatch, { id: imageId, placeholder, promptText })
    contentCopy.value = contentCopy.value.replace(fullMatch, placeholder)
  }

  renderedContent.value = await parseMarkdown(contentCopy.value)

  const htmlRegex = /<htmath>([\s\S]*?)<\/htmath>/gi
  const htmlMatches = [...contentCopy.value.matchAll(htmlRegex)]

  for (let i = 0; i < htmlMatches.length; i++) {
    const fullMatch = htmlMatches[i][0]
    const htmlContent = htmlMatches[i][1]
    const divId = `html-${props.messageId}-${i}`
    const placeholder = `<div id="${divId}" class="html-container"></div>`
    contentCopy.value = contentCopy.value.replace(fullMatch, placeholder)
    renderedContent.value = await parseMarkdown(contentCopy.value)
    setTimeout(() => {
      // 标记为当前组件使用的 iframe
      activeIframeIds.add(divId)
      iframeMgr.value.insertHtmlToDom(divId, htmlContent, { observeContainer: (el) => intersectionObserver && intersectionObserver.observe(el) })
    }, 0)
  }

  if (drawMatches.length === 0 && htmlMatches.length === 0) {
    renderedContent.value = await parseMarkdown(content)
    setTimeout(renderMathJax, 50)
  }

  for (const [, data] of placeholderMap.entries()) {
    try {
      const imageData = await props.generateImage(data.promptText)
      if (imageData) {
        imageElements.value.push({ id: data.id, data: imageData, alt: data.promptText })
        setTimeout(() => insertImageToDom(data.id, imageData, data.promptText), 0)
      } else {
        const errorDiv = document.getElementById(data.id)
        if (errorDiv) {
          errorDiv.className = 'image-error'
          errorDiv.textContent = `图像生成失败: "${data.promptText}"`
        }
      }
    } catch (error) {
      console.error('处理图像标签时出错:', error)
    }
  }

  setTimeout(renderMathJax, 150)
  processingComplete.value = true
}

function insertImageToDom(id, imageData, altText) {
  const container = document.getElementById(id)
  if (container) {
    container.classList.remove('loading', 'image-placeholder')
    container.classList.add('image-container')
    container.textContent = ''
    const img = document.createElement('img')
    img.src = `data:image/jpeg;base64,${imageData}`
    img.alt = altText
    img.className = 'generated-image'
    container.appendChild(img)
  } else {
    console.error('找不到图像容器:', id)
  }
}

// 流式阶段 htmath 处理已抽离至 htmlProcessor.js 中

// 流式模式下，使用防抖渲染；非流式模式立即渲染
let renderTimer = null
let prevClosedCount = 0
watch(() => props.content, (newVal, oldVal) => {
  if (props.streaming) {
    const closedMatches = newVal.match(/<htmath>[\s\S]*?<\/htmath>/gi) || []
    const closedCount = closedMatches.length
    const hasNewClosed = closedCount > prevClosedCount
    // 若新闭合的 htmath 出现，立即渲染以与后续文本同步；否则采用轻量防抖
    if (hasNewClosed) {
      prevClosedCount = closedCount
      if (renderTimer) clearTimeout(renderTimer)
      renderLight()
    } else {
      if (renderTimer) clearTimeout(renderTimer)
      renderTimer = setTimeout(() => {
        renderLight()
      }, 80)
    }
  } else {
    // 非流式模式：立即完整渲染
    renderContent()
  }
}, { immediate: true })

// 监听流式状态的变化：从 true -> false 时做一次完整渲染，补齐 MathJax/iframe/图片等处理
watch(() => props.streaming, (now, prev) => {
  if (prev === true && now === false) {
    // 流式结束后，执行完整渲染
    // 先清理可能存在的防抖定时器
    if (renderTimer) clearTimeout(renderTimer)
    renderContent()
  }
})
</script>

<template>
  <div class="markdown-container">
    <div v-html="renderedContent"></div>
    <!-- MCP 工具调用状态条 -->
    <div v-if="props.toolCalls && props.toolCalls.length" class="tool-call-banner">
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
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
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
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
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
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
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
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
}

.html-container:hover {
  box-shadow: 0 6px 18px rgba(0,0,0,0.08);
  border-color: #1a73e8;
}

/* iframe 加载动画 */
.iframe-loading-indicator {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(240,240,240,0.8);
  border: 1px solid rgba(0,0,0,0.06);
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
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.generated-image {
  max-width: 100%;
  border-radius: 10px;
  margin: 15px 0;
  box-shadow: 0 6px 20px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.generated-image:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
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
  border: 1px solid rgba(0,0,0,0.06);
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
.tool-call-name { font-weight: 500; }

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
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  text-align: left;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
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
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

</style>