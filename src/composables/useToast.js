import { reactive } from 'vue'

// Global toast bus (simple store)
const state = reactive({
  toasts: [] // { id, type: 'info'|'success'|'warning'|'error', message, timeout }
})

let counter = 0

export function useToastBus() {
  function show(message, opts = {}) {
    const id = ++counter
    const toast = {
      id,
      type: opts.type || 'info',
      message,
    }
    state.toasts.unshift(toast)

    // auto dismiss
    const ms = typeof opts.duration === 'number' ? opts.duration : 2600
    if (ms > 0) {
      setTimeout(() => remove(id), ms)
    }
    return id
  }

  function remove(id) {
    const i = state.toasts.findIndex(t => t.id === id)
    if (i > -1) state.toasts.splice(i, 1)
  }

  return {
    toasts: state.toasts,
    show,
    remove,
  }
}

// Shorthand helpers
export function useToast() {
  const bus = useToastBus()
  return {
    info: (m, o) => bus.show(m, { ...o, type: 'info' }),
    success: (m, o) => bus.show(m, { ...o, type: 'success' }),
    warning: (m, o) => bus.show(m, { ...o, type: 'warning' }),
    error: (m, o) => bus.show(m, { ...o, type: 'error' }),
    remove: bus.remove,
  }
}
