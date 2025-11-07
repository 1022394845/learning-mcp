<script setup>
import { nextTick, useTemplateRef, watch } from 'vue'

const props = defineProps({ html: String })
const iframeRef = useTemplateRef('iframeRef')
const emit = defineEmits(['updateHeight'])

watch(
  () => iframeRef.value,
  (iframe) => {
    if (!iframe) return
    try {
      const iframeDoc = iframe.contentDocument

      // 清除之前的事件监听，避免重复触发
      iframe.contentWindow.onload = null

      iframeDoc.open()
      iframeDoc.writeln(props.html)
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

          if (stableCount >= 3) {
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
