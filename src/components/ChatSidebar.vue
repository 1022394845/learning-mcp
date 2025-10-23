<template>
  <aside class="chat-sidebar bw-ui">
    <!-- 顶部操作区 -->
    <div class="sidebar-header">
      <button class="new-chat-btn" @click="$emit('new-conversation')" title="新建对话">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span>新建对话</span>
      </button>
    </div>

    <!-- 会话列表 -->
    <TransitionGroup tag="div" name="fade" class="conversations-list u-scrollbar">
      <div
        v-for="conversation in conversations"
        :key="conversation.id"
        class="conversation-item"
        :class="{ active: conversation.id === currentConversationId }"
        @click="$emit('switch-conversation', conversation.id)"
      >
        <div class="conversation-content">
          <div class="conversation-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div class="conversation-info">
            <div class="conversation-title">{{ conversation.title }}</div>
            <div class="conversation-time">{{ formatTime(conversation.updatedAt) }}</div>
          </div>
        </div>
        <button
          class="delete-btn"
          @click.stop="$emit('delete-conversation', conversation.id)"
          title="删除对话"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </TransitionGroup>

    <!-- MCP 工具入口 -->
    <div class="mcp-tools-section">
      <div class="section-title">MCP 工具</div>
      <div class="tool-list">
        <button class="tool-btn" @click="$emit('tool-selected', 'code')" title="代码运行与修改">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
          <span>代码助手</span>
        </button>
        
        <button class="tool-btn" @click="$emit('tool-selected', 'file')" title="文件上传分析">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          <span>文件分析</span>
        </button>
        
        <button class="tool-btn" @click="$emit('tool-selected', 'visualization')" title="数据可视化">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span>可视化</span>
        </button>
        
        <button class="tool-btn" @click="$emit('tool-selected', 'image')" title="图像生成">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span>图像生成</span>
        </button>

        <button class="tool-btn" @click="$emit('tool-selected', 'search')" title="知识检索">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <span>知识检索</span>
        </button>
      </div>
    </div>

    <!-- 设置区域 -->
    <div class="sidebar-footer">
      <button class="settings-btn" @click="$emit('open-settings')" title="设置">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m7.08-7.08l4.24-4.24"/>
        </svg>
        <span>设置</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  conversations: { type: Array, required: true },
  currentConversationId: { type: String, default: null }
})

defineEmits([
  'new-conversation',
  'switch-conversation',
  'delete-conversation',
  'tool-selected',
  'open-settings'
])

function formatTime(date) {
  if (!date) return ''
  const now = new Date()
  const diff = now - new Date(date)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return new Date(date).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.chat-sidebar {
  width: 300px;
  height: 100vh;
  background: var(--bg-elev-1);
  color: var(--fg);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  transition: width var(--dur-base) var(--ease-in-out), transform var(--dur-base) var(--ease-in-out);
}

.sidebar-header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--border);
}

.new-chat-btn {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--fg);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.new-chat-btn:hover { border-color: var(--border-strong); }

.conversations-list {
  position: relative;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-3) var(--space-3) 0;
}

.conversation-item {
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: var(--bg-elev-1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--border);
}

.conversation-item { transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out); }
.conversation-item:hover { border-color: var(--border-strong); }

.conversation-item.active {
  background: var(--bg-elev-2);
  border-color: var(--border-strong);
}

.conversation-content { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.conversation-icon { flex-shrink: 0; opacity: 0.9; }
.conversation-info { flex: 1; min-width: 0; }
.conversation-title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
.conversation-time { font-size: 11px; color: var(--fg-dim); }

.delete-btn {
  padding: 6px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--fg);
  cursor: pointer;
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.conversation-item:hover .delete-btn { opacity: 1; }
.delete-btn:hover { border-color: var(--border-strong); }

.mcp-tools-section {
  padding: var(--space-5) var(--space-6);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.section-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--fg-dim);
  margin-bottom: var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.tool-list { display: flex; flex-direction: column; gap: 6px; }
.tool-btn {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--fg);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
}
.tool-btn { transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out); }
.tool-btn:hover { border-color: var(--border-strong); }

.sidebar-footer { padding: 15px 20px; }
.settings-btn {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--fg);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}
.settings-btn { transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out); }
.settings-btn:hover { border-color: var(--border-strong); }

/* 滚动条 */
.conversations-list.u-scrollbar::-webkit-scrollbar { background-color: transparent; }
.conversations-list.u-scrollbar:hover::-webkit-scrollbar-thumb { background: #2e2e2e; border-radius: 8px; }

/* 响应式：移动端隐藏侧边栏，由 ChatView 控制显示 */
@media (max-width: 1024px) {
  .chat-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    transform: translateX(-100%);
    width: min(86vw, 320px);
    z-index: 50;
    box-shadow: var(--shadow);
    transition: transform var(--dur-base) var(--ease-in-out);
  }
  html.sidebar-open .chat-sidebar { transform: translateX(0); }
}

/* 桌面端可折叠：通过 html.sidebar-collapsed 收起到 0 宽 */
@media (min-width: 1025px) {
  html.sidebar-collapsed .chat-sidebar { width: 0; border-right-color: transparent; overflow: hidden; }
}

/* 动画效果 */
.fade-move, /* 对移动中的元素应用的过渡 */
.fade-enter-active,
.fade-leave-active { transition: all 0.5s ease; }

.fade-enter-from,
.fade-leave-to { opacity: 0; transform: translateX(30px); }

.fade-leave-active { position: absolute; }
</style>
