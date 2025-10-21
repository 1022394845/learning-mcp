<template>
  <div class="lib-config-manager">
    <h3>可视化库配置管理</h3>
    
    <div class="config-stats">
      <div class="stat-card">
        <div class="stat-label">总库数</div>
        <div class="stat-value">{{ allLibs.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已启用</div>
        <div class="stat-value">{{ enabledCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">缓存大小</div>
        <div class="stat-value">{{ cacheConfig.maxSize }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已缓存</div>
        <div class="stat-value">{{ cachedCount }}</div>
      </div>
    </div>

    <div class="lib-list">
      <div v-for="lib in allLibs" :key="lib.id" class="lib-item">
        <div class="lib-header">
          <div class="lib-info">
            <label class="lib-toggle">
              <input 
                type="checkbox" 
                :checked="lib.enabled"
                @change="toggleLibrary(lib.id, $event.target.checked)"
              />
              <span class="lib-name">{{ lib.name }}</span>
              <span class="lib-version">v{{ lib.version }}</span>
            </label>
            <div class="lib-meta">
              <span class="lib-global">window.{{ lib.globalName }}</span>
              <span class="lib-priority">优先级: {{ lib.priority }}</span>
            </div>
          </div>
          
          <div class="lib-status">
            <span 
              v-if="lib.enabled && libStatus[lib.id]" 
              class="status-badge success"
              title="已加载"
            >
              ✓
            </span>
            <span 
              v-else-if="lib.enabled" 
              class="status-badge loading"
              title="加载中..."
            >
              ⏳
            </span>
            <span 
              v-else 
              class="status-badge disabled"
              title="未启用"
            >
              ○
            </span>
          </div>
        </div>

        <div v-if="showDetails[lib.id]" class="lib-details">
          <div class="detail-row">
            <span class="detail-label">CDN:</span>
            <code class="detail-value">{{ lib.url }}</code>
          </div>
          <div class="detail-row">
            <span class="detail-label">模式数量:</span>
            <span class="detail-value">{{ lib.patterns.length }} 个</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">超时:</span>
            <span class="detail-value">{{ lib.timeout }}ms</span>
          </div>
          <div v-if="lib.stylesheets && lib.stylesheets.length" class="detail-row">
            <span class="detail-label">样式表:</span>
            <span class="detail-value">{{ lib.stylesheets.length }} 个</span>
          </div>
        </div>

        <button 
          class="toggle-details-btn"
          @click="showDetails[lib.id] = !showDetails[lib.id]"
        >
          {{ showDetails[lib.id] ? '收起' : '详情' }}
        </button>
      </div>
    </div>

    <div class="config-actions">
      <button @click="reloadPage" class="btn-primary">
        应用更改（刷新页面）
      </button>
      <button @click="clearCache" class="btn-danger">
        清空 iframe 缓存
      </button>
      <button @click="exportConfig" class="btn-secondary">
        导出配置
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { 
  visualizationLibs, 
  cacheConfig,
  toggleLib,
  getEnabledLibs
} from '../config/visualization-libs.config.js'

const allLibs = ref([...visualizationLibs])
const libStatus = ref({})
const showDetails = ref({})
const cachedCount = ref(0)

const enabledCount = computed(() => {
  return allLibs.value.filter(lib => lib.enabled).length
})

function toggleLibrary(id, enabled) {
  toggleLib(id, enabled)
  // 更新本地状态
  const lib = allLibs.value.find(l => l.id === id)
  if (lib) {
    lib.enabled = enabled
  }
}

function checkLibStatus() {
  if (window.__htmathLibsLoaded) {
    Object.keys(window.__htmathLibsLoaded).forEach(id => {
      libStatus.value[id] = window.__htmathLibsLoaded[id]
    })
  }
  
  if (window.__htmathIframeCache) {
    cachedCount.value = window.__htmathIframeCache.size
  }
}

function reloadPage() {
  location.reload()
}

function clearCache() {
  if (window.__htmathIframeCache) {
    const size = window.__htmathIframeCache.size
    window.__htmathIframeCache.clear()
    cachedCount.value = 0
    alert(`已清空 ${size} 个 iframe 缓存`)
  }
}

function exportConfig() {
  const config = {
    libs: allLibs.value,
    cache: cacheConfig,
    exportTime: new Date().toISOString()
  }
  
  const json = JSON.stringify(config, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = 'visualization-libs-config.json'
  a.click()
  
  URL.revokeObjectURL(url)
}

onMounted(() => {
  checkLibStatus()
  // 定期更新状态
  setInterval(checkLibStatus, 2000)
})
</script>

<style scoped>
.lib-config-manager {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

h3 {
  margin-bottom: 20px;
  color: var(--fg);
}

.config-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.stat-card {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  border: 1px solid var(--border);
}

.stat-label {
  font-size: 12px;
  color: var(--fg-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--primary);
}

.lib-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

.lib-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 15px;
  transition: all 0.3s ease;
}

.lib-item:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.lib-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.lib-info {
  flex: 1;
}

.lib-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 16px;
  margin-bottom: 8px;
}

.lib-toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.lib-name {
  font-weight: 600;
  color: var(--fg);
}

.lib-version {
  font-size: 12px;
  color: var(--fg-secondary);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 4px;
}

.lib-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: var(--fg-secondary);
}

.lib-global {
  font-family: 'Fira Code', monospace;
  background: var(--code-inline-bg);
  padding: 2px 6px;
  border-radius: 3px;
}

.lib-status {
  margin-left: 15px;
}

.status-badge {
  display: inline-block;
  width: 28px;
  height: 28px;
  line-height: 28px;
  text-align: center;
  border-radius: 50%;
  font-size: 14px;
}

.status-badge.success {
  background: #4caf50;
  color: white;
}

.status-badge.loading {
  background: #ff9800;
  color: white;
  animation: pulse 1.5s infinite;
}

.status-badge.disabled {
  background: var(--bg-tertiary);
  color: var(--fg-secondary);
}

.lib-details {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--border);
}

.detail-row {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 13px;
}

.detail-label {
  color: var(--fg-secondary);
  min-width: 80px;
}

.detail-value {
  color: var(--fg);
  word-break: break-all;
}

code.detail-value {
  background: var(--code-inline-bg);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
}

.toggle-details-btn {
  margin-top: 10px;
  padding: 6px 12px;
  font-size: 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  color: var(--fg);
  transition: all 0.2s ease;
}

.toggle-details-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.config-actions {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.config-actions button {
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(26, 115, 232, 0.3);
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-danger:hover {
  background: #d32f2f;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--fg);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--bg-tertiary);
  transform: translateY(-2px);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 768px) {
  .config-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .lib-header {
    flex-direction: column;
    gap: 10px;
  }
  
  .config-actions {
    flex-direction: column;
  }
  
  .config-actions button {
    width: 100%;
  }
}
</style>
