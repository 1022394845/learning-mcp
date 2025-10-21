/**
 * 可视化库配置文件
 * 用于管理 iframe 中需要预加载和缓存的外部 JavaScript 库
 * 
 * 支持热更新：修改此文件后，刷新页面即可生效
 */

export const visualizationLibs = [
  {
    // 库的唯一标识符
    id: 'plotly',
    // 库的名称（用于显示和日志）
    name: 'Plotly',
    // CDN 地址
    url: 'https://cdn.plot.ly/plotly-2.30.0.min.js',
    // 全局变量名（加载后在 window 对象上的属性名）
    globalName: 'Plotly',
    // 是否启用预加载
    enabled: true,
    // 正则表达式：用于检测和移除 HTML 中的外部引用
    // 支持多个匹配模式
    patterns: [
      /<script[^>]*src\s*=\s*["']https?:\/\/cdn\.plot\.ly\/plotly[^"']*["'][^>]*>[\s\S]*?<\/script>/gi,
      /<script[^>]*src\s*=\s*["']https?:\/\/[^"']*plotly[^"']*\.js["'][^>]*>[\s\S]*?<\/script>/gi
    ],
    // 优先级（数字越小优先级越高，影响加载顺序）
    priority: 1,
    // 可选：版本号（用于版本管理和缓存控制）
    version: '2.30.0',
    // 可选：依赖的其他库（按 id 引用）
    dependencies: [],
    // 可选：加载超时时间（毫秒）
    timeout: 30000,
    // 可选：完整性检查（SRI）
    integrity: '',
    // 可选：跨域策略
    crossOrigin: 'anonymous'
  },
  {
    id: 'echarts',
    name: 'ECharts',
    url: 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js',
    globalName: 'echarts',
    enabled: false, // 默认禁用，需要时启用
    patterns: [
      /<script[^>]*src\s*=\s*["']https?:\/\/[^"']*echarts[^"']*\.js["'][^>]*>[\s\S]*?<\/script>/gi,
      /<script[^>]*src\s*=\s*["']https?:\/\/cdn\.jsdelivr\.net\/npm\/echarts[^"']*["'][^>]*>[\s\S]*?<\/script>/gi
    ],
    priority: 2,
    version: '5.x',
    dependencies: [],
    timeout: 30000
  },
  {
    id: 'd3',
    name: 'D3.js',
    url: 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js',
    globalName: 'd3',
    enabled: false, // 默认禁用
    patterns: [
      /<script[^>]*src\s*=\s*["']https?:\/\/[^"']*d3[^"']*\.js["'][^>]*>[\s\S]*?<\/script>/gi,
      /<script[^>]*src\s*=\s*["']https?:\/\/cdn\.jsdelivr\.net\/npm\/d3[^"']*["'][^>]*>[\s\S]*?<\/script>/gi
    ],
    priority: 3,
    version: '7.x',
    dependencies: [],
    timeout: 30000
  },
  {
    id: 'chartjs',
    name: 'Chart.js',
    url: 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js',
    globalName: 'Chart',
    enabled: false, // 默认禁用
    patterns: [
      /<script[^>]*src\s*=\s*["']https?:\/\/[^"']*chart\.js[^"']*["'][^>]*>[\s\S]*?<\/script>/gi,
      /<script[^>]*src\s*=\s*["']https?:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js[^"']*["'][^>]*>[\s\S]*?<\/script>/gi
    ],
    priority: 4,
    version: '4.x',
    dependencies: [],
    timeout: 30000
  },
  {
    id: 'threejs',
    name: 'Three.js',
    url: 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js',
    globalName: 'THREE',
    enabled: false, // 默认禁用
    patterns: [
      /<script[^>]*src\s*=\s*["']https?:\/\/[^"']*three[^"']*\.js["'][^>]*>[\s\S]*?<\/script>/gi,
      /<script[^>]*src\s*=\s*["']https?:\/\/cdn\.jsdelivr\.net\/npm\/three[^"']*["'][^>]*>[\s\S]*?<\/script>/gi
    ],
    priority: 5,
    version: '0.160.0',
    dependencies: [],
    timeout: 30000
  },
  {
    id: 'mathjax',
    name: 'MathJax',
    url: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js',
    globalName: 'MathJax',
    enabled: false, // 已在主文档单独加载
    patterns: [
      /<script[^>]*src\s*=\s*["']https?:\/\/[^"']*mathjax[^"']*\.js["'][^>]*>[\s\S]*?<\/script>/gi,
      /<script[^>]*src\s*=\s*["']https?:\/\/cdn\.jsdelivr\.net\/npm\/mathjax[^"']*["'][^>]*>[\s\S]*?<\/script>/gi
    ],
    priority: 6,
    version: '3.x',
    dependencies: [],
    timeout: 30000
  },
  {
    id: 'leaflet',
    name: 'Leaflet',
    url: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
    globalName: 'L',
    enabled: false, // 默认禁用
    patterns: [
      /<script[^>]*src\s*=\s*["']https?:\/\/[^"']*leaflet[^"']*\.js["'][^>]*>[\s\S]*?<\/script>/gi,
      /<script[^>]*src\s*=\s*["']https?:\/\/cdn\.jsdelivr\.net\/npm\/leaflet[^"']*["'][^>]*>[\s\S]*?<\/script>/gi
    ],
    priority: 7,
    version: '1.9.4',
    dependencies: [],
    timeout: 30000,
    // Leaflet 还需要 CSS
    stylesheets: [
      'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'
    ]
  }
]

/**
 * iframe 缓存配置
 */
export const cacheConfig = {
  // 最大缓存数量（LRU 策略）
  maxSize: 50,
  // 是否启用缓存
  enabled: true,
  // 缓存过期时间（毫秒，0 表示永不过期）
  ttl: 0,
  // 是否在控制台输出调试信息
  debug: true
}

/**
 * iframe 安全配置
 */
export const sandboxConfig = {
  // iframe sandbox 属性值
  // 注意：allow-same-origin 允许访问父窗口，但会降低安全性
  attributes: [
    'allow-scripts',
    'allow-same-origin',
    'allow-forms',
    'allow-pointer-lock',
    'allow-modals',
    'allow-popups'
  ],
  // 是否启用严格模式（禁用 allow-same-origin）
  strict: false,
  // referrer 策略
  referrerPolicy: 'no-referrer'
}

/**
 * 获取所有启用的库
 */
export function getEnabledLibs() {
  return visualizationLibs
    .filter(lib => lib.enabled)
    .sort((a, b) => a.priority - b.priority)
}

/**
 * 根据 ID 获取库配置
 */
export function getLibById(id) {
  return visualizationLibs.find(lib => lib.id === id)
}

/**
 * 根据全局变量名获取库配置
 */
export function getLibByGlobalName(globalName) {
  return visualizationLibs.find(lib => lib.globalName === globalName)
}

/**
 * 启用或禁用库
 */
export function toggleLib(id, enabled) {
  const lib = getLibById(id)
  if (lib) {
    lib.enabled = enabled
    return true
  }
  return false
}

/**
 * 获取所有库的正则表达式模式（用于批量移除）
 */
export function getAllPatterns() {
  return visualizationLibs
    .filter(lib => lib.enabled)
    .flatMap(lib => lib.patterns)
}

/**
 * 生成库注入脚本（用于 iframe）
 */
export function generateInjectionScript() {
  // 为每个启用的库生成同步 <script src> 与 <link rel="stylesheet"> 标签
  // 目的：确保库在 iframe 自身上下文中、且在 body 内联脚本执行前已加载完成，避免跨 window 复用造成的时序与上下文错配。
  const enabledLibs = getEnabledLibs()

  const styleTags = enabledLibs.flatMap(lib => (lib.stylesheets || [])).map(href => {
    return `<link rel="stylesheet" href="${href}">`
  }).join('\n')

  const scriptTags = enabledLibs.map(lib => {
    const sri = lib.integrity ? ` integrity="${lib.integrity}"` : ''
    const co = lib.crossOrigin ? ` crossorigin="${lib.crossOrigin}"` : ''
    return `<script src="${lib.url}"${sri}${co}></script>`
  }).join('\n')

  // 放在 <head> 中，保证按 priority 顺序同步加载
  return `
${styleTags}
${scriptTags}
  `
}

/**
 * 动态添加新库配置
 */
export function addLibConfig(config) {
  // 验证必需字段
  const requiredFields = ['id', 'name', 'url', 'globalName', 'patterns']
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`缺少必需字段: ${field}`)
    }
  }

  // 检查 ID 是否已存在
  if (getLibById(config.id)) {
    throw new Error(`库 ID 已存在: ${config.id}`)
  }

  // 设置默认值
  const libConfig = {
    enabled: false,
    priority: 99,
    version: '1.0.0',
    dependencies: [],
    timeout: 30000,
    ...config
  }

  visualizationLibs.push(libConfig)
  return libConfig
}

/**
 * 移除库配置
 */
export function removeLibConfig(id) {
  const index = visualizationLibs.findIndex(lib => lib.id === id)
  if (index !== -1) {
    visualizationLibs.splice(index, 1)
    return true
  }
  return false
}

export default {
  visualizationLibs,
  cacheConfig,
  sandboxConfig,
  getEnabledLibs,
  getLibById,
  getLibByGlobalName,
  toggleLib,
  getAllPatterns,
  generateInjectionScript,
  addLibConfig,
  removeLibConfig
}
