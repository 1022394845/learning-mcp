import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useToast } from '@/composables/useToast'

const toast = useToast()

function sanitizeFilename(name) {
  const base = (name || '导出')
    .replace(/[\\/:*?"<>|\r\n]+/g, ' ')
    .trim()
    .slice(0, 60)
  return base || '导出'
}

function escapeHtmlAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtmathIframe(id, innerHtml) {
  const resizeScript = `
      <script>(function(){
        function send(){
          try {
            var h = Math.max(
              document.documentElement ? document.documentElement.scrollHeight : 0,
              document.body ? document.body.scrollHeight : 0,
              document.documentElement ? document.documentElement.offsetHeight : 0,
              document.body ? document.body.offsetHeight : 0
            );
            parent.postMessage({__htmath:true, id: '${id}', height: h}, '*');
          } catch(e) {}
        }
        window.addEventListener('load', send);
        window.addEventListener('resize', send);
        var mo = new MutationObserver(function(){ send(); });
        mo.observe(document.documentElement || document.body, {subtree:true, childList:true, attributes:true, characterData:true});
        setTimeout(send, 0);
      })();<\/script>`

  const lightBaseStyle = `
      <style>
        :root { color-scheme: light; }
        html, body { background: #ffffff; color: #111; margin:0; padding:12px; }
        a { color: #1a73e8; }
        table { border-color: #e5e7eb; }
        pre, code { background: #f8fafc; color: #0f172a; }
      </style>`

  let srcdocHtml = innerHtml
  if (/<html[\s\S]*<\/html>/i.test(srcdocHtml)) {
    if (/<\/head>/i.test(srcdocHtml)) {
      srcdocHtml = srcdocHtml.replace(/<\/head>/i, `${lightBaseStyle}</head>`)
    } else {
      srcdocHtml = lightBaseStyle + srcdocHtml
    }
    if (/<\/body>/i.test(srcdocHtml)) {
      srcdocHtml = srcdocHtml.replace(/<\/body>/i, `${resizeScript}</body>`)
    } else {
      srcdocHtml = srcdocHtml + resizeScript
    }
  } else {
    srcdocHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${lightBaseStyle}${resizeScript}</head><body>${srcdocHtml}</body></html>`
  }

  const srcdocEscaped = escapeHtmlAttr(srcdocHtml)
  return `<iframe id="${id}" sandbox="allow-scripts allow-forms allow-pointer-lock allow-modals allow-popups" referrerpolicy="no-referrer" style="width:100%;border:0;display:block;overflow:hidden;min-height:120px" srcdoc="${srcdocEscaped}"></iframe>`
}

function buildStandaloneHtml(title, bodyHtml) {
  const parentResize = `
    <script>
      window.addEventListener('message', function(ev){
        var d = ev.data;
        if(d && d.__htmath && d.id && typeof d.height === 'number'){
          var ifr = document.getElementById(d.id);
          if(ifr){ ifr.style.height = Math.max(120, d.height) + 'px'; }
        }
      });
    <\/script>`

  const baseStyles = `
    <style>
      body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#fafafa; color:#111; margin:0; padding:24px; }
      .markdown-container { line-height:1.6; max-width: 960px; margin: 0 auto; }
      .markdown-container pre { background:#f6f8fa; border:1px solid rgba(0,0,0,0.08); border-radius:10px; padding:16px; overflow:auto; }
      .markdown-container code { background: rgba(175,184,193,0.25); border-radius:6px; padding:0.2em 0.4em; }
      .markdown-container img { max-width:100%; border-radius:8px; }
      .html-container { margin:20px 0; padding:0; border:0; }
      h1,h2,h3,h4,h5,h6 { color:#111; }
      a { color:#1a73e8; }
    </style>`

  // 可选：MathJax（与在线渲染一致）
  const mathjax = `
    <script>
      window.MathJax = {
        tex: { inlineMath: [['$','$'], ['\\(','\\)']], displayMath: [['$$','$$'], ['\\[','\\]']], processEscapes: true },
        svg: { fontCache: 'global' }
      };
    <\/script>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" async><\/script>`

  return `<!DOCTYPE html>
  <html lang="zh-CN">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtmlAttr(title)}</title>
      ${baseStyles}
    </head>
    <body>
      <div class="markdown-container">
        ${bodyHtml}
      </div>
      ${parentResize}
      ${mathjax}
    </body>
  </html>`
}

/**
 * 导出 markdown 文本为单页 HTML（适配 htmath）
 * @param {String} message markdown文本
 * @param {String} [title] 导出文件名
 */
export function markdownToHtml(message, title = '导出') {
  try {
    const filename = sanitizeFilename(title) + '.html'
    const content = message?.content || ''

    // 提取 htmath 代码块
    const blocks = []
    let replaced = content
    const htmathRegex = /```htmath([\s\S]*?)```/gi
    let index = 0
    replaced = replaced.replace(htmathRegex, (_full, inner) => {
      index += 1
      const id = `html-${message.id}-${index}`
      blocks.push({ id, html: inner.trim() })
      return `<div data-htmath-placeholder="${id}"></div>`
    })

    // 渲染 Markdown（不包含 iframe），然后进行安全过滤
    const rawHtml = marked.parse(replaced)
    const safeHtml = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: [
        'div',
        'style',
        'img',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'pre',
        'code',
        'blockquote',
        'hr',
        'span',
        'strong',
        'em',
        'ul',
        'ol',
        'li',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'p',
        'a'
      ],
      ADD_ATTR: [
        'id',
        'class',
        'style',
        'src',
        'alt',
        'title',
        'href',
        'target',
        'rel',
        'data-htmath-placeholder'
      ],
      ALLOW_DATA_ATTR: true
    })

    // 插回 iframe（使用 srcdoc 内联，可自适应高度）
    let bodyHtml = safeHtml
    for (const { id, html } of blocks) {
      const iframe = buildHtmathIframe(id, html)
      const phRe = new RegExp(
        `<div[^>]*data-htmath-placeholder=["']${id}["'][^>]*><\\/div>`,
        'i'
      )
      bodyHtml = bodyHtml.replace(
        phRe,
        `<div class="html-container">${iframe}</div>`
      )
    }

    const pageHtml = buildStandaloneHtml(title, bodyHtml)
    const blob = new Blob([pageHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success('已导出网页')
  } catch (e) {
    console.error('导出失败', e)
    toast.error('导出失败')
  }
}
