<script setup>
import { nextTick, useTemplateRef, watch } from 'vue'
import { visualizationLibs } from '../../../config/visualization-libs.config' // 可视化库配置
import { useLibraryCache } from '../../../composables/useLibraryCache' // 缓存管理器

const { libBlobs } = useLibraryCache()

const props = defineProps({ html: String })
const iframeRef = useTemplateRef('iframeRef')
const emit = defineEmits(['updateHeight'])

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
      let lastHeight = 0
      let stableCount = -1 // 高度监听器
      // 启动定时器监测高度变化
      let heightCheckTimer = setInterval(() => {
        const currentHeight = iframeDoc.documentElement.scrollHeight

        if (currentHeight !== lastHeight) {
          stableCount = -1
          lastHeight = currentHeight
          iframe.style.height = currentHeight + 'px'
          nextTick(() => {
            emit('updateHeight')
          })
        }
        stableCount++

        if (stableCount >= 10) {
          clearInterval(heightCheckTimer)
          heightCheckTimer = null
        }
      }, 500)
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
    handleRender(iframe)
  },
  { immediate: true } // 初始加载时立即检查
)
</script>

<template>
  <iframe
    ref="iframeRef"
    width="100%"
    frameborder="0"
    style="transition: height 0.3s ease"
  ></iframe>
</template>
