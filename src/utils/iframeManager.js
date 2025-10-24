// iframe manager for sandboxed <htmath> rendering with caching and self-heal
import { getAllPatterns, generateInjectionScript, cacheConfig, sandboxConfig } from '../config/visualization-libs.config.js'

export const INJECTION_VERSION = '3'

// Global caches shared across components
export const globalIframeCache = window.__htmathIframeCache || (window.__htmathIframeCache = new Map())
const globalResizeListener = window.__htmathResizeListener || (window.__htmathResizeListener = { installed: false })

function ensureGlobalResizeListener() {
	if (globalResizeListener.installed) return
	window.addEventListener('message', (ev) => {
		const data = ev.data
		if (data && data.__htmath && data.id && typeof data.height === 'number') {
			const cachedData = globalIframeCache.get(data.id)
			if (cachedData && cachedData.iframe) {
				const h = Math.max(120, data.height)
				cachedData.iframe.style.height = h + 'px'
				const parent = cachedData.iframe.parentElement
				const indicator = parent && parent.querySelector ? parent.querySelector('.iframe-loading-indicator') : null
				if (indicator) indicator.remove()
			}
		}
	})
	globalResizeListener.installed = true
}

export function createHtmathIframeManager(getEnabledLibs) {
	ensureGlobalResizeListener()

	function insertHtmlToDom(id, htmlContent, options = {}) {
		try {
			const container = document.getElementById(id)
			if (!container) return

			// Mark for observer targeting and reset indicator
			container.setAttribute('data-htmath-id', id)

			// Try cache reuse
			const cachedData = globalIframeCache.get(id)
			const cachedHtml = cachedData?.htmlContent
			if (cachedData && cachedData.iframe && cachedHtml === htmlContent && cachedData.version === INJECTION_VERSION) {
				const existingIframe = cachedData.iframe
				if (existingIframe.parentElement !== container) {
					existingIframe.parentElement?.removeChild(existingIframe)
					container.innerHTML = ''
					container.appendChild(existingIframe)
				}
				const indicator = container.querySelector('.iframe-loading-indicator')
				if (indicator) indicator.remove()
				// If potentially blank due to page lifecycle, try to rehydrate
				rehydrateIfBlank(id, /*showIndicator*/ true)
				if (typeof options.observeContainer === 'function') options.observeContainer(container)
				return
			}

			// Miss: show loading indicator
			container.innerHTML = '<div class="iframe-loading-indicator"><div class="spinner"></div><span>正在加载可视化...</span></div>'

			// Strip external library tags and rely on preloaded libs
			let processedHtml = htmlContent
			const enabledLibs = (typeof getEnabledLibs === 'function' ? getEnabledLibs() : []) || []
			const allPatterns = getAllPatterns()
			const removedLibs = []
			enabledLibs.forEach((lib) => {
				(lib.patterns || []).forEach((pattern) => {
					if (pattern.test(processedHtml)) {
						processedHtml = processedHtml.replace(pattern, '')
						if (!removedLibs.includes(lib.name)) removedLibs.push(lib.name)
					}
				})
			})
			if (cacheConfig.debug && removedLibs.length > 0) {
				console.log(`🔧 已移除外部库引用: ${removedLibs.join(', ')}`)
			}

			const resizeScript = `
			<script>(function(){
				var ROOT_ID = '__htmath_root';
				var root = null;
				var scheduled = false;
				function ensureRoot(){
					if (!root) {
						root = document.getElementById(ROOT_ID) || document.body || document.documentElement;
					}
					return root;
				}
				function measure(){
					try {
						var el = ensureRoot();
						var rect = el.getBoundingClientRect();
						var h = Math.ceil(rect.height);
						if (!h || h < 1) {
							h = Math.max(
								document.documentElement ? document.documentElement.scrollHeight : 0,
								document.body ? document.body.scrollHeight : 0,
								document.documentElement ? document.documentElement.offsetHeight : 0,
								document.body ? document.body.offsetHeight : 0
							);
						}
						h = Math.max(120, h);
						parent.postMessage({__htmath:true, id: '${id}', height: h}, '*');
					} catch(e) {}
				}
				function rafSend(){
					if (scheduled) return; scheduled = true;
					requestAnimationFrame(function(){ scheduled = false; measure(); });
				}
				window.addEventListener('load', rafSend);
				window.addEventListener('resize', rafSend);
				try {
					var el = ensureRoot();
					if (window.ResizeObserver && el) {
						var ro = new ResizeObserver(function(){ rafSend(); });
						ro.observe(el);
					}
				} catch(_) {}
				try {
					var mo = new MutationObserver(function(){ rafSend(); });
					mo.observe(document.documentElement || document.body, {subtree:true, childList:true, attributes:true, characterData:true});
				} catch(_) {}
				function hookPlotly(){
					try {
						if (!window.Plotly) return;
						var nodes = document.querySelectorAll('.js-plotly-plot');
						nodes.forEach(function(n){
							if (n.__ht_plotly_hooked) return;
							n.__ht_plotly_hooked = true;
							if (typeof n.on === 'function') {
								n.on('plotly_afterplot', rafSend);
								n.on('plotly_relayout', rafSend);
								n.on('plotly_redraw', rafSend);
								n.on('plotly_animated', rafSend);
							}
						});
					} catch(_) {}
				}
				hookPlotly();
				try {
					var plotMo = new MutationObserver(function(muts){
						for (var i=0;i<muts.length;i++){
							var m = muts[i];
							if ((m.addedNodes && m.addedNodes.length) || m.type === 'attributes') {
								hookPlotly();
								break;
							}
						}
					});
					plotMo.observe(document.documentElement || document.body, {subtree:true, childList:true, attributes:true});
				} catch(_) {}
				setTimeout(rafSend, 0);
				setTimeout(rafSend, 50);
				setTimeout(rafSend, 200);
			})();<\/script>`

			// Prefer blob URLs if available
			const blobMap = (window.__htmathLibBlobs || {})
			const libsForInjection = enabledLibs.map((lib) => ({ ...lib, url: blobMap[lib.id] || lib.url }))
			const libInjectionScript = generateInjectionScript(libsForInjection)
			const lightBaseStyle = `
			<style>
				:root { color-scheme: light; }
				*, *::before, *::after { box-sizing: border-box; }
				html, body { background: #ffffff; color: #111; width: 100%; }
				body { margin: 0; }
				a { color: #1a73e8; }
				table { border-color: #e5e7eb; }
				pre, code { background: #f8fafc; color: #0f172a; }
				#__htmath_root { display: block; width: 100%; }
			</style>`

			let srcdocHtml = processedHtml
			if (/<html[\s\S]*<\/html>/i.test(srcdocHtml)) {
				if (/<\/body>/i.test(srcdocHtml)) {
					srcdocHtml = srcdocHtml.replace(/<\/head>/i, `${lightBaseStyle}${libInjectionScript}</head>`)
					srcdocHtml = srcdocHtml
						.replace(/<body([^>]*)>/i, '<body$1><div id="__htmath_root">')
						.replace(/<\/body>/i, `</div>${resizeScript}</body>`)
				} else {
					srcdocHtml = lightBaseStyle + libInjectionScript + `<div id="__htmath_root">` + srcdocHtml + `</div>` + resizeScript
				}
			} else {
				srcdocHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${lightBaseStyle}${libInjectionScript}</head><body><div id="__htmath_root">${srcdocHtml}</div>${resizeScript}</body></html>`
			}

			const iframe = document.createElement('iframe')
			const sandboxValue = sandboxConfig.strict
				? sandboxConfig.attributes.filter((attr) => attr !== 'allow-same-origin').join(' ')
				: sandboxConfig.attributes.join(' ')
			iframe.setAttribute('sandbox', sandboxValue)
			iframe.setAttribute('referrerpolicy', sandboxConfig.referrerPolicy)
			iframe.style.width = '100%'
			iframe.style.border = '0'
			iframe.style.display = 'block'
			iframe.style.overflow = 'hidden'
			iframe.style.minHeight = '120px'
			iframe.srcdoc = srcdocHtml

			iframe.addEventListener('load', () => {
				const indicator = container.querySelector('.iframe-loading-indicator')
				if (indicator) indicator.remove()
			})

			globalIframeCache.set(id, {
				iframe,
				htmlContent: htmlContent,
				srcdocHtml,
				timestamp: Date.now(),
				version: INJECTION_VERSION,
			})

			// Remove old iframe if necessary
			if (cachedData && cachedData.iframe && cachedData.iframe !== iframe) {
				cachedData.iframe.parentElement?.removeChild(cachedData.iframe)
			}

			container.appendChild(iframe)
			if (typeof options.observeContainer === 'function') options.observeContainer(container)
		} catch (error) {
			console.error('处理HTML标签时出错:', error)
		}
	}

	function rehydrateIfBlank(id, showIndicator = false) {
		const cached = globalIframeCache.get(id)
		if (!cached || !cached.iframe) return false
		const iframe = cached.iframe
		try {
			const canAccess = !!(iframe.contentWindow && iframe.contentDocument)
			let isBlank = false
			if (canAccess) {
				const doc = iframe.contentDocument
				const url = iframe.contentWindow.location?.href || ''
				const root = doc && doc.getElementById ? doc.getElementById('__htmath_root') : null
				isBlank = !doc || doc.readyState === 'uninitialized' || url.endsWith('about:blank') || !root || !root.childNodes || root.childNodes.length === 0
			} else {
				isBlank = !iframe.offsetHeight || iframe.offsetHeight < 10
			}
			if (isBlank) {
				const container = iframe.parentElement
				if (!container) return false
				if (showIndicator) {
					const hasIndicator = container.querySelector('.iframe-loading-indicator')
					if (!hasIndicator) {
						const wrap = document.createElement('div')
						wrap.className = 'iframe-loading-indicator'
						wrap.innerHTML = '<div class="spinner"></div><span>正在恢复可视化...</span>'
						container.insertBefore(wrap, iframe)
					}
				}

				if (cached.srcdocHtml) {
					iframe.srcdoc = cached.srcdocHtml
				} else if (cached.htmlContent) {
					const enabledLibs = (typeof getEnabledLibs === 'function' ? getEnabledLibs() : []) || []
					const blobMap = (window.__htmathLibBlobs || {})
					const libsForInjection = enabledLibs.map((lib) => ({ ...lib, url: blobMap[lib.id] || lib.url }))
					const lightBaseStyle = `
			<style>
				:root { color-scheme: light; }
				*, *::before, *::after { box-sizing: border-box; }
				html, body { background: #ffffff; color: #111; width: 100%; }
				body { margin: 0; }
				a { color: #1a73e8; }
				table { border-color: #e5e7eb; }
				pre, code { background: #f8fafc; color: #0f172a; }
				#__htmath_root { display: block; width: 100%; }
			</style>`
					const libInjectionScript = generateInjectionScript(libsForInjection)
					const resizeScript = `
			<script>(function(){
				var ROOT_ID = '__htmath_root';
				var root = null; var scheduled = false;
				function ensureRoot(){ if(!root){ root = document.getElementById(ROOT_ID) || document.body || document.documentElement; } return root; }
				function measure(){ try{ var el = ensureRoot(); var rect = el.getBoundingClientRect(); var h = Math.ceil(rect.height); if(!h||h<1){ h = Math.max(document.documentElement?document.documentElement.scrollHeight:0, document.body?document.body.scrollHeight:0, document.documentElement?document.documentElement.offsetHeight:0, document.body?document.body.offsetHeight:0); } h = Math.max(120,h); parent.postMessage({__htmath:true,id: '${id}',height: h}, '*'); }catch(e){} }
				function rafSend(){ if(scheduled) return; scheduled = true; requestAnimationFrame(function(){ scheduled=false; measure(); }); }
				window.addEventListener('load', rafSend); window.addEventListener('resize', rafSend);
				try{ var el = ensureRoot(); if(window.ResizeObserver && el){ var ro = new ResizeObserver(function(){ rafSend(); }); ro.observe(el); } }catch(_){ }
				try{ var mo = new MutationObserver(function(){ rafSend(); }); mo.observe(document.documentElement||document.body, {subtree:true, childList:true, attributes:true, characterData:true}); }catch(_){ }
				setTimeout(rafSend,0); setTimeout(rafSend,50); setTimeout(rafSend,200);
			})();<\/script>`
					const bodyWrapped = `<div id="__htmath_root">${cached.htmlContent}</div>`
					const srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${lightBaseStyle}${libInjectionScript}</head><body>${bodyWrapped}${resizeScript}</body></html>`
					iframe.srcdoc = srcdoc
					cached.srcdocHtml = srcdoc
				}
				cached.timestamp = Date.now()
				return true
			}
		} catch (_) {}
		return false
	}

	return { insertHtmlToDom, rehydrateIfBlank }
}

