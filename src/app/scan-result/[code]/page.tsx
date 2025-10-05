'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchWithNoCache, clearPageCache, isWeChatBrowser } from '@/lib/wechat-cache'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Car, MessageCircle, Phone, Send, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface Vehicle {
  id: string
  licensePlate: string
  brand?: string
  model?: string
  color?: string
  owner: {
    name?: string
    phone?: string
  }
  driver?: {
    name?: string
    phone?: string
  }
}

interface CodeInfo {
  id: string
  code: string
  vehicle: Vehicle
  isActive: boolean
}

function ScanResultContent({ code }: { code: string }) {
  const router = useRouter()
  
  const [codeInfo, setCodeInfo] = useState<CodeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [notificationStatus, setNotificationStatus] = useState<{
    type: 'success' | 'error' | 'rate_limit' | null
    message: string
  }>({ type: null, message: '' })

  // 速率限制状态
  const [rateLimits, setRateLimits] = useState({
    dingtalk: { count: 0, resetTime: 0 },
    wechat: { count: 0, resetTime: 0 }
  })

  useEffect(() => {
    // 清除页面缓存，特别针对微信浏览器
    clearPageCache()
    
    if (code) {
      fetchCodeInfo(code)
    } else {
      router.push('/')
    }
  }, [code, router])

  useEffect(() => {
    // 检查速率限制重置
    const checkRateLimits = setInterval(() => {
      const now = Date.now()
      setRateLimits(prev => ({
        dingtalk: now > prev.dingtalk.resetTime ? { count: 0, resetTime: 0 } : prev.dingtalk,
        wechat: now > prev.wechat.resetTime ? { count: 0, resetTime: 0 } : prev.wechat
      }))
    }, 1000)

    return () => clearInterval(checkRateLimits)
  }, [])

  const fetchCodeInfo = async (code: string) => {
    try {
      setLoading(true)
      console.log('正在加载挪车码:', code)
      console.log('微信浏览器检测:', isWeChatBrowser())
      
      // 使用专门的防缓存请求函数
      const response = await fetchWithNoCache(`/api/codes/lookup/${code}`)
      
      if (response.ok) {
        const data = await response.json()
        setCodeInfo(data.data)
        
        // 检查速率限制
        if (data.data.rateLimits) {
          setRateLimits(data.data.rateLimits)
        }
      } else {
        setNotificationStatus({
          type: 'error',
          message: '挪车码不存在或已失效'
        })
      }
    } catch (error) {
      console.error('获取挪车码信息失败:', error)
      setNotificationStatus({
        type: 'error',
        message: '网络错误，请稍后重试'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendNotification = async (type: 'dingtalk' | 'wechat') => {
    if (!codeInfo || !message.trim()) {
      setNotificationStatus({
        type: 'error',
        message: '请输入挪车信息'
      })
      return
    }

    // 检查速率限制
    const limit = rateLimits[type]
    const now = Date.now()
    
    if (limit.count >= 10 && now < limit.resetTime) {
      const remainingTime = Math.ceil((limit.resetTime - now) / 1000)
      setNotificationStatus({
        type: 'rate_limit',
        message: `${type === 'dingtalk' ? '钉钉' : '企微'}通知已达限制，请${remainingTime}秒后重试`
      })
      return
    }

    setSending(true)
    setNotificationStatus({ type: null, message: '' })

    try {
      const response = await fetch(`/api/notifications/send/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          codeId: codeInfo.id,
          message: message.trim(),
          ipAddress: '', // 将在后端获取
          userAgent: navigator.userAgent
        })
      })

      const result = await response.json()

      if (result.success) {
        setNotificationStatus({
          type: 'success',
          message: '车主已收到通知，正快马加鞭的赶来'
        })
        
        // 更新速率限制
        if (result.rateLimits) {
          setRateLimits(result.rateLimits)
        }
        
        // 清空消息输入框
        setMessage('')
      } else {
        setNotificationStatus({
          type: 'error',
          message: result.error || '发送失败，请稍后重试'
        })
      }
    } catch (error) {
      console.error('发送通知失败:', error)
      setNotificationStatus({
        type: 'error',
        message: '网络错误，请稍后重试'
      })
    } finally {
      setSending(false)
    }
  }

  const handlePhoneCall = () => {
    const phone = codeInfo?.vehicle.driver?.phone || codeInfo?.vehicle.owner?.phone
    if (phone) {
      window.open(`tel:${phone}`, '_self')
    }
  }

  const getRemainingCount = (type: 'dingtalk' | 'wechat') => {
    const limit = rateLimits[type]
    const now = Date.now()
    
    if (now >= limit.resetTime) {
      return 10 // 重置后返回完整限制
    }
    
    return Math.max(0, 10 - limit.count)
  }

  const getResetTime = (type: 'dingtalk' | 'wechat') => {
    const limit = rateLimits[type]
    const now = Date.now()
    
    if (now >= limit.resetTime) {
      return null
    }
    
    const remainingSeconds = Math.ceil((limit.resetTime - now) / 1000)
    if (remainingSeconds < 60) {
      return `${remainingSeconds}秒`
    } else {
      return `${Math.ceil(remainingSeconds / 60)}分钟`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!codeInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">挪车码不存在或已停用</h2>
              <p className="text-gray-600 mb-4">请检查挪车码是否正确或联系车主</p>
              <div className="space-y-3">
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  刷新页面
                </Button>
                <Button 
                 onClick={() => {
                  // 在微信浏览器中提供返回提示
                  if (navigator.userAgent.toLowerCase().includes('micromessenger')) {
                    alert('请点击左上角返回按钮或关闭页面')
                  } else {
                    window.close()
                  }
                }}
                variant="outline"
                className="w-full"
              >
                退出页面
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 mb-6">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                <Car className="h-5 w-5" />
                挪车信息
              </CardTitle>
              <CardDescription>
                扫描成功，请输入挪车信息并通知车主
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 车辆信息 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">车辆信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">车牌号码:</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {codeInfo.vehicle.licensePlate}
                    </Badge>
                  </div>
                  {codeInfo.vehicle.brand && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">品牌:</span>
                      <span className="text-sm font-medium">{codeInfo.vehicle.brand}</span>
                    </div>
                  )}
                  {codeInfo.vehicle.model && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">型号:</span>
                      <span className="text-sm font-medium">{codeInfo.vehicle.model}</span>
                    </div>
                  )}
                  {codeInfo.vehicle.color && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">颜色:</span>
                      <span className="text-sm font-medium">{codeInfo.vehicle.color}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 挪车信息输入 */}
              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium text-gray-700">
                  挪车信息 <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="message"
                  placeholder="请输入挪车原因和位置信息，例如：您的车辆挡住了我的车位，请尽快挪车，位置在A区B层..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full h-24 p-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 transition-all duration-300 resize-none"
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 text-right">
                  {message.length}/500 字符
                </div>
              </div>

              {/* 通知状态 */}
              {notificationStatus.type && (
                <Alert className={notificationStatus.type === 'success' ? 'border-green-200 bg-green-50' : notificationStatus.type === 'rate_limit' ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription className={notificationStatus.type === 'success' ? 'text-green-800' : notificationStatus.type === 'rate_limit' ? 'text-yellow-800' : 'text-red-800'}>
                    {notificationStatus.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* 操作按钮 */}
              <div className="space-y-3">
                {/* 通知按钮 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleSendNotification('dingtalk')}
                    disabled={sending || getRemainingCount('dingtalk') === 0}
                    className="bg-blue-500 hover:bg-blue-600 text-white h-12"
                  >
                    {sending ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    发送钉钉通知
                    {getRemainingCount('dingtalk') < 10 && (
                      <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                        剩余 {getRemainingCount('dingtalk')} 次
                      </Badge>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => handleSendNotification('wechat')}
                    disabled={sending || getRemainingCount('wechat') === 0}
                    className="bg-green-500 hover:bg-green-600 text-white h-12"
                  >
                    {sending ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    发送企微通知
                    {getRemainingCount('wechat') < 10 && (
                      <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                        剩余 {getRemainingCount('wechat')} 次
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* 拨打电话按钮 */}
                {(codeInfo.vehicle.driver?.phone || codeInfo.vehicle.owner?.phone) && (
                  <Button
                    onClick={handlePhoneCall}
                    variant="outline"
                    className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    直接拨打电话 (
                    {codeInfo.vehicle.driver?.phone || codeInfo.vehicle.owner?.phone}
                    )
                  </Button>
                )}

                {/* 速率限制提示 */}
                <div className="text-xs text-gray-500 text-center space-y-1">
                  {(getRemainingCount('dingtalk') < 10 || getRemainingCount('wechat') < 10) && (
                    <p>
                      通知限制：每分钟最多可发送 10 次钉钉通知和 10 次企微通知
                    </p>
                  )}
                  {getResetTime('dingtalk') && (
                    <p>钉钉通知重置时间: {getResetTime('dingtalk')}</p>
                  )}
                  {getResetTime('wechat') && (
                    <p>企微通知重置时间: {getResetTime('wechat')}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

export default function ScanResultPage() {
  const { code } = useParams()
  const codeString = Array.isArray(code) ? code[0] : code
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      {codeString && <ScanResultContent code={codeString} />}
    </Suspense>
  )
}