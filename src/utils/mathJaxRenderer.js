// MathJax loader and typesetter utilities

export function ensureMathJaxLoaded() {
	if (window.MathJax) return
	try {
		const script = document.createElement('script')
		script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
		script.async = true
		window.MathJax = {
			tex: {
				inlineMath: [['$', '$'], ['\\(', '\\)']],
				displayMath: [['$$', '$$'], ['\\[', '\\]']],
				processEscapes: true
			},
			svg: { fontCache: 'global' }
		}
		document.head.appendChild(script)
	} catch (_) {}
}

export function typesetMath() {
	try {
		if (!window.MathJax) return
		if (window.MathJax.typesetPromise) {
			window.MathJax.typesetPromise().catch(() => {})
		} else if (window.MathJax.Hub) {
			window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub])
		}
	} catch (_) {}
}

