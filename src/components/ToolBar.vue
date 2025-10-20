<template>
  <div class="tool-bar">
    <div class="tool-buttons">
      <!-- 代码工具 -->
      <button
        class="tool-btn"
        :class="{ active: activeTool === 'code' }"
        @click="$emit('tool-click', 'code')"
        title="插入代码 (Ctrl+K)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      </button>

      <!-- 文件上传 -->
      <button
        class="tool-btn"
        :class="{ active: activeTool === 'file' }"
        @click="handleFileClick"
        title="上传文件 (Ctrl+U)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
      </button>
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="*/*"
        style="display: none"
        @change="handleFileChange"
      />

      <!-- 可视化 -->
      <button
        class="tool-btn"
        :class="{ active: activeTool === 'visualization' }"
        @click="$emit('tool-click', 'visualization')"
        title="数据可视化 (Ctrl+V)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      </button>

      <!-- 图像生成 -->
      <button
        class="tool-btn"
        :class="{ active: activeTool === 'image' }"
        @click="$emit('tool-click', 'image')"
        title="生成图像 (Ctrl+I)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </button>

      <!-- 表情符号 -->
      <button
        class="tool-btn"
        @click="$emit('tool-click', 'emoji')"
        title="插入表情"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
          <line x1="9" y1="9" x2="9.01" y2="9"/>
          <line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      </button>
    </div>

    <!-- 工具提示信息 -->
    <div v-if="toolTip" class="tool-tip">
      {{ toolTip }}
    </div>

    <!-- 已上传文件列表 -->
    <div v-if="uploadedFiles.length > 0" class="uploaded-files">
      <div
        v-for="(file, index) in uploadedFiles"
        :key="index"
        class="file-chip"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
          <polyline points="13 2 13 9 20 9"/>
        </svg>
        <span class="file-name">{{ file.name }}</span>
        <button class="remove-file-btn" @click="$emit('remove-file', index)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  activeTool: { type: String, default: null },
  toolTip: { type: String, default: '' },
  uploadedFiles: { type: Array, default: () => [] }
})

const emit = defineEmits(['tool-click', 'file-upload', 'remove-file'])

const fileInput = ref(null)

function handleFileClick() {
  fileInput.value?.click()
}

function handleFileChange(event) {
  const files = Array.from(event.target.files || [])
  if (files.length > 0) {
    emit('file-upload', files)
  }
  // 清空 input 以允许重复上传同一文件
  event.target.value = ''
}
</script>

<style scoped>
.tool-bar { display: flex; flex-direction: column; gap: var(--space-3); }
.tool-buttons { display: flex; align-items: center; gap: var(--space-2); }

.tool-btn {
  padding: 8px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--fg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tool-btn:hover { border-color: var(--border-strong); }
.tool-btn.active { background: var(--bg-elev-3); border-color: var(--border-strong); }

.tool-tip {
  padding: 8px 12px;
  background: var(--bg-elev-2);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--fg-muted);
}

.uploaded-files { display: flex; flex-wrap: wrap; gap: 8px; }
.file-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 12px;
  color: var(--fg);
  max-width: 200px;
}
.file-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.remove-file-btn {
  padding: 2px;
  background: transparent;
  border: none;
  color: var(--fg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.remove-file-btn:hover { background: #2a2a2a; }
</style>
