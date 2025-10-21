<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps({
  content: { type: String, required: true },
  generateImage: { type: Function, required: true },
  messageId: { type: String, required: true },
  // 新增：支持流式输出模式
  streaming: { type: Boolean, default: false }
})

const renderedContent = ref('')
// 仅在检测到 htmath 且处于流式阶段时展示加载指示
const processingComplete = ref(false)
const hasHtmathInContent = ref(false)
const imageElements = ref([])
const contentCopy = ref('')
const iframeRegistry = new Map()
let iframeResizeListenerInstalled = false
// 记录已插入的 iframe 内容，避免在流式轻量渲染中重复注入
const iframeContentCache = new Map()

onMounted(() => {
  DOMPurify.addHook('afterSanitizeAttributes', function(node) {
    if (node.tagName === 'IMG' && node.getAttribute('src')) {
      const src = node.getAttribute('src')
      if (src.startsWith('data:image/')) return node
    }
  })

  if (!window.MathJax) {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
    script.async = true
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true
      },
      svg: { fontCache: 'global' }
    }
    document.head.appendChild(script)
  }

  // 不再同步父文档主题：iframe 固定浅色
})

function renderMathJax() {
  if (window.MathJax) {
    if (window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise().catch((err) => console.error('MathJax处理失败:', err))
    } else if (window.MathJax.Hub) {
      window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub])
    }
  }
}

// 轻量渲染：仅在流式阶段执行，避免重型 DOM 与脚本注入
async function renderLight() {
  // 仅当存在 htmath 片段时才显示加载指示
  const hasOpenOrClosed = /<htmath>[\s\S]*?$|<htmath>[\s\S]*?<\/htmath>/i.test(props.content)
  hasHtmathInContent.value = hasOpenOrClosed
  processingComplete.value = !hasOpenOrClosed
  // 针对流式内容，提前占位 <htmath>，在闭合标签出现后再异步注入 iframe
  const { replacedText, tasks } = processStreamingHtmath(props.content)
  renderedContent.value = await parseMarkdown(replacedText)
  // 闭合后立即（在本次 DOM 更新完成后）注入 iframe，确保与后续文本同步呈现
  if (tasks.length) {
    await nextTick()
    tasks.forEach(({ id, html }) => {
      const prev = iframeContentCache.get(id)
      if (prev !== html) {
        iframeContentCache.set(id, html)
        insertHtmlToDom(id, html)
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
    const divId = `html-${props.messageId}-${i}-${Date.now()}`
    const placeholder = `<div id="${divId}" class="html-container"></div>`
    contentCopy.value = contentCopy.value.replace(fullMatch, placeholder)
    renderedContent.value = await parseMarkdown(contentCopy.value)
    setTimeout(() => insertHtmlToDom(divId, htmlContent), 0)
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

async function parseMarkdown(text) {
  return DOMPurify.sanitize(marked.parse(text), {
    ADD_TAGS: ['div', 'style', 'img'],
    ADD_ATTR: ['id', 'class', 'style', 'src']
  })
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

// 使用 sandboxed iframe 渲染 <htmath> 内容
function insertHtmlToDom(id, htmlContent) {
  try {
    const container = document.getElementById(id)
    if (!container) return

    // 先放置加载指示器
    container.innerHTML = '<div class="iframe-loading-indicator"><div class="spinner"></div><span>正在加载可视化...</span></div>'
    const resizeScript = `
      <script>(function(){
        function send(){
          try {
            var h = Math.max(
              document.documentElement ? document.documentElement.scrollHeight : 0,
              document.body ? document.body.scrollHeight : 0,
              document.documentElement ? document.documentElement.offsetHeight : 0,
              document.body ? document.body.offsetHeight : 0
            );
            parent.postMessage({__htmath:true, id: '${id}', height: h}, '*');
          } catch(e) {}
        }
        window.addEventListener('load', send);
        window.addEventListener('resize', send);
        var mo = new MutationObserver(function(){ send(); });
        mo.observe(document.documentElement || document.body, {subtree:true, childList:true, attributes:true, characterData:true});
        setTimeout(send, 0);
      })();<\/script>`

    // 固定浅色基础样式
    const lightBaseStyle = `
      <style>
        :root { color-scheme: light; }
        html, body { background: #ffffff; color: #111; }
        a { color: #1a73e8; }
        table { border-color: #e5e7eb; }
        pre, code { background: #f8fafc; color: #0f172a; }
      </style>`

    let srcdocHtml = htmlContent
    if (/<html[\s\S]*<\/html>/i.test(srcdocHtml)) {
      if (/<\/body>/i.test(srcdocHtml)) {
        srcdocHtml = srcdocHtml.replace(/<\/head>/i, `${lightBaseStyle}</head>`)
        srcdocHtml = srcdocHtml.replace(/<\/body>/i, `${resizeScript}</body>`)
      } else {
        srcdocHtml = lightBaseStyle + srcdocHtml + resizeScript
      }
    } else {
      srcdocHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${lightBaseStyle}${resizeScript}</head><body>${srcdocHtml}</body></html>`
    }

    const iframe = document.createElement('iframe')
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-pointer-lock allow-modals allow-popups')
    iframe.setAttribute('referrerpolicy', 'no-referrer')
    iframe.style.width = '100%'
    iframe.style.border = '0'
    iframe.style.display = 'block'
    iframe.style.overflow = 'hidden'
    iframe.style.minHeight = '120px'
    iframe.srcdoc = srcdocHtml

    // iframe onload 时移除加载指示器
    iframe.addEventListener('load', () => {
      const indicator = container.querySelector('.iframe-loading-indicator')
      if (indicator) indicator.remove()
    })

    iframeRegistry.set(id, iframe)
    if (!iframeResizeListenerInstalled) {
      window.addEventListener('message', (ev) => {
        const data = ev.data
        if (data && data.__htmath && data.id && typeof data.height === 'number') {
          const ifr = iframeRegistry.get(data.id)
          if (ifr) {
            const h = Math.max(120, data.height)
            ifr.style.height = h + 'px'
            // 首次收到高度更新时，也可移除加载指示器
            const parent = ifr.parentElement
            const indicator = parent && parent.querySelector ? parent.querySelector('.iframe-loading-indicator') : null
            if (indicator) indicator.remove()
          }
        }
      })
      iframeResizeListenerInstalled = true
    }

    container.appendChild(iframe)
  } catch (error) {
    console.error('处理HTML标签时出错:', error, error.stack)
  }
}

// 在流式阶段对 <htmath> 进行占位/就地完成的轻量处理
function processStreamingHtmath(text) {
  const openTag = '<htmath>'
  const closeTag = '</htmath>'
  let cursor = 0
  let index = 0
  const parts = []
  const tasks = [] // [{id, html}]

  while (true) {
    const start = text.indexOf(openTag, cursor)
    if (start === -1) {
      parts.push(text.slice(cursor))
      break
    }
    // 追加开标签前的普通文本
    parts.push(text.slice(cursor, start))
    index += 1
    const id = `html-${props.messageId}-${index}`
    const end = text.indexOf(closeTag, start + openTag.length)
    if (end === -1) {
      // 未闭合：放置“正在加载可视化...”占位，截断后续内容（后续内容视为 htmath 内部，避免闪烁）
      parts.push(
        `<div id="${id}" class="html-container"><div class="iframe-loading-indicator"><div class="spinner"></div><span>正在加载可视化...</span></div></div>`
      )
      // 将游标移至末尾并结束循环（其后文本将随流式继续到达）
      cursor = text.length
      break
    } else {
      // 已闭合：占位并安排 iframe 注入任务
      const innerHtml = text.slice(start + openTag.length, end)
      parts.push(`<div id="${id}" class="html-container"></div>`)
      tasks.push({ id, html: innerHtml })
      cursor = end + closeTag.length
    }
  }

  return { replacedText: parts.join(''), tasks }
}

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