'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Car, MessageCircle, Phone, Bell, Send, X, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

interface VehicleInfo {
  id: string
  licensePlate: string
  brand?: string
  model?: string
  color?: string
  ownerPhone?: string
  ownerName?: string
}

interface RateLimitInfo {
  dingtalkCount: number
  wechatCount: number
  resetTime: number
}

function ScanContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDingtalkLoading, setIsDingtalkLoading] = useState(false)
  const [isWechatLoading, setIsWechatLoading] = useState(false)
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)
  const [notificationSent, setNotificationSent] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [showRateLimitModal, setShowRateLimitModal] = useState(false)
  const [modalCountdown, setModalCountdown] = useState(5)
  const [errorMessage, setErrorMessage] = useState('')
  const [error, setError] = useState('')
  const [dingtalkBlocked, setDingtalkBlocked] = useState(false)
  const [wechatBlocked, setWechatBlocked] = useState(false)
  const [dingtalkCountdown, setDingtalkCountdown] = useState(0)
  const [wechatCountdown, setWechatCountdown] = useState(0)

  // 消息模板
  const messageTemplates = {
    default: "您好，您的车辆需要挪动一下，谢谢！",
    polite: "尊敬的先生/女士，您好！您的爱车挡住了我的去路，麻烦您挪一下车，非常感谢！",
    urgent: "紧急挪车通知！您的车辆挡住了紧急通道，请立即前来挪车！",
    police: "交警来了，赶紧挪车！请立即前来处理，以免被罚款！"
  }

  // 加载车辆信息和速率限制
  useEffect(() => {
    if (code) {
      loadVehicleInfo()
      loadRateLimit()
      // 设置默认消息
      setMessage(messageTemplates.default)
    }
  }, [code])

  // 钉钉倒计时effect
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (dingtalkCountdown > 0) {
      timer = setTimeout(() => {
        setDingtalkCountdown(dingtalkCountdown - 1)
      }, 1000)
    } else if (dingtalkBlocked) {
      setDingtalkBlocked(false)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [dingtalkCountdown, dingtalkBlocked])

  // 企微倒计时effect
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (wechatCountdown > 0) {
      timer = setTimeout(() => {
        setWechatCountdown(wechatCountdown - 1)
      }, 1000)
    } else if (wechatBlocked) {
      setWechatBlocked(false)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [wechatCountdown, wechatBlocked])

  // 成功通知自动关闭效果
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (showSuccessModal || showErrorModal || showRateLimitModal) {
      // 重置倒计时
      setModalCountdown(5)
      
      // 设置倒计时定时器
      timer = setInterval(() => {
        setModalCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            setShowSuccessModal(false)
            setShowErrorModal(false)
            setShowRateLimitModal(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [showSuccessModal, showErrorModal, showRateLimitModal])

  const loadVehicleInfo = async () => {
    try {
      const response = await fetch(`/api/codes/lookup/${code}`)
      if (response.ok) {
        const data = await response.json()
        setVehicleInfo(data.data)
      } else {
        setError('无效的挪车码')
      }
    } catch (error) {
      console.error('加载车辆信息失败:', error)
      setError('网络错误，请稍后重试')
    }
  }

  const loadRateLimit = async () => {
    try {
      const response = await fetch('/api/notifications/rate-limit')
      if (response.ok) {
        const data = await response.json()
        setRateLimitInfo(data.data)
      }
    } catch (error) {
      console.error('加载速率限制信息失败:', error)
    }
  }

  const handleTemplateSelect = (template: keyof typeof messageTemplates) => {
    setMessage(messageTemplates[template])
  }

  const handleSendDingTalk = async () => {
    if (!vehicleInfo || !message.trim()) {
      setErrorMessage('请输入挪车信息')
      setShowErrorModal(true)
      return
    }

    if (dingtalkBlocked) {
      setErrorMessage(`发送过于频繁，请于 ${dingtalkCountdown} 秒后重试`)
      setShowRateLimitModal(true)
      return
    }

    setIsDingtalkLoading(true)
    try {
      const response = await fetch('/api/notifications/send-dingtalk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vehicleId: vehicleInfo.id,
          message: message,
          code: code
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setNotificationSent(true)
        setShowSuccessModal(true)
        setRateLimitInfo(result.data.rateLimit)
      } else {
        if (response.status === 429) {
          setDingtalkBlocked(true)
          setRateLimitInfo(result.data.rateLimit)
          // 设置倒计时为60秒
          setDingtalkCountdown(60)
          setErrorMessage('发送过于频繁，请稍后重试')
          setShowRateLimitModal(true)
        } else {
          setErrorMessage(`发送失败：${result.error}`)
          setShowErrorModal(true)
        }
      }
    } catch (error) {
      console.error('发送钉钉通知失败:', error)
      setErrorMessage('发送失败，请稍后重试')
      setShowErrorModal(true)
    } finally {
      setIsDingtalkLoading(false)
    }
  }

  const handleSendWechat = async () => {
    if (!vehicleInfo || !message.trim()) {
      setErrorMessage('请输入挪车信息')
      setShowErrorModal(true)
      return
    }

    if (wechatBlocked) {
      setErrorMessage(`发送过于频繁，请于 ${wechatCountdown} 秒后重试`)
      setShowRateLimitModal(true)
      return
    }

    setIsWechatLoading(true)
    try {
      const response = await fetch('/api/notifications/send-wechat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vehicleId: vehicleInfo.id,
          message: message,
          code: code
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setNotificationSent(true)
        setShowSuccessModal(true)
        setRateLimitInfo(result.data.rateLimit)
      } else {
        if (response.status === 429) {
          setWechatBlocked(true)
          setRateLimitInfo(result.data.rateLimit)
          // 设置倒计时为60秒
          setWechatCountdown(60)
          setErrorMessage('发送过于频繁，请稍后重试')
          setShowRateLimitModal(true)
        } else {
          setErrorMessage(`发送失败：${result.error}`)
          setShowErrorModal(true)
        }
      }
    } catch (error) {
      console.error('发送企业微信通知失败:', error)
      setErrorMessage('发送失败，请稍后重试')
      setShowErrorModal(true)
    } finally {
      setIsWechatLoading(false)
    }
  }

  const handleCallPhone = () => {
    if (vehicleInfo?.ownerPhone) {
      window.location.href = `tel:${vehicleInfo.ownerPhone}`
    } else {
      setErrorMessage('车主电话不可用')
      setShowErrorModal(true)
    }
  }

  const formatTimeRemaining = (resetTime: number) => {
    const now = Date.now()
    const remaining = resetTime - now
    if (remaining <= 0) return '现在可重试'
    
    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)
    return `${minutes}分${seconds}秒后重试`
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => router.push('/')}
              className="w-full mt-4"
            >
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!vehicleInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-2 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* 车辆信息卡片 */}
          <Card className="mb-3 bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardHeader className="text-center pb-3">
              <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-2">
                <Car className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                挪车通知
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                请留下挪车信息，通知车主移车
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                <div className="flex items-center justify-between p-1 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-sm text-gray-500">车牌号码</Label>
                    <div className="text-lg font-bold text-gray-900">{vehicleInfo.licensePlate}</div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {vehicleInfo.color || '未知颜色'}
                  </Badge>
                </div>
                
                {(vehicleInfo.brand || vehicleInfo.model) && (
                  <div className="flex items-center justify-between p-1 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-sm text-gray-500">车辆信息</Label>
                      <div className="text-base text-gray-900">
                        {vehicleInfo.brand} {vehicleInfo.model}
                      </div>
                    </div>
                  </div>
                )}

                {vehicleInfo.ownerName && (
                  <div className="flex items-center justify-between p-1 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-sm text-gray-500">车主姓名</Label>
                      <div className="text-base text-gray-900">{vehicleInfo.ownerName}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 挪车信息输入 */}
          <Card className="mb-3 bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <textarea
                    id="message"
                    placeholder="请输入您的挪车需求，例如：您的车辆挡住了我的车，请移车"
                    value={message}
                    onChange={(e) => {
                      if (e.target.value.length <= 200) {
                        setMessage(e.target.value)
                      }
                    }}
                    className="w-full h-28 p-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 transition-all duration-300 resize-none"
                    maxLength={200}
                  />
                  <div className="text-right text-sm text-gray-500">
                    {message.length}/200
                  </div>
                </div>

                {/* 消息模板选择 */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">快速选择模板</Label>
                  <Tabs defaultValue="default" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1">
                      <TabsTrigger 
                        value="default" 
                        onClick={() => handleTemplateSelect('default')} 
                        className="text-xs data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
                      >
                        默认通知
                      </TabsTrigger>
                      <TabsTrigger 
                        value="polite" 
                        onClick={() => handleTemplateSelect('polite')} 
                        className="text-xs data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
                      >
                        礼貌版
                      </TabsTrigger>
                      <TabsTrigger 
                        value="urgent" 
                        onClick={() => handleTemplateSelect('urgent')} 
                        className="text-xs data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
                      >
                        紧急版
                      </TabsTrigger>
                      <TabsTrigger 
                        value="police" 
                        onClick={() => handleTemplateSelect('police')} 
                        className="text-xs data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
                      >
                        交警版
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <Card className="mt-2 bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <Button
                  onClick={handleSendDingTalk}
                  disabled={isDingtalkLoading || !message.trim()}
                  className={`w-full h-10 font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 ${
                    dingtalkBlocked 
                      ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {isDingtalkLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      发送中...
                    </div>
                  ) : dingtalkBlocked ? (
                    <>
                      <Bell className="h-5 w-5 mr-2" />
                      {dingtalkCountdown > 0 ? `${dingtalkCountdown}秒后重试` : '请稍后重试'}
                    </>
                  ) : (
                    <>
                      <Bell className="h-5 w-5 mr-2" />
                      发送钉钉通知
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSendWechat}
                  disabled={isWechatLoading || !message.trim()}
                  className={`w-full h-10 font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 ${
                    wechatBlocked 
                      ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {isWechatLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      发送中...
                    </div>
                  ) : wechatBlocked ? (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      {wechatCountdown > 0 ? `${wechatCountdown}秒后重试` : '请稍后重试'}
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      发送企微通知
                    </>
                  )}
                </Button>

                {vehicleInfo.ownerPhone && (
                  <Button
                    onClick={handleCallPhone}
                    disabled={isDingtalkLoading || isWechatLoading}
                    variant="outline"
                    className="w-full h-10 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-all duration-300"
                  >
                    <Phone className="h-5 w-5 mr-2" />
                    直接拨打电话
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 成功通知弹出层 */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowSuccessModal(false)}
          ></div>
          
          {/* 弹出通知 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full z-10"
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* 成功图标 */}
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Bell className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            {/* 成功消息 */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                通知发送成功！
              </h3>
              <p className="text-gray-600 mb-4">
                车主正快马加鞭的赶来 🏃‍♂️💨
              </p>
              
              {/* 自动关闭提示 */}
              <p className="text-sm text-gray-400">
                {modalCountdown}秒后自动关闭
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* 错误通知弹出层 */}
      {showErrorModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowErrorModal(false)}
          ></div>
          
          {/* 弹出通知 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full z-10"
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => setShowErrorModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* 错误图标 */}
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            {/* 错误消息 */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                发送失败 ⚠️
              </h3>
              <p className="text-gray-600 mb-4">
                {errorMessage}
              </p>
              
              {/* 自动关闭提示 */}
              <p className="text-sm text-gray-400">
                {modalCountdown}秒后自动关闭
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* 限频通知弹出层 */}
      {showRateLimitModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowRateLimitModal(false)}
          ></div>
          
          {/* 弹出通知 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full z-10"
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => setShowRateLimitModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* 限频图标 */}
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            
            {/* 限频消息 */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                发送频率限制 ⚠️
              </h3>
              <p className="text-gray-600 mb-4">
                发送过于频繁，请 {dingtalkBlocked ? dingtalkCountdown : wechatBlocked ? wechatCountdown : 0} 秒后重试
              </p>
              
              {/* 自动关闭提示 */}
              <p className="text-sm text-gray-400">
                {modalCountdown}秒后自动关闭
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ScanContent />
    </Suspense>
  )
}