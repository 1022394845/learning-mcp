<template>
  <div class="toast-container" aria-live="polite" aria-atomic="true">
    <transition-group name="toast" tag="div">
      <div v-for="t in toasts" :key="t.id" class="toast-item" :class="`t-${t.type}`" role="status">
        <div class="toast-icon" aria-hidden="true">
          <svg v-if="t.type==='success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <svg v-else-if="t.type==='error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <svg v-else-if="t.type==='warning'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4"/>
            <path d="M12 16h.01"/>
          </svg>
        </div>
        <div class="toast-content">
          <p class="toast-message">{{ t.message }}</p>
          <button class="toast-close" @click="remove(t.id)" aria-label="关闭通知">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useToastBus } from '../composables/useToast'

const { toasts, remove } = useToastBus()
</script>

<style scoped>
.toast-container { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 1001; display: grid; gap: 18px; width: min(92vw, 360px); z-index: 10000;}
.toast-item { display: grid; grid-template-columns: 20px 1fr; margin-bottom: 10px; gap: 10px; align-items: center; padding: 12px 16px; background: linear-gradient(135deg, var(--bg-elev-1) 0%, var(--bg-elev-2) 100%); border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--fg); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08); backdrop-filter: blur(10px); }
.toast-icon { display: flex; align-items: center; justify-content: center; opacity: .9; }
.toast-content { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px; }
.toast-message { margin: 0; font-size: 14px; line-height: 1.5; color: var(--fg); font-weight: 500; }
.toast-close { padding: 6px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: var(--radius-sm); color: var(--fg); cursor: pointer; transition: all 0.2s ease; }
.toast-close:hover { background: rgba(255, 255, 255, 0.2); border-color: rgba(255, 255, 255, 0.4); transform: scale(1.1); }

/* enhanced color cues */
.t-success { border-color: #4ade80; background: linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%); }
.t-success .toast-icon { color: #22c55e; }
.t-error { border-color: #f87171; background: linear-gradient(135deg, rgba(248, 113, 113, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%); }
.t-error .toast-icon { color: #ef4444; }
.t-warning { border-color: #fbbf24; background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%); }
.t-warning .toast-icon { color: #f59e0b; }

/* improved transitions */
.toast-enter-from { opacity: 0; transform: translateY(-20px) scale(0.95); }
.toast-enter-to { opacity: 1; transform: translateY(0) scale(1); }
.toast-enter-active { transition: opacity 0.3s ease-out, transform 0.3s ease-out; }
.toast-leave-to { opacity: 0; transform: translateY(-20px) scale(0.95); }
.toast-leave-active { transition: opacity 0.3s ease-in, transform 0.3s ease-in; }
</style>
