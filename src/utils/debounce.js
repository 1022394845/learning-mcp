/**
 * 防抖函数
 * @param {Function} func - 需要防抖的函数
 * @param {number} delay - 延迟时间(毫秒) 默认 100ms
 * @param {boolean} immediate - 是否立即执行（true表示触发时立即执行，false表示延迟后执行）
 * @returns {Function} 包装后的防抖函数
 */
export function debounce(func, delay = 100, immediate = false) {
  let timer = null // 用于存储定时器ID

  // 返回一个新的函数，作为防抖处理后的函数
  return function (...args) {
    const context = this // 保存当前上下文

    // 如果已有定时器，清除它
    if (timer) {
      clearTimeout(timer)
    }

    // 立即执行的情况
    if (immediate) {
      // 如果定时器不存在，说明可以立即执行
      const callNow = !timer
      // 设置定时器，delay时间后清空定时器（为了下次触发能再次立即执行）
      timer = setTimeout(() => {
        timer = null
      }, delay)
      // 立即执行函数
      if (callNow) {
        func.apply(context, args)
      }
    } else {
      // 延迟执行的情况：重新设置定时器
      timer = setTimeout(() => {
        func.apply(context, args)
        timer = null // 执行后清空定时器
      }, delay)
    }
  }
}
