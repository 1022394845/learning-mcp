import { ref, reactive, computed, nextTick } from 'vue'
import { visualizationLibs } from '../config/visualization-libs.config.js'
import { useToast } from './useToast.js'

const CACHE_NAME = 'htmath-lib-cache-v1'
const STORAGE_KEY = 'htmath-lib-settings'

// 全局状态
const state = reactive({
  // 每个库的启用状态（持久化到 localStorage）
  enabledLibs: new Set(),
  // 每个库的缓存状态
  cacheStates: {},
  // 下载状态
  downloading: new Set(),
  // iframe 缓存数量
  iframeCacheSize: 0,
  // 是否已初始化
  initialized: false
})

/**
 * 库缓存管理 composable
 */
export function useLibraryCache() {
  const toast = useToast()

  // 计算属性
  const allLibs = computed(() => {
    return visualizationLibs.map(lib => ({
      ...lib,
      enabled: state.enabledLibs.has(lib.id),
      cached: state.cacheStates[lib.id]?.cached || false,
      cacheSize: state.cacheStates[lib.id]?.size || 0,
      downloading: state.downloading.has(lib.id),
      error: state.cacheStates[lib.id]?.error || ''
    }))
  })

  const enabledCount = computed(() => state.enabledLibs.size)
  
  const cachedCount = computed(() => 
    Object.values(state.cacheStates).filter(s => s?.cached).length
  )
  
  const totalCacheSize = computed(() => 
    Object.values(state.cacheStates).reduce((acc, s) => acc + (s?.cached ? (s.size || 0) : 0), 0)
  )

  // 初始化：加载本地存储的设置和缓存状态
  async function initialize() {
    if (state.initialized) return

    try {
      // 加载启用状态
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const settings = JSON.parse(saved)
        state.enabledLibs = new Set(settings.enabledLibs || [])
      } else {
        // 首次使用，使用配置文件中的默认启用状态
        state.enabledLibs = new Set(
          visualizationLibs.filter(lib => lib.enabled).map(lib => lib.id)
        )
      }

      // 检查缓存状态
      await updateCacheStates()
      
      // 检查 iframe 缓存
      updateIframeCacheSize()

      state.initialized = true
    } catch (error) {
      console.error('初始化库管理器失败:', error)
      toast.error('初始化失败')
    }
  }

  // 保存设置到本地存储
  function saveSettings() {
    try {
      const settings = {
        enabledLibs: Array.from(state.enabledLibs),
        lastUpdated: Date.now()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('保存设置失败:', error)
    }
  }

  // 切换库的启用状态
  function toggleLibrary(libId, enabled) {
    if (enabled) {
      state.enabledLibs.add(libId)
    } else {
      state.enabledLibs.delete(libId)
    }
    saveSettings()
    
    const lib = visualizationLibs.find(l => l.id === libId)
    if (lib) {
      toast.success(`${lib.name} 已${enabled ? '启用' : '禁用'}`)
    }
  }

  // 更新所有库的缓存状态
  async function updateCacheStates() {
    if (!window.__htmathLibBlobs) {
      window.__htmathLibBlobs = {}
    }

    const cache = await caches.open(CACHE_NAME)
    
    for (const lib of visualizationLibs) {
      const cacheState = { 
        cached: false, 
        size: 0, 
        blobUrl: null, 
        error: '' 
      }

      try {
        const response = await cache.match(lib.url)
        if (response) {
          const blob = await response.clone().blob()
          const blobUrl = URL.createObjectURL(blob)
          
          cacheState.cached = true
          cacheState.size = blob.size
          cacheState.blobUrl = blobUrl
          window.__htmathLibBlobs[lib.id] = blobUrl
        }
      } catch (error) {
        cacheState.error = '读取缓存失败: ' + error.message
      }

      state.cacheStates[lib.id] = cacheState
    }
  }

  // 下载/更新单个库的缓存
  async function downloadLibrary(libId) {
    const lib = visualizationLibs.find(l => l.id === libId)
    if (!lib) {
      toast.error('库不存在')
      return false
    }

    if (state.downloading.has(libId)) {
      toast.warning(`${lib.name} 正在下载中...`)
      return false
    }

    state.downloading.add(libId)
    
    try {
      toast.info(`开始下载 ${lib.name}...`)
      
      const response = await fetch(lib.url, { 
        cache: 'no-store',
        headers: {
          'Accept': 'application/javascript, text/javascript, */*'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const cache = await caches.open(CACHE_NAME)
      await cache.put(lib.url, response.clone())
      
      const blob = await response.blob()
      
      // 清理旧的 blob URL
      const oldState = state.cacheStates[libId]
      if (oldState?.blobUrl) {
        try {
          URL.revokeObjectURL(oldState.blobUrl)
        } catch (e) {
          // 忽略清理错误
        }
      }
      
      // 创建新的 blob URL
      const blobUrl = URL.createObjectURL(blob)
      
      state.cacheStates[libId] = {
        cached: true,
        size: blob.size,
        blobUrl,
        error: ''
      }
      
      if (!window.__htmathLibBlobs) {
        window.__htmathLibBlobs = {}
      }
      window.__htmathLibBlobs[libId] = blobUrl

      toast.success(`${lib.name} 下载完成 (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
      return true
      
    } catch (error) {
      const errorMsg = error.message || '下载失败'
      state.cacheStates[libId] = {
        ...state.cacheStates[libId],
        error: errorMsg
      }
      toast.error(`${lib.name} 下载失败: ${errorMsg}`)
      return false
    } finally {
      state.downloading.delete(libId)
    }
  }

  // 删除单个库的缓存
  async function deleteLibraryCache(libId) {
    const lib = visualizationLibs.find(l => l.id === libId)
    if (!lib) return false

    try {
      const cache = await caches.open(CACHE_NAME)
      await cache.delete(lib.url)
      
      // 清理 blob URL
      const cacheState = state.cacheStates[libId]
      if (cacheState?.blobUrl) {
        try {
          URL.revokeObjectURL(cacheState.blobUrl)
        } catch (e) {
          // 忽略清理错误
        }
      }
      
      // 从全局 blob 映射中删除
      if (window.__htmathLibBlobs) {
        delete window.__htmathLibBlobs[libId]
      }
      
      state.cacheStates[libId] = {
        cached: false,
        size: 0,
        blobUrl: null,
        error: ''
      }

      toast.success(`${lib.name} 缓存已删除`)
      return true
    } catch (error) {
      toast.error(`删除 ${lib.name} 缓存失败: ${error.message}`)
      return false
    }
  }

  // 下载所有启用的库
  async function downloadAllEnabledLibs() {
    const enabledLibIds = Array.from(state.enabledLibs)
    const promises = enabledLibIds.map(id => downloadLibrary(id))
    
    toast.info(`开始下载 ${enabledLibIds.length} 个库...`)
    
    const results = await Promise.allSettled(promises)
    const success = results.filter(r => r.status === 'fulfilled' && r.value).length
    const failed = results.length - success
    
    if (failed === 0) {
      toast.success(`所有 ${success} 个库下载完成`)
    } else {
      toast.warning(`${success} 个库下载成功，${failed} 个失败`)
    }
  }

  // 清空所有库缓存
  async function clearAllLibraryCache() {
    try {
      const cache = await caches.open(CACHE_NAME)
      
      // 删除所有库的缓存
      const promises = visualizationLibs.map(async (lib) => {
        await cache.delete(lib.url)
        
        // 清理 blob URL
        const cacheState = state.cacheStates[lib.id]
        if (cacheState?.blobUrl) {
          try {
            URL.revokeObjectURL(cacheState.blobUrl)
          } catch (e) {
            // 忽略清理错误
          }
        }
        
        state.cacheStates[lib.id] = {
          cached: false,
          size: 0,
          blobUrl: null,
          error: ''
        }
      })
      
      await Promise.all(promises)
      
      // 清空全局 blob 映射
      if (window.__htmathLibBlobs) {
        window.__htmathLibBlobs = {}
      }
      
      toast.success('所有库缓存已清空')
    } catch (error) {
      toast.error('清空库缓存失败: ' + error.message)
    }
  }

  // 更新 iframe 缓存数量
  function updateIframeCacheSize() {
    if (window.__htmathIframeCache) {
      state.iframeCacheSize = window.__htmathIframeCache.size
    }
  }

  // 清空 iframe 缓存
  function clearIframeCache() {
    if (window.__htmathIframeCache) {
      const size = window.__htmathIframeCache.size
      window.__htmathIframeCache.clear()
      state.iframeCacheSize = 0
      toast.success(`已清空 ${size} 个 iframe 缓存`)
    } else {
      toast.info('iframe 缓存为空')
    }
  }

  // 导出配置
  function exportConfig() {
    try {
      const config = {
        enabledLibs: Array.from(state.enabledLibs),
        libraries: visualizationLibs,
        exportTime: new Date().toISOString(),
        version: '1.0'
      }
      
      const json = JSON.stringify(config, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `library-config-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      
      URL.revokeObjectURL(url)
      toast.success('配置已导出')
    } catch (error) {
      toast.error('导出配置失败: ' + error.message)
    }
  }

  // 定期更新状态
  function startPeriodicUpdate() {
    const update = () => {
      updateIframeCacheSize()
    }
    
    // 每隔 3 秒更新一次
    const interval = setInterval(update, 3000)
    
    // 返回清理函数
    return () => clearInterval(interval)
  }

  return {
    // 状态
    allLibs,
    enabledCount,
    cachedCount,
    totalCacheSize,
    iframeCacheSize: computed(() => state.iframeCacheSize),
    initialized: computed(() => state.initialized),
    
    // 方法
    initialize,
    toggleLibrary,
    downloadLibrary,
    deleteLibraryCache,
    downloadAllEnabledLibs,
    clearAllLibraryCache,
    clearIframeCache,
    exportConfig,
    updateCacheStates,
    startPeriodicUpdate
  }
}