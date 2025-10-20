import { reactive } from 'vue'

const state = reactive({
  open: false,
  title: '',
  message: '',
  confirmText: '确认',
  cancelText: '取消',
  _resolver: null,
})

export function useConfirmBus(){
  function open(opts={}){
    state.title = opts.title || '确认操作'
    state.message = opts.message || ''
    state.confirmText = opts.confirmText || '确认'
    state.cancelText = opts.cancelText || '取消'
    state.open = true
    return new Promise((resolve) => {
      state._resolver = resolve
    })
  }
  function resolveConfirm(val){
    if(state._resolver) state._resolver(val)
    cleanup()
  }
  function resolveCancel(val){
    if(state._resolver) state._resolver(val)
    cleanup()
  }
  function cleanup(){
    state.open = false
    state._resolver = null
  }
  return { state, open, resolveConfirm, resolveCancel }
}

export function useConfirm(){
  const bus = useConfirmBus()
  return {
    confirm: (message, opts={}) => bus.open({ message, ...opts }),
    open: bus.open,
  }
}
