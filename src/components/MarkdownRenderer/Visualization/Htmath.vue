<script setup>
import { ref, nextTick, useTemplateRef, watch } from 'vue'
import { visualizationLibs } from '@/config/visualization-libs.config' // 可视化库配置
import { useLibraryCache } from '@/composables/useLibraryCache' // 缓存管理器

const { libBlobs } = useLibraryCache()

const props = defineProps({ html: String })
const iframeRef = useTemplateRef('iframeRef')
const emit = defineEmits(['updateHeight'])
const loading = ref(true)

// 替换html中的库引用为缓存的blobUrl
function replaceWithCachedLibs(html) {
  let processedHtml = html

  // 遍历所有可视化库配置
  visualizationLibs.forEach((lib) => {
    // 检查是否有缓存的blobUrl
    if (libBlobs[lib.id]) {
      // 处理所有匹配模式
      ;(lib.patterns || []).forEach((pattern) => {
        try {
          // 构建正则表达式（支持全局匹配）
          const regex = new RegExp(pattern, 'g')
          // 替换为缓存的blobUrl
          processedHtml = processedHtml.replace(regex, libBlobs[lib.id])
        } catch (error) {
          console.error(`解析模式 ${pattern} 失败:`, error)
        }
      })
    }
  })

  return processedHtml
}

function handleRender(iframe) {
  try {
    const iframeDoc = iframe.contentDocument

    // 清除之前的事件监听，避免重复触发
    iframe.contentWindow.onload = null

    // 替换为缓存的库引用
    const processedHtml = replaceWithCachedLibs(props.html)

    iframeDoc.open()
    iframeDoc.writeln(processedHtml)
    iframeDoc.close()

    const handleResize = () => {
      loading.value = false

      let lastHeight = 0
      let stableCount = -1 // 高度监听器
      // 启动定时器监测高度变化
      let heightCheckTimer = setInterval(() => {
        const currentHeight = iframeDoc.documentElement.scrollHeight

        if (currentHeight !== lastHeight) {
          stableCount = -1
          lastHeight = currentHeight
          iframe.style.height = currentHeight + 'px'
        }
        stableCount++

        if (stableCount >= 5) {
          clearInterval(heightCheckTimer)
          heightCheckTimer = null
          nextTick(() => {
            emit('updateHeight')
          })
        }
      }, 100)
    }

    // 监听iframe内容加载完成事件
    iframe.contentWindow.onload = handleResize
  } catch (err) {
    return console.log(err)
  }
}

watch(
  () => iframeRef.value,
  (iframe) => {
    if (!iframe) return
    loading.value = true
    handleRender(iframe)
  },
  { immediate: true } // 初始加载时立即检查
)
</script>

<template>
  <div class="htmath-container">
    <div class="loading" v-if="loading">
      <div class="loading-indicator">
        <div class="spinner"></div>
        <span>正在加载可视化</span>
      </div>
    </div>
    <iframe
      ref="iframeRef"
      width="100%"
      height="0"
      frameborder="0"
      style="transition: height 0.3s ease; background-color: #fff"
    ></iframe>
  </div>
</template>

<style scoped>
/* iframe 加载动画 */
.loading {
  width: fit-content;
  margin: auto;
  padding-top: 20px;
}
.loading-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 10px 14px;
  background: rgba(240, 240, 240, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  color: #666;
  font-size: 14px;

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #ccc;
    border-top-color: #1a73e8;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
