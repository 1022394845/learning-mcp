<template>
  <div class="library-manager">
    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ allLibs.length }}</div>
          <div class="stat-label">总库数</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ enabledCount }}</div>
          <div class="stat-label">已启用</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="20" height="14" x="2" y="3" rx="2"/>
            <line x1="8" x2="16" y1="21" y2="21"/>
            <line x1="12" x2="12" y1="17" y2="21"/>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ cachedCount }}</div>
          <div class="stat-label">已缓存</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
            <line x1="12" x2="12" y1="22.08" y2="12"/>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ formatSize(totalCacheSize) }}</div>
          <div class="stat-label">缓存大小</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M9 8h6v6H9z"/>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ iframeCacheSize }}</div>
          <div class="stat-label">iframe 缓存</div>
        </div>
      </div>
    </div>

    <!-- 库列表 -->
    <div class="library-list">
      <div 
        v-for="lib in allLibs" 
        :key="lib.id" 
        class="library-item"
        :class="{ 
          'library-item--enabled': lib.enabled,
          'library-item--cached': lib.cached,
          'library-item--downloading': lib.downloading
        }"
      >
        <div class="library-main">
          <div class="library-toggle">
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                :checked="lib.enabled"
                @change="toggleLibrary(lib.id, $event.target.checked)"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
          
          <div class="library-info">
            <div class="library-header">
              <h3 class="library-name">{{ lib.name }}</h3>
              <span class="library-version">v{{ lib.version }}</span>
              <div class="library-status">
                <div 
                  v-if="lib.downloading" 
                  class="status-indicator status--downloading"
                  title="下载中..."
                >
                  <div class="spinner"></div>
                </div>
                <div 
                  v-else-if="lib.enabled && lib.cached" 
                  class="status-indicator status--ready"
                  title="已启用且已缓存"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                </div>
                <div 
                  v-else-if="lib.enabled" 
                  class="status-indicator status--enabled"
                  title="已启用（需要下载时加载）"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
                  </svg>
                </div>
                <div 
                  v-else-if="lib.cached" 
                  class="status-indicator status--cached"
                  title="已缓存但未启用"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="20" height="14" x="2" y="3" rx="2"/>
                    <line x1="8" x2="16" y1="21" y2="21"/>
                    <line x1="12" x2="12" y1="17" y2="21"/>
                  </svg>
                </div>
                <div 
                  v-else 
                  class="status-indicator status--disabled"
                  title="未启用"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                </div>
              </div>
            </div>
            
            <div class="library-meta">
              <span class="meta-item">
                <span class="meta-label">全局变量:</span>
                <code class="meta-value">window.{{ lib.globalName }}</code>
              </span>
              <span class="meta-item">
                <span class="meta-label">优先级:</span>
                <span class="meta-value">{{ lib.priority }}</span>
              </span>
              <span v-if="lib.cached" class="meta-item">
                <span class="meta-label">缓存大小:</span>
                <span class="meta-value">{{ formatSize(lib.cacheSize) }}</span>
              </span>
            </div>
            
            <div v-if="lib.error" class="library-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/>
                <path d="m12 17 .01 0"/>
              </svg>
              {{ lib.error }}
            </div>
          </div>
          
          <div class="library-actions">
            <button 
              class="action-btn action-btn--download"
              :disabled="lib.downloading"
              @click="downloadLibrary(lib.id)"
              :title="lib.cached ? '更新缓存' : '下载到缓存'"
            >
              {{ lib.downloading ? '下载中...' : (lib.cached ? '更新' : '下载') }}
            </button>
            
            <button 
              v-if="lib.cached"
              class="action-btn action-btn--delete"
              @click="deleteLibraryCache(lib.id)"
              title="删除缓存"
            >
              删除
            </button>
            
            <button 
              class="action-btn action-btn--toggle"
              @click="toggleDetails(lib.id)"
              :title="expandedLibs.has(lib.id) ? '收起详情' : '展开详情'"
            >
              {{ expandedLibs.has(lib.id) ? '收起' : '详情' }}
            </button>
          </div>
        </div>
        
        <!-- 详情面板 -->
        <div v-if="expandedLibs.has(lib.id)" class="library-details">
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">CDN 地址</div>
              <code class="detail-value">{{ lib.url }}</code>
            </div>
            
            <div class="detail-item">
              <div class="detail-label">匹配模式</div>
              <div class="detail-value">{{ lib.patterns?.length || 0 }} 个正则表达式</div>
            </div>
            
            <div class="detail-item">
              <div class="detail-label">加载超时</div>
              <div class="detail-value">{{ lib.timeout }}ms</div>
            </div>
            
            <div v-if="lib.stylesheets?.length" class="detail-item">
              <div class="detail-label">样式表</div>
              <div class="detail-value">{{ lib.stylesheets.length }} 个</div>
            </div>
            
            <div v-if="lib.dependencies?.length" class="detail-item">
              <div class="detail-label">依赖</div>
              <div class="detail-value">{{ lib.dependencies.join(', ') }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮区 -->
    <div class="action-bar">
      <div class="action-group">
        <button 
          class="action-btn action-btn--primary"
          @click="downloadAllEnabledLibs"
          :disabled="enabledCount === 0"
        >
          下载所有启用的库
        </button>
        
        <button 
          class="action-btn action-btn--secondary"
          @click="exportConfig"
        >
          导出配置
        </button>
      </div>
      
      <div class="action-group">
        <button 
          class="action-btn action-btn--danger"
          @click="clearIframeCache"
        >
          清空 iframe 缓存
        </button>
        
        <button 
          class="action-btn action-btn--danger"
          @click="clearAllLibraryCache"
        >
          清空所有库缓存
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useLibraryCache } from '../composables/useLibraryCache.js'

// 使用库缓存管理
const {
  allLibs,
  enabledCount,
  cachedCount,
  totalCacheSize,
  iframeCacheSize,
  initialized,
  initialize,
  toggleLibrary,
  downloadLibrary,
  deleteLibraryCache,
  downloadAllEnabledLibs,
  clearAllLibraryCache,
  clearIframeCache,
  exportConfig,
  startPeriodicUpdate
} = useLibraryCache()

// 本地状态
const expandedLibs = ref(new Set())

// 切换详情展开状态
function toggleDetails(libId) {
  if (expandedLibs.value.has(libId)) {
    expandedLibs.value.delete(libId)
  } else {
    expandedLibs.value.add(libId)
  }
}

// 格式化文件大小
function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 生命周期
let cleanupInterval = null

onMounted(async () => {
  await initialize()
  cleanupInterval = startPeriodicUpdate()
})

onUnmounted(() => {
  if (cleanupInterval) {
    cleanupInterval()
  }
})
</script>

<style scoped>
.library-manager {
  padding: 0;
  max-width: none;
  margin: 0;
  background: transparent;
  color: var(--fg);
  min-height: auto;
}

/* 统计概览 */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-7);
}

.stat-card {
  background: var(--bg-elev-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  transition: all var(--dur-base) var(--ease-out);
}

.stat-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fg-muted);
  opacity: 0.8;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--accent);
  line-height: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--fg-muted);
  margin-top: var(--space-1);
}

/* 库列表 */
.library-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-bottom: var(--space-7);
}

.library-item {
  background: var(--bg-elev-1);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  transition: all var(--dur-base) var(--ease-out);
  overflow: hidden;
}

.library-item:hover {
  border-color: var(--border);
}

.library-item--enabled {
  border-color: var(--accent-weak);
}

.library-item--cached {
  background: var(--bg-elev-2);
}

.library-item--downloading {
  border-color: var(--accent);
}

.library-main {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5);
}

.library-toggle {
  margin-top: var(--space-1);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-elev-3);
  border: 1px solid var(--border);
  transition: var(--dur-base);
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: var(--fg-muted);
  transition: var(--dur-base);
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--accent);
  border-color: var(--accent);
}

input:checked + .toggle-slider:before {
  transform: translateX(24px);
  background-color: var(--bg);
}

.library-info {
  flex: 1;
  min-width: 0;
}

.library-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.library-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--fg);
  margin: 0;
}

.library-version {
  font-size: 0.75rem;
  color: var(--fg-muted);
  background: var(--bg-elev-3);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.library-status {
  margin-left: auto;
}

.status-indicator {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid var(--border);
}

.status--ready {
  background: var(--accent);
  color: var(--bg);
  border-color: var(--accent);
}

.status--enabled {
  background: var(--bg-elev-3);
  color: var(--accent);
  border-color: var(--accent-weak);
}

.status--cached {
  background: var(--bg-elev-3);
  color: var(--fg-muted);
}

.status--disabled {
  background: var(--bg-elev-2);
  color: var(--fg-dim);
}

.status--downloading {
  background: var(--bg-elev-3);
  border-color: var(--accent);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-top: 2px solid var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.library-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.875rem;
}

.meta-label {
  color: var(--fg-muted);
}

.meta-value {
  color: var(--fg);
}

code.meta-value {
  background: var(--code-bg);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  border: 1px solid var(--code-border);
}

.library-error {
  color: #ef4444;
  font-size: 0.875rem;
  background: rgba(239, 68, 68, 0.1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(239, 68, 68, 0.2);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.library-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: stretch;
  min-width: 120px;
}

.action-btn {
  padding: var(--space-2) var(--space-3);
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elev-2);
  color: var(--fg);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  white-space: nowrap;
}

.action-btn:hover:not(:disabled) {
  border-color: var(--border-strong);
  background: var(--bg-elev-3);
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn--download {
  background: var(--accent);
  color: var(--bg);
  border-color: var(--accent);
}

.action-btn--download:hover:not(:disabled) {
  background: var(--accent-weak);
}

.action-btn--delete {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.action-btn--delete:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
}

.action-btn--toggle {
  font-size: 0.75rem;
  opacity: 0.8;
}

/* 详情面板 */
.library-details {
  border-top: 1px solid var(--border);
  padding: var(--space-5);
  background: var(--bg-elev-2);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-4);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.detail-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.detail-value {
  font-size: 0.875rem;
  color: var(--fg);
  word-break: break-all;
}

code.detail-value {
  background: var(--code-bg);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  border: 1px solid var(--code-border);
  word-break: break-all;
}

/* 操作按钮区 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-6);
  background: var(--bg-elev-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.action-group {
  display: flex;
  gap: var(--space-3);
}

.action-btn--primary {
  background: var(--accent);
  color: var(--bg);
  border-color: var(--accent);
  padding: var(--space-3) var(--space-5);
  font-weight: 600;
}

.action-btn--primary:hover:not(:disabled) {
  background: var(--accent-weak);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-btn--secondary {
  background: var(--bg-elev-2);
  color: var(--fg);
  border-color: var(--border);
  padding: var(--space-3) var(--space-5);
}

.action-btn--secondary:hover:not(:disabled) {
  background: var(--bg-elev-3);
  border-color: var(--border-strong);
}

.action-btn--danger {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
  padding: var(--space-3) var(--space-5);
}

.action-btn--danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }
  
  .stat-card {
    padding: var(--space-4);
  }
  
  .stat-icon svg {
    width: 20px;
    height: 20px;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
  
  .library-main {
    flex-direction: column;
    gap: var(--space-3);
  }
  
  .library-actions {
    flex-direction: row;
    min-width: auto;
  }
  
  .action-bar {
    flex-direction: column;
    gap: var(--space-4);
  }
  
  .action-group {
    width: 100%;
    justify-content: center;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .stats-overview {
    grid-template-columns: 1fr;
  }
  
  .library-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .library-status {
    margin-left: 0;
  }
  
  .library-meta {
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .action-group {
    flex-direction: column;
  }
}
</style>