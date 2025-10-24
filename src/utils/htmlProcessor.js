// Utilities for Markdown parsing/sanitization and lightweight HTML processing
import { marked } from 'marked'
import DOMPurify from 'dompurify'

let markedInitialized = false
let domPurifyHooked = false

export function initMarked() {
	if (markedInitialized) return
	try {
		marked.setOptions({ breaks: true, gfm: true })
	} catch (_) {}
	markedInitialized = true
}

export function ensureDomPurifyImageHook() {
	if (domPurifyHooked) return
	try {
		DOMPurify.addHook('afterSanitizeAttributes', function (node) {
			if (node.tagName === 'IMG' && node.getAttribute('src')) {
				const src = node.getAttribute('src')
				if (typeof src === 'string' && src.startsWith('data:image/')) return node
			}
		})
		domPurifyHooked = true
	} catch (_) {}
}

export function parseMarkdown(text) {
	return DOMPurify.sanitize(marked.parse(text), {
		ADD_TAGS: ['div', 'style', 'img'],
		ADD_ATTR: ['id', 'class', 'style', 'src']
	})
}

// In streaming mode, place lightweight placeholders for <htmath> blocks
// and return async insertion tasks when a block closes
export function processStreamingHtmath(text, messageId) {
	const openTag = '<htmath>'
	const closeTag = '</htmath>'
	let cursor = 0
	let index = 0
	const parts = []
	const tasks = [] // [{id, html}]

	while (true) {
		const start = text.indexOf(openTag, cursor)
		if (start === -1) {
			parts.push(text.slice(cursor))
			break
		}
		// Append plain text before <htmath>
		parts.push(text.slice(cursor, start))
		index += 1
		const id = `html-${messageId}-${index}`
		const end = text.indexOf(closeTag, start + openTag.length)
		if (end === -1) {
			// Unclosed block: show loading indicator and stop (rest will arrive later)
			parts.push(
				`<div id="${id}" class="html-container"><div class="iframe-loading-indicator"><div class="spinner"></div><span>正在加载可视化...</span></div></div>`
			)
			cursor = text.length
			break
		} else {
			// Closed block: schedule iframe injection task
			const innerHtml = text.slice(start + openTag.length, end)
			parts.push(`<div id="${id}" class="html-container"></div>`)
			tasks.push({ id, html: innerHtml })
			cursor = end + closeTag.length
		}
	}

	return { replacedText: parts.join(''), tasks }
}

