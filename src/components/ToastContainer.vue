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
.toast-container { position: fixed; inset: 16px 16px auto auto; z-index: 1001; display: grid; gap: 8px; width: min(92vw, 360px); }
.toast-item { display: grid; grid-template-columns: 20px 1fr; gap: 10px; align-items: start; padding: 10px 12px; background: var(--bg-elev-1); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg); box-shadow: var(--shadow); }
.toast-icon { display: flex; align-items: center; justify-content: center; color: var(--fg); opacity: .85; }
.toast-content { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px; }
.toast-message { margin: 0; font-size: 13px; line-height: 1.4; color: var(--fg); }
.toast-close { padding: 4px; background: var(--bg-elev-2); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--fg); cursor: pointer; }
.toast-close:hover { border-color: var(--border-strong); }

/* minimal color cues (monochrome-friendly) */
.t-success { border-color: #2c2; }
.t-error { border-color: #c22; }
.t-warning { border-color: #cc2; }

/* transitions */
.toast-enter-from { opacity: 0; transform: translateY(-6px); }
.toast-enter-to { opacity: 1; transform: translateY(0); }
.toast-enter-active { transition: opacity var(--dur-fast, .15s) var(--ease-out, cubic-bezier(.2,.8,.2,1)), transform var(--dur-fast, .15s) var(--ease-out, cubic-bezier(.2,.8,.2,1)); }
.toast-leave-to { opacity: 0; transform: translateY(-6px); }
.toast-leave-active { transition: opacity var(--dur-fast, .15s) var(--ease-in, cubic-bezier(.4,0,1,1)), transform var(--dur-fast, .15s) var(--ease-in, cubic-bezier(.4,0,1,1)); }
</style>
