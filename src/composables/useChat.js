import { ref, computed } from 'vue'

// 聊天会话管理
export function useChat() {
  const conversations = ref([]) // 所有会话列表
  const currentConversationId = ref(null)
  const messages = ref([]) // 当前会话的消息
  const isStreaming = ref(false)
  const currentStreamingMessage = ref(null)
  let abortController = null

  // 当前会话
  const currentConversation = computed(() => {
    return conversations.value.find(c => c.id === currentConversationId.value)
  })

  // 创建新会话
  function createConversation(title = '新对话') {
    const conversation = {
      id: Date.now().toString(),
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: []
    }
    conversations.value.unshift(conversation)
    currentConversationId.value = conversation.id
    messages.value = []
    return conversation
  }

  // 切换会话
  function switchConversation(conversationId) {
    const conv = conversations.value.find(c => c.id === conversationId)
    if (conv) {
      currentConversationId.value = conversationId
      messages.value = [...conv.messages]
    }
  }

  // 删除会话
  function deleteConversation(conversationId) {
    const index = conversations.value.findIndex(c => c.id === conversationId)
    if (index > -1) {
      conversations.value.splice(index, 1)
      if (currentConversationId.value === conversationId) {
        if (conversations.value.length > 0) {
          switchConversation(conversations.value[0].id)
        } else {
          createConversation()
        }
      }
    }
  }

  // 添加消息
  function addMessage(role, content, metadata = {}) {
    const message = {
      id: Date.now().toString() + Math.random(),
      role, // 'user' | 'assistant' | 'system'
      content,
      timestamp: new Date(),
      streaming: false,
      // 新增：MCP 工具调用状态（仅助手消息使用）
      toolCalls: [],
      ...metadata
    }
    messages.value.push(message)
    
    // 更新当前会话
    if (currentConversation.value) {
      currentConversation.value.messages = [...messages.value]
      currentConversation.value.updatedAt = new Date()
      
      // 自动更新会话标题（使用第一条用户消息）
      if (currentConversation.value.messages.length === 1 && role === 'user') {
        currentConversation.value.title = content.slice(0, 30) + (content.length > 30 ? '...' : '')
      }
    }
    
    return message
  }

  // 更新消息内容（用于流式输出）
  function updateMessage(messageId, content) {
    const message = messages.value.find(m => m.id === messageId)
    if (message) {
      message.content = content
      message.timestamp = new Date()
      
      // 同步更新会话记录
      if (currentConversation.value) {
        const convMessage = currentConversation.value.messages.find(m => m.id === messageId)
        if (convMessage) {
          convMessage.content = content
          convMessage.timestamp = new Date()
        }
      }
    }
  }

  // 新增：更新消息的工具调用列表（用于在 UI 中展示“正在调用工具 ...”）
  function updateToolCalls(messageId, toolCalls) {
    const message = messages.value.find(m => m.id === messageId)
    if (message) {
      message.toolCalls = Array.isArray(toolCalls) ? [...toolCalls] : []
      message.timestamp = new Date()
    }

    // 同步更新当前会话中的对应消息
    if (currentConversation.value) {
      const convMessage = currentConversation.value.messages.find(m => m.id === messageId)
      if (convMessage) {
        convMessage.toolCalls = Array.isArray(toolCalls) ? [...toolCalls] : []
        convMessage.timestamp = new Date()
      }
    }
  }

  // 标记消息流式状态结束
  function finishStreaming(messageId) {
    const message = messages.value.find(m => m.id === messageId)
    if (message) {
      message.streaming = false
    }
    isStreaming.value = false
    currentStreamingMessage.value = null
  }

  // 发送消息并接收流式响应
  async function sendMessage(userMessage, options = {}) {
    const {
      apiUrl = 'http://localhost:10001/api/v1/chat/sse',
      onChunk = null,
      onError = null,
      onComplete = null
    } = options

    // 添加用户消息
    addMessage('user', userMessage)

    // 创建助手消息占位
    const assistantMessage = addMessage('assistant', '', { streaming: true })
    isStreaming.value = true
    currentStreamingMessage.value = assistantMessage

  let accumulatedText = ''

    try {
      // 使用 fetch + ReadableStream 处理 SSE
      abortController = new AbortController()
      const response = await fetch(`${apiUrl}?message=${encodeURIComponent(userMessage)}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
        },
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

  const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }
    
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
    
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const dataStr = line.trim().substring(6)
            try {
              const data = JSON.parse(dataStr)
              // 1) 普通文本增量
              if (data.text) {
                accumulatedText += data.text
                updateMessage(assistantMessage.id, accumulatedText)
                
                if (onChunk) {
                  onChunk(data.text, accumulatedText)
                }
              }
              // 2) MCP 工具调用提示（仅展示状态与名称）
              if (Array.isArray(data.tool_calls) && data.tool_calls.length > 0) {
                const names = data.tool_calls
                  .map(tc => (tc?.function?.name || tc?.custom?.name || tc?.type || '工具'))
                  .filter(Boolean)
                updateToolCalls(assistantMessage.id, names)
              }
              // 3) MCP 工具返回结果：将结果拼接到内容，并清除“调用中”提示
              if (data.result) {
                const raw = typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2)
                const resultStr = decodeEscapedNewlines(raw)
                accumulatedText += resultStr
                updateMessage(assistantMessage.id, accumulatedText)
                updateToolCalls(assistantMessage.id, [])
                if (onChunk) {
                  onChunk(resultStr, accumulatedText)
                }
              }
            } catch (e) {
              console.warn('解析 JSON 失败:', dataStr, e)
            }
          }
        }
      }

      finishStreaming(assistantMessage.id)
      if (onComplete) {
        onComplete(accumulatedText)
      }

      return accumulatedText

    } catch (error) {
      console.error('发送消息失败:', error)
      // 如果是用户主动中断，不视为错误，不覆盖已有内容
      if (error.name === 'AbortError') {
        finishStreaming(assistantMessage.id)
        return accumulatedText
      }
      updateMessage(assistantMessage.id, '抱歉，发送消息时出现错误。请稍后重试。')
      finishStreaming(assistantMessage.id)
      
      if (onError) {
        onError(error)
      }
      
      throw error
    } finally {
      // 清理控制器
      abortController = null
    }
  }

  // 停止当前流式输出
  function stopStreaming() {
    // 优先切断与后端的连接
    if (abortController) {
      try { abortController.abort() } catch (e) { /* noop */ }
    }
    // 立即更新 UI，停止流式动画
    if (currentStreamingMessage.value) {
      // 清除工具调用提示
      try { updateToolCalls(currentStreamingMessage.value.id, []) } catch(_) {}
      finishStreaming(currentStreamingMessage.value.id)
    }
  }

  // 从 localStorage 加载会话
  function loadConversations() {
    try {
      const saved = localStorage.getItem('chat_conversations')
      if (saved) {
        const parsed = JSON.parse(saved)
        conversations.value = parsed.map(c => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }))
        
        if (conversations.value.length > 0) {
          switchConversation(conversations.value[0].id)
        }
      }
      
      // 如果没有会话，创建一个
      if (conversations.value.length === 0) {
        createConversation()
      }
    } catch (error) {
      console.error('加载会话失败:', error)
      createConversation()
    }
  }

  // 保存会话到 localStorage
  function saveConversations() {
    try {
      localStorage.setItem('chat_conversations', JSON.stringify(conversations.value))
    } catch (error) {
      console.error('保存会话失败:', error)
    }
  }

  // 自动保存（监听变化）
  let saveTimer = null
  function autoSave() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveConversations()
    }, 1000)
  }

  return {
    // 状态
    conversations,
    currentConversationId,
    currentConversation,
    messages,
    isStreaming,
    currentStreamingMessage,
    
    // 方法
    createConversation,
    switchConversation,
    deleteConversation,
    addMessage,
    updateMessage,
    updateToolCalls,
    sendMessage,
    stopStreaming,
    loadConversations,
    saveConversations,
    autoSave
  }

  // 将形如 "\n" 的转义序列还原为实际换行/制表符，避免在 Markdown 中显示为字面量
  function decodeEscapedNewlines(str) {
    if (typeof str !== 'string') return str
    if (str.indexOf('\\') === -1) return str
    // 优先处理常见组合与顺序，避免重复替换导致的错位
    let s = str
    s = s.replace(/\\r\\n/g, '\r\n')
    s = s.replace(/\\n/g, '\n')
    s = s.replace(/\\r/g, '\r')
    s = s.replace(/\\t/g, '\t')
    return s
  }
}

// 图像生成工具（保持原有功能）
export async function generateImage(prompt) {
  // 这里可以接入实际的图像生成 API
  console.log('生成图像:', prompt)
  // 返回占位符或实际的 base64 图像数据
  return null // 暂不实现，保持原组件兼容
}
