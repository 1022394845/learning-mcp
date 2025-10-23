<template>
  <div class="chat-view bw-ui">
    <!-- 侧边栏（移动端抽屉） -->
    <ChatSidebar
      :conversations="conversations"
      :current-conversation-id="currentConversationId"
      @new-conversation="handleNewConversation"
      @switch-conversation="handleSwitchConversation"
      @delete-conversation="handleDeleteConversation"
      @tool-selected="handleToolSelected"
      @open-settings="showSettings = true"
    />
    <!-- 移动端抽屉遮罩层 -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="toggleSidebar(false)"></div>

    <!-- 主聊天区域 -->
    <div class="chat-main">
      <!-- 顶部标题栏 -->
      <div class="chat-header">
        <div class="header-content">
          <button class="menu-btn" @click="toggleSidebar" title="菜单">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <h2 class="conversation-title">
            {{ currentConversation?.title || '新对话' }}
          </h2>
          <div class="header-actions">
            <button class="header-btn" @click="toggleTheme()" :title="`切换主题：当前${theme === 'light' ? '浅色' : '深色'}`">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>
            <button class="header-btn" @click="handleClearChat" title="清空对话">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
            <button
              v-if="isStreaming"
              class="stop-btn"
              @click="handleStopStreaming"
              title="停止生成"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
              停止
            </button>
          </div>
        </div>
      </div>

      <!-- 消息列表 -->
  <div ref="messageContainer" class="messages-container u-scrollbar">
        <div v-if="messages.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <path d="M8 10h.01M12 10h.01M16 10h.01"/>
            </svg>
          </div>
          <h3>开始新对话</h3>
          <p>输入消息或使用下方的 MCP 工具来开始对话</p>
          <div class="quick-actions">
            <button class="quick-btn" @click="handleQuickPrompt('帮我写一段Python代码')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
              写代码
            </button>
            <button class="quick-btn" @click="handleQuickPrompt('解释这段代码的功能')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              解释代码
            </button>
            <button class="quick-btn" @click="handleQuickPrompt('生成数据可视化图表')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              可视化
            </button>
          </div>
        </div>

        <TransitionGroup tag="div" :name="enableMessageTransition ? 'list' : ''" class="message-list">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message-wrapper"
            :class="message.role"
          >
            <div class="message-avatar">
              <div v-if="message.role === 'user'" class="avatar user-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div v-else class="avatar assistant-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
            </div>
            
            <div class="message-content">
              <div class="message-header">
                <span class="message-role">{{ message.role === 'user' ? '你' : 'AI 助手' }}</span>
                <span class="message-time">{{ formatMessageTime(message.timestamp) }}</span>
              </div>
              
              <div class="message-body">
                <!-- 仅渲染 AI 消息；用户消息以纯文本显示，避免解析/执行 -->
                <template v-if="message.role === 'assistant'">
                  <MarkdownRenderer
                    :content="message.content"
                    :message-id="message.id"
                    :generate-image="generateImage"
                    :streaming="message.streaming"
                    :tool-calls="message.toolCalls || []"
                  />

                  <div v-if="message.streaming" class="streaming-indicator">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                  </div>
                </template>
                <template v-else>
                  <div class="user-message-text" v-text="message.content"></div>
                </template>
              </div>

              <!-- 消息操作按钮 -->
              <div v-if="!message.streaming && message.role === 'assistant'" class="message-actions">
                <button class="action-btn" @click="handleCopyMessage(message.content)" title="复制">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
                <button class="action-btn" @click="handleRegenerateResponse(message)" title="重新生成">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </button>
                <button class="action-btn" @click="exportMessageAsHtml(message)" title="导出到网页">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v10"/>
                    <path d="M19 12l-7 7-7-7"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <div class="input-area-inner">
          <!-- 工具栏 -->
          <ToolBar
            :active-tool="activeTool"
            :tool-tip="toolTip"
            :uploaded-files="uploadedFiles"
            @tool-click="handleToolClick"
            @file-upload="handleFileUpload"
            @remove-file="handleRemoveFile"
          />

          <!-- 输入框 -->
          <div class="input-container">
            <textarea
              ref="inputTextarea"
              v-model="inputMessage"
              class="message-input"
              placeholder="输入消息... (Shift+Enter 换行，Enter 发送)"
              rows="1"
              @keydown="handleKeyDown"
              @input="handleInputResize"
            ></textarea>
            
            <button
              class="send-btn"
              :disabled="!inputMessage.trim() || isStreaming"
              @click="handleSendMessage"
              title="发送消息 (Enter)"
            >
              <svg v-if="!isStreaming" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
              <span v-else class="sending-spinner"></span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置对话框组件 -->
    <SettingsModal v-model:visible="showSettings" v-model:apiUrl="apiUrl" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import ChatSidebar from '../components/ChatSidebar.vue'
import ToolBar from '../components/ToolBar.vue'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import SettingsModal from '../components/SettingsModal.vue'
import { useChat } from '../composables/useChat'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// 聊天数据
const {
  conversations,
  currentConversationId,
  currentConversation,
  messages,
  isStreaming,
  createConversation,
  switchConversation,
  deleteConversation,
  sendMessage,
  stopStreaming,
  loadConversations,
  autoSave
} = useChat()

// UI 状态
const inputMessage = ref('')
const inputTextarea = ref(null)
const messageContainer = ref(null)
const activeTool = ref(null)
const toolTip = ref('')
const uploadedFiles = ref([])
const showSettings = ref(false)
const apiUrl = ref('http://localhost:10001/api/v1/chat/sse')
const sidebarOpen = ref(false)
const theme = ref(localStorage.getItem('theme') || '') // ''=跟随系统, 或 'light'/'dark'
const toast = useToast()
const confirmDialog = useConfirm()

// 初始化
onMounted(() => {
  loadConversations()
  if (!currentConversationId.value) {
    createConversation()
  }
  applyTheme(theme.value)
})

// 自动保存
watch([conversations, messages], () => {
  autoSave()
}, { deep: true })

// 自动滚动到底部
watch(messages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

// 处理消息发送
async function handleSendMessage() {
  const message = inputMessage.value.trim()
  if (!message || isStreaming.value) return

  inputMessage.value = ''
  handleInputResize()

  try {
    await sendMessage(message, {
      apiUrl: apiUrl.value
    })
  } catch (error) {
    console.error('发送消息失败:', error)
    toast.error('发送失败，请稍后重试')
  }
}

// 快速提示
function handleQuickPrompt(prompt) {
  inputMessage.value = prompt
  nextTick(() => {
    inputTextarea.value?.focus()
  })
}

// 停止流式输出
function handleStopStreaming() {
  stopStreaming()
  toast.warning('已停止生成')
}

// 复制消息
async function handleCopyMessage(content) {
  try {
    await navigator.clipboard.writeText(content)
    toast.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    toast.error('复制失败')
  }
}

// 重新生成回复
function handleRegenerateResponse(message) {
  // 找到该消息对应的用户消息
  const messageIndex = messages.value.findIndex(m => m.id === message.id)
  if (messageIndex > 0) {
    const userMessage = messages.value[messageIndex - 1]
    if (userMessage.role === 'user') {
      // 删除当前 AI 回复，重新发送
      messages.value.splice(messageIndex, 1)
      handleSendMessage()
      inputMessage.value = userMessage.content
      nextTick(() => {
        handleSendMessage()
      })
      toast.info('正在重新生成回复')
    }
  }
}

// 清空对话
async function handleClearChat() {
  const ok = await confirmDialog.confirm('确定要清空当前对话吗?', { title: '清空对话' })
  if (!ok) return
  messages.value = []
  if (currentConversation.value) {
    currentConversation.value.messages = []
  }
  toast.success('对话已清空')
}

// 会话管理
function handleNewConversation() {
  createConversation()
}

const enableMessageTransition = ref(true) // 启用消息过渡动效
function handleSwitchConversation(id) {
   enableMessageTransition.value = false
  switchConversation(id)
  nextTick(()=>{
    enableMessageTransition.value = true
  })
}

async function handleDeleteConversation(id) {
  const ok = await confirmDialog.confirm('确定要删除这个对话吗?', { title: '删除对话' })
  if (!ok) return
  deleteConversation(id)
  toast.success('已删除对话')
}

// 工具处理
function handleToolSelected(tool) {
  activeTool.value = tool
  updateToolTip(tool)
}

function handleToolClick(tool) {
  activeTool.value = activeTool.value === tool ? null : tool
  updateToolTip(tool)
}

function updateToolTip(tool) {
  const tips = {
    code: '提示: 使用 <draw>描述</draw> 生成图像，使用 <htmath>HTML</htmath> 插入可视化',
    file: '已选择文件上传功能，文件将随消息一起发送',
    visualization: '提示: 描述你想要的图表类型和数据，AI 将生成可视化代码',
    image: '提示: 使用 <draw>描述</draw> 标签包裹图像描述',
    emoji: '插入表情符号'
  }
  toolTip.value = activeTool.value === tool ? tips[tool] || '' : ''
}

// 文件处理
function handleFileUpload(files) {
  uploadedFiles.value.push(...files)
  // 实际应用中这里会上传文件到服务器或转为 base64
  const count = files?.length || 0
  toast.success(count > 1 ? `已添加 ${count} 个文件` : '已添加 1 个文件')
}

function handleRemoveFile(index) {
  uploadedFiles.value.splice(index, 1)
  toast.info('已移除文件')
}

// 输入框自动调整高度
function handleInputResize() {
  const textarea = inputTextarea.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
  }
}

// 键盘事件
function handleKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSendMessage()
  }
}

// 滚动到底部
function scrollToBottom() {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
}

// 格式化时间
function formatMessageTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 图像生成 (对接原有功能)
async function generateImage(prompt) {
  // 这里对接实际的图像生成 API
  console.log('生成图像:', prompt)
  return null // 暂不实现
}

// 响应式：切换侧边栏（仅移动端可见按钮）
function toggleSidebar(force) {
  const isMobile = window.matchMedia && window.matchMedia('(max-width: 1024px)').matches
  if (isMobile) {
    sidebarOpen.value = typeof force === 'boolean' ? force : !sidebarOpen.value
    document.documentElement.classList.toggle('sidebar-open', sidebarOpen.value)
  } else {
    // 桌面端：折叠/展开侧边栏
    const collapsed = document.documentElement.classList.toggle('sidebar-collapsed')
    // 同步状态，仅用于逻辑一致（桌面端不显示遮罩）
    sidebarOpen.value = !collapsed
  }
}

function applyTheme(mode) {
  if (mode === 'light' || mode === 'dark') {
    document.documentElement.setAttribute('data-theme', mode)
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : theme.value === 'dark' ? '' : 'light'
  applyTheme(theme.value)
  if (theme.value) {
    localStorage.setItem('theme', theme.value)
  } else {
    localStorage.removeItem('theme')
  }
}

// 导出 AI 回复为单页 HTML（包含 <htmath> 可视化）
function exportMessageAsHtml(message) {
  try {
    const title = (currentConversation.value?.title || '导出').trim()
    const filename = sanitizeFilename(title) + '.html'
    const content = message?.content || ''

    // 提取 <htmath> 块，使用占位符元素替换（避免被 DOMPurify 去除注释）
    const blocks = []
    let replaced = content
    const htmathRegex = /<htmath>([\s\S]*?)<\/htmath>/gi
    let index = 0
    replaced = replaced.replace(htmathRegex, (_full, inner) => {
      index += 1
      const id = `html-${message.id}-${index}`
      blocks.push({ id, html: inner })
      return `<div data-htmath-placeholder="${id}"></div>`
    })

    // 渲染 Markdown（不包含 iframe），然后进行安全过滤
    const rawHtml = marked.parse(replaced)
    const safeHtml = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['div','style','img','table','thead','tbody','tr','th','td','pre','code','blockquote','hr','span','strong','em','ul','ol','li','h1','h2','h3','h4','h5','h6','p','a'],
      ADD_ATTR: ['id','class','style','src','alt','title','href','target','rel','data-htmath-placeholder'],
      ALLOW_DATA_ATTR: true
    })

    // 插回 iframe（使用 srcdoc 内联，可自适应高度）
    let bodyHtml = safeHtml
    for (const { id, html } of blocks) {
      const iframe = buildHtmathIframe(id, html)
      const phRe = new RegExp(`<div[^>]*data-htmath-placeholder=["']${id}["'][^>]*><\\/div>`, 'i')
      bodyHtml = bodyHtml.replace(phRe, `<div class="html-container">${iframe}</div>`)
    }

    const pageHtml = buildStandaloneHtml(title, bodyHtml)
    const blob = new Blob([pageHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast?.success && toast.success('已导出网页')
  } catch (e) {
    console.error('导出失败', e)
    toast?.error && toast.error('导出失败')
  }
}

function sanitizeFilename(name) {
  const base = (name || '导出').replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, 60)
  return base || '导出'
}

function escapeHtmlAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtmathIframe(id, innerHtml) {
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

  const lightBaseStyle = `
      <style>
        :root { color-scheme: light; }
        html, body { background: #ffffff; color: #111; margin:0; padding:12px; }
        a { color: #1a73e8; }
        table { border-color: #e5e7eb; }
        pre, code { background: #f8fafc; color: #0f172a; }
      </style>`

  let srcdocHtml = innerHtml
  if (/<html[\s\S]*<\/html>/i.test(srcdocHtml)) {
    if (/<\/head>/i.test(srcdocHtml)) {
      srcdocHtml = srcdocHtml.replace(/<\/head>/i, `${lightBaseStyle}</head>`)
    } else {
      srcdocHtml = lightBaseStyle + srcdocHtml
    }
    if (/<\/body>/i.test(srcdocHtml)) {
      srcdocHtml = srcdocHtml.replace(/<\/body>/i, `${resizeScript}</body>`)
    } else {
      srcdocHtml = srcdocHtml + resizeScript
    }
  } else {
    srcdocHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${lightBaseStyle}${resizeScript}</head><body>${srcdocHtml}</body></html>`
  }

  const srcdocEscaped = escapeHtmlAttr(srcdocHtml)
  return `<iframe id="${id}" sandbox="allow-scripts allow-forms allow-pointer-lock allow-modals allow-popups" referrerpolicy="no-referrer" style="width:100%;border:0;display:block;overflow:hidden;min-height:120px" srcdoc="${srcdocEscaped}"></iframe>`
}

function buildStandaloneHtml(title, bodyHtml) {
  const parentResize = `
    <script>
      window.addEventListener('message', function(ev){
        var d = ev.data;
        if(d && d.__htmath && d.id && typeof d.height === 'number'){
          var ifr = document.getElementById(d.id);
          if(ifr){ ifr.style.height = Math.max(120, d.height) + 'px'; }
        }
      });
    <\/script>`

  const baseStyles = `
    <style>
      body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#fafafa; color:#111; margin:0; padding:24px; }
      .markdown-container { line-height:1.6; max-width: 960px; margin: 0 auto; }
      .markdown-container pre { background:#f6f8fa; border:1px solid rgba(0,0,0,0.08); border-radius:10px; padding:16px; overflow:auto; }
      .markdown-container code { background: rgba(175,184,193,0.25); border-radius:6px; padding:0.2em 0.4em; }
      .markdown-container img { max-width:100%; border-radius:8px; }
      .html-container { margin:20px 0; padding:0; border:0; }
      h1,h2,h3,h4,h5,h6 { color:#111; }
      a { color:#1a73e8; }
    </style>`

  // 可选：MathJax（与在线渲染一致）
  const mathjax = `
    <script>
      window.MathJax = {
        tex: { inlineMath: [['$','$'], ['\\(','\\)']], displayMath: [['$$','$$'], ['\\[','\\]']], processEscapes: true },
        svg: { fontCache: 'global' }
      };
    <\/script>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" async><\/script>`

  return `<!DOCTYPE html>
  <html lang="zh-CN">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtmlAttr(title)}</title>
      ${baseStyles}
    </head>
    <body>
      <div class="markdown-container">
        ${bodyHtml}
      </div>
      ${parentResize}
      ${mathjax}
    </body>
  </html>`
}
</script>

<style scoped>
.chat-view { display: flex; height: 100vh; background: var(--bg); }
.chat-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

/* 顶部标题栏 */
.chat-header {
  background: var(--bg-elev-1);
  border-bottom: 1px solid var(--border);
  padding: 12px 16px;
}
.header-content { display: inline-flex; align-items: center; gap: var(--space-3); width: 100%; }
.menu-btn { display: inline-flex; padding: 8px; background: var(--bg-elev-2); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--fg); transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out); }
.conversation-title { font-size: 18px; font-weight: 700; color: var(--fg); margin: 0; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.header-actions { display: inline-flex; gap: 8px; margin-left: auto; }
.header-btn, .stop-btn { padding: 8px 12px; background: var(--bg-elev-2); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--fg); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px; transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out); }
.stop-btn { border-color: var(--border-strong); }

/* 消息容器 */
.messages-container { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 16px; scroll-behavior: smooth; }
.empty-state { display: grid; place-items: center; min-height: 100%; color: var(--fg-muted); text-align: center; padding: 40px; }
.empty-icon { margin-bottom: 20px; opacity: 0.6; }
.empty-state h3 { font-size: 22px; margin-bottom: 10px; color: var(--fg); }
.empty-state p { font-size: 14px; color: var(--fg-dim); margin-bottom: 20px; }
/* 用户消息纯文本渲染，保持换行 */
.user-message-text { white-space: pre-wrap; color: var(--fg); line-height: 1.6; }
.quick-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.quick-btn { padding: 8px 14px; background: var(--bg-elev-2); border: 1px solid var(--border); border-radius: 999px; color: var(--fg); cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; }

/* 消息样式 */
.message-wrapper { display: flex; gap: 12px; margin-bottom: 20px; max-width: var(--container-max); margin-left: auto; margin-right: auto; }
.message-avatar { flex-shrink: 0; }
.avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--bg-elev-2); color: var(--fg); border: 1px solid var(--border); }
.message-content { flex: 1; min-width: 0; }
.message-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.message-role { font-size: 12px; font-weight: 700; color: var(--fg); }
.message-time { font-size: 11px; color: var(--fg-dim); }
.message-body { background: var(--bg-elev-1); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px; position: relative; transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out); }
.message-wrapper.user .message-body { background: var(--bg-elev-2); }
.streaming-indicator { display: flex; gap: 4px; margin-top: 8px; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); opacity: .6; animation: dotPulse 1.4s infinite; }
.dot:nth-child(2) { animation-delay: .2s; }
.dot:nth-child(3) { animation-delay: .4s; }
@keyframes dotPulse { 0%, 60%, 100% { opacity:.3; transform: scale(.8); } 30% { opacity: 1; transform: scale(1);} }
.message-actions { display: flex; gap: 6px; margin-top: 8px; }
.action-btn { padding: 6px 10px; background: var(--bg-elev-2); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--fg); cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px; transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out); }

/* 输入区域 */
.input-area { background: var(--bg-elev-1); border-top: 1px solid var(--border); padding: 16px; }
.input-area-inner { display: flex; flex-direction: column; gap: 12px; max-width: var(--container-max); margin: 0 auto; }
.input-container { display: flex; gap: 10px; align-items: flex-end; }
.message-input { flex: 1; padding: 12px 14px; background: var(--bg-elev-2); border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 14px; font-family: inherit; resize: none; min-height: 44px; max-height: 200px; color: var(--fg); }
.message-input:focus { border-color: var(--border-strong); box-shadow: var(--focus-ring); }
.send-btn { padding: 12px 16px; background: var(--bg-elev-2); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; min-width: 48px; height: 44px; transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out); }
.send-btn:disabled { opacity: .5; }
.sending-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3); border-top-color: var(--fg); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 设置模态框样式已迁移至 SettingsModal 组件 */

/* 滚动条 */
.messages-container::-webkit-scrollbar { width: 8px; }
.messages-container:hover::-webkit-scrollbar-thumb { background: #2e2e2e; border-radius: 8px; }

/* 响应式：移动端隐藏侧边栏，使用顶部菜单按钮唤起 */
@media (max-width: 1024px) {
  .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 40; }
}

/* 消息进入动画 */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
.list-leave-active {
  position: absolute;
}
</style>
