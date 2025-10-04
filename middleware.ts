import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 检测是否为微信浏览器
  const userAgent = request.headers.get('user-agent') || ''
  const isWeChatBrowser = /MicroMessenger/i.test(userAgent)
  
  // 对于扫码相关的API和页面，添加强制防缓存头部
  const isScanRelated = request.nextUrl.pathname.includes('/codes/lookup') || 
                       request.nextUrl.pathname.includes('/scan') ||
                       request.nextUrl.pathname.includes('/toggle')

  if (isScanRelated || isWeChatBrowser) {
    const response = NextResponse.next()
    
    // 添加强制防缓存头部
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')
    response.headers.set('Last-Modified', new Date().toUTCString())
    response.headers.set('ETag', `"${Date.now()}-${Math.random()}"`)
    response.headers.set('Vary', 'User-Agent')
    
    if (isWeChatBrowser) {
      // 微信浏览器特殊处理
      response.headers.set('X-Accel-Expires', '0')
      response.headers.set('X-Cache-Control', 'no-cache')
      response.headers.set('X-Powered-By', 'MoveCarDB-NoCache')
    }
    
    return response
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/codes/lookup/:path*',
    '/api/codes/:path*/toggle',
    '/api/vehicles/:path*/drivers/:path*/toggle',
    '/scan/:path*',
    '/scan-result/:path*'
  ]
}