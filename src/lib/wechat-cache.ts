/**
 * 微信浏览器缓存控制工具
 * 专门处理微信浏览器的缓存问题
 */

/**
 * 检测是否在微信浏览器环境中
 */
export function isWeChatBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /MicroMessenger/i.test(navigator.userAgent)
}

/**
 * 为API请求添加防缓存参数
 */
export function addNoCacheParams(url: string): string {
  const separator = url.includes('?') ? '&' : '?'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return `${url}${separator}t=${timestamp}&_=${random}&nocache=1`
}

/**
 * 获取防缓存的请求头
 */
export function getNoCacheHeaders(): HeadersInit {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'If-Modified-Since': '0'
  }
}

/**
 * 创建防缓存的fetch请求
 */
export async function fetchWithNoCache(url: string, options: RequestInit = {}): Promise<Response> {
  const noCacheUrl = addNoCacheParams(url)
  const noCacheHeaders = {
    ...getNoCacheHeaders(),
    ...options.headers
  }
  
  return fetch(noCacheUrl, {
    ...options,
    headers: noCacheHeaders
  })
}

/**
 * 强制刷新页面（微信浏览器兼容）
 */
export function forceRefresh(): void {
  if (isWeChatBrowser()) {
    // 微信浏览器特殊处理
    window.location.href = window.location.href + (window.location.href.includes('?') ? '&' : '?') + 'refresh=' + Date.now()
  } else {
    window.location.reload()
  }
}

/**
 * 清除页面缓存（在页面加载时调用）
 */
export function clearPageCache(): void {
  if (typeof window !== 'undefined') {
    // 设置页面不缓存
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister())
      })
    }
    
    // 禁用浏览器缓存
    const meta = document.createElement('meta')
    meta.httpEquiv = 'Cache-Control'
    meta.content = 'no-cache, no-store, must-revalidate'
    document.head.appendChild(meta)
    
    const meta2 = document.createElement('meta')
    meta2.httpEquiv = 'Pragma'
    meta2.content = 'no-cache'
    document.head.appendChild(meta2)
    
    const meta3 = document.createElement('meta')
    meta3.httpEquiv = 'Expires'
    meta3.content = '0'
    document.head.appendChild(meta3)
  }
}