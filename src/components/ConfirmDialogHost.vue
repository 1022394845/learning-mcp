<template>
  <transition name="cd" appear>
    <div v-if="state.open" class="cd-overlay" @click.self="onCancel">
      <div class="cd-card" role="dialog" aria-modal="true" aria-labelledby="cd-title">
        <h3 id="cd-title" class="cd-title">{{ state.title || '确认操作' }}</h3>
        <p v-if="state.message" class="cd-msg">{{ state.message }}</p>
        <div class="cd-actions">
          <button class="cd-btn" @click="onCancel">{{ state.cancelText || '取消' }}</button>
          <button class="cd-btn cd-primary" @click="onConfirm">{{ state.confirmText || '确认' }}</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { useConfirmBus } from '../composables/useConfirm'
const { state, resolveConfirm, resolveCancel } = useConfirmBus()

function onConfirm(){ resolveConfirm(true) }
function onCancel(){ resolveCancel(false) }
</script>

<style scoped>
.cd-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 1002; display: grid; place-items: center; }
.cd-card { width: min(92vw, 420px); background: var(--bg-elev-1); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow); padding: 18px; }
.cd-title { margin: 0 0 8px; color: var(--fg); font-size: 18px; font-weight: 700; }
.cd-msg { margin: 0 0 14px; color: var(--fg-dim); font-size: 14px; }
.cd-actions { display: flex; gap: 8px; justify-content: flex-end; }
.cd-btn { padding: 8px 12px; background: var(--bg-elev-2); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--fg); cursor: pointer; transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out); }
.cd-btn:hover { border-color: var(--border-strong); }
.cd-primary { border-color: var(--border-strong); }

/* transitions */
.cd-enter-from, .cd-leave-to { opacity: 0; }
.cd-enter-active, .cd-leave-active { transition: opacity var(--dur-base, .25s) var(--ease-in-out, ease); }
</style>
