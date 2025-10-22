<template>
  <Teleport to="body">
    <!-- 遮罩层 -->
    <Transition name="fade">
      <div v-if="visible" class="settings-modal" @click.self="handleClose">
        <!-- 面板 -->
        <Transition name="pop">
          <div class="settings-content" v-show="visible" @click.stop>
            <div class="settings-header">
              <h3>设置</h3>
              <button class="close-btn" @click="handleClose" title="关闭">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div class="settings-body">
              <div class="setting-item">
                <label for="apiUrl">API 地址</label>
                <input
                  id="apiUrl"
                  type="text"
                  :value="apiUrl"
                  @input="onApiUrlInput"
                  placeholder="http://localhost:10001/api/v1/chat/sse" />
              </div>

              <div class="setting-item">
                <label>模型参数 (预留扩展)</label>
                <p class="setting-description">未来可配置温度、top_p 等参数</p>
              </div>

              <div class="setting-item">
                <label>可视化库设置</label>
                <button class="config-btn" @click="showLibConfig = true">打开配置</button>
              </div>
              
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>

  <!-- LibConfig 模态框 -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showLibConfig" class="lib-config-modal" @click.self="showLibConfig = false">
        <Transition name="pop">
          <div class="lib-config-content" v-show="showLibConfig" @click.stop>
            <div class="lib-config-header">
              <h3>可视化库配置</h3>
              <button class="close-btn" @click="showLibConfig = false" title="关闭">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div class="lib-config-body">
              <LibConfigManager />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import LibConfigManager from './LibConfigManager.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  apiUrl: { type: String, default: '' }
})

const emit = defineEmits(['update:visible', 'update:apiUrl', 'close'])

const showLibConfig = ref(false)

function handleClose() {
  emit('update:visible', false)
  emit('close')
}

function onApiUrlInput(e) {
  emit('update:apiUrl', e.target.value)
}

function onKeydown(e) {
  if (props.visible && (e.key === 'Escape' || e.key === 'Esc')) {
    e.preventDefault()
    handleClose()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
/* 动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 160ms var(--ease-out); }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.pop-enter-active, .pop-leave-active { transition: opacity 180ms var(--ease-out), transform 200ms var(--ease-out); }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(8px) scale(0.98); }

/* 模态结构 */
.settings-modal { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
.settings-content { background: var(--bg-elev-1); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; max-width: 520px; width: 92%; max-height: 80vh; overflow-y: auto; box-shadow: var(--shadow); }
.settings-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.settings-header h3 { margin: 0; font-size: 18px; color: var(--fg); }
.close-btn { padding: 6px; background: var(--bg-elev-2); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--fg); cursor: pointer; }
.settings-body { color: var(--fg); }
.setting-item { margin-bottom: 16px; }
.setting-item label { display: block; font-size: 13px; font-weight: 700; color: var(--fg); margin-bottom: 8px; }
.setting-item input { width: 100%; padding: 10px 12px; border-radius: var(--radius-sm); background: var(--bg-elev-2); border: 1px solid var(--border); color: var(--fg); }
.setting-description { font-size: 12px; color: var(--fg-dim); margin: 0; }
.config-btn { 
  padding: 8px 16px; 
  background: var(--bg); 
  color: var(--accent);
  border: 1px solid var(--border); 
  border-radius: var(--radius-sm); 
  cursor: pointer; 
  font-size: 13px; 
  font-weight: 500;
  transition: all var(--dur-fast) var(--ease-out);
}
.config-btn:hover { 
  background: var(--select); 
  transform: translateY(-1px);
}

/* LibConfig 模态框样式 */
.lib-config-modal { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1001; backdrop-filter: blur(2px); }
.lib-config-content { 
  background: var(--bg-elev-1); 
  border: 1px solid var(--border); 
  border-radius: var(--radius-lg); 
  padding: 20px; 
  max-width: 1000px; 
  width: 95%; 
  max-height: 90vh; 
  overflow-y: auto; 
  box-shadow: var(--shadow); 
}
.lib-config-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
.lib-config-header h3 { margin: 0; font-size: 18px; color: var(--fg); }
.lib-config-body { 
  color: var(--fg); 
  background: var(--bg-elev-1);
  border-radius: var(--radius-md);
  overflow: hidden;
}
</style>