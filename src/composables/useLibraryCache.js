import { reactive, computed } from 'vue'
import { visualizationLibs } from '@/config/visualization-libs.config'
import { useToast } from '@/composables/useToast'

const CACHE_NAME = 'htmath-lib-cache-v1'
const STORAGE_KEY = 'htmath-lib-settings'
const toast = useToast()

// 库全局状态对象
const state = reactive({
  enabledLibs: new Set(), // 库启用状态
  cacheStates: {}, // 库缓存状态
  downloading: new Set(), // 库下载状态
  initialized: false // 是否初始化
})

// 库缓存管理
export const useLibraryCache = () => {
  // 全部库信息
  const allLibs = computed(() => {
    return visualizationLibs.map((lib) => ({
      ...lib,
      enabled: state.enabledLibs.has(lib.id),
      cached: state.cacheStates[lib.id]?.cached || false,
      cacheSize: state.cacheStates[lib.id]?.size || 0,
      downloading: state.downloading.has(lib.id),
      error: state.cacheStates[lib.id]?.error || ''
    }))
  })

  const libBlobs = {} // 已缓存库blob地址

  // 已启用数量
  const enabledCount = computed(() => state.enabledLibs.size)

  // 已缓存数量
  const cachedCount = computed(
    () => Object.values(state.cacheStates).filter((s) => s?.cached).length
  )

  // 总缓存数量
  const totalCacheSize = computed(() =>
    Object.values(state.cacheStates).reduce(
      (acc, s) => acc + (s?.cached ? s.size || 0 : 0),
      0
    )
  )

  // 初始化：加载本地存储的设置和缓存状态
  async function initialize() {
    if (state.initialized) return // 已初始化

    try {
      // 加载启用状态
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const settings = JSON.parse(saved)
        state.enabledLibs = new Set(settings.enabledLibs || [])
      } else {
        // 首次使用，使用配置文件中的默认启用状态
        state.enabledLibs = new Set(
          visualizationLibs.filter((lib) => lib.enabled).map((lib) => lib.id)
        )
      }

      // 检查缓存状态
      await updateCacheStates()
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
    if (enabled) state.enabledLibs.add(libId)
    else state.enabledLibs.delete(libId)
    saveSettings()

    const lib = visualizationLibs.find((l) => l.id === libId)
    if (lib) toast.success(`${lib.name} 已${enabled ? '启用' : '禁用'}`)
  }

  // 更新所有库的缓存状态
  async function updateCacheStates() {
    const cache = await caches.open(CACHE_NAME)
    // 并行处理所有库的缓存检查
    await Promise.all(
      visualizationLibs.map(async (lib) => {
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
            cacheState.cached = true
            cacheState.size = blob.size
            cacheState.blobUrl = URL.createObjectURL(blob)
            libBlobs[lib.id] = cacheState.blobUrl
          }
        } catch (error) {
          cacheState.error = '读取缓存失败: ' + error.message
        }

        state.cacheStates[lib.id] = cacheState
      })
    )
  }

  // 下载/更新单个库的缓存
  async function downloadLibrary(libId) {
    const lib = visualizationLibs.find((l) => l.id === libId)
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

      const response = await Promise.race([
        fetch(lib.url, {
          cache: 'no-store',
          headers: { Accept: 'application/javascript, text/javascript, */*' }
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`下载超时（${lib.timeout}ms）`)),
            lib.timeout
          )
        )
      ])

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
      libBlobs[libId] = blobUrl

      toast.success(
        `${lib.name} 下载完成 (${(blob.size / 1024 / 1024).toFixed(2)} MB)`
      )
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
    const lib = visualizationLibs.find((l) => l.id === libId)
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
          console.log(e.message || '清理失败')
        }
      }

      // 从全局 blob 映射中删除
      delete libBlobs[libId]

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
            console.log('清理失败')
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
      libBlobs.length = 0

      toast.success('所有库缓存已清空')
    } catch (error) {
      toast.error('清空库缓存失败: ' + error.message)
    }
  }

  // 下载所有启用的库
  async function downloadAllEnabledLibs() {
    const enabledLibIds = Array.from(state.enabledLibs)
    if (enabledLibIds.length === 0) return toast.info('没有启用的库需要下载')

    // 过滤已缓存的库，避免重复下载
    const unCachedLibIds = enabledLibIds.filter((id) => {
      const cacheState = state.cacheStates[id]
      return !cacheState?.cached && !cacheState?.isDownloading
    })

    if (unCachedLibIds.length === 0)
      return toast.success('所有启用的库已缓存完成')

    // 显示总进度提示
    const total = unCachedLibIds.length
    const progressToast = toast.loading(`正在下载（0/${total}）...`, {
      duration: 0, // 不自动关闭
      forbidClick: true // 禁止点击关闭
    })

    try {
      // 限制并发下载（避免请求拥堵）
      const concurrencyLimit = 3
      let completed = 0
      const results = []

      // 分批处理下载任务
      for (let i = 0; i < unCachedLibIds.length; i += concurrencyLimit) {
        const batch = unCachedLibIds.slice(i, i + concurrencyLimit)
        const batchPromises = batch.map((id) =>
          downloadLibrary(id).then((result) => ({ id, result }))
        )

        // 等待当前批次完成后再处理下一批
        const batchResults = await Promise.allSettled(batchPromises)
        results.push(...batchResults)

        // 更新已完成数量和进度提示
        completed += batch.length
        progressToast.message = `正在下载（${completed}/${total}）...`
      }

      // 统计结果
      const success = results.filter(
        (r) => r.status === 'fulfilled' && r.value.result
      ).length
      const failed = total - success
      const failedIds = results
        .filter((r) => r.status !== 'fulfilled' || !r.value.result)
        .map((r) => r.value?.id || '未知库')

      // 关闭进度提示，显示最终结果
      progressToast.close()
      if (failed === 0) {
        toast.success(`所有 ${success} 个库下载完成`)
      } else {
        toast.warning(
          `${success} 个库下载成功，${failed} 个失败\n` +
            `失败库ID: ${failedIds.join(', ')}`,
          { duration: 6000 } // 延长显示时间
        )
      }
    } catch (error) {
      progressToast.close()
      toast.error(`下载任务异常终止: ${error.message}`)
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
      a.download = `library-config-${new Date()
        .toISOString()
        .slice(0, 10)}.json`
      a.click()

      URL.revokeObjectURL(url)
      toast.success('配置已导出')
    } catch (error) {
      toast.error('导出配置失败: ' + error.message)
    }
  }

  return {
    // 状态
    allLibs,
    libBlobs,
    enabledCount,
    cachedCount,
    totalCacheSize,
    initialized: computed(() => state.initialized),

    // 方法
    initialize,
    toggleLibrary,
    downloadLibrary,
    deleteLibraryCache,
    clearAllLibraryCache,
    downloadAllEnabledLibs,
    exportConfig,
    updateCacheStates
  }
}
