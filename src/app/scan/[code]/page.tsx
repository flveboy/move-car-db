'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchWithNoCache, clearPageCache, isWeChatBrowser } from '@/lib/wechat-cache'
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
  owner?: {
    phone: string
    name: string
  }
}

interface DriverInfo {
  phone: string
  name: string
}

interface RateLimitInfo {
  dingtalkCount: number
  wechatCount: number
  resetTime: number
}

function ScanContent() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string
  
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null)
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null)
  const [ownerInfo, setOwnerInfo] = useState<{phone?: string, name?: string} | null>(null)
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
    // 清除页面缓存，特别针对微信浏览器
    clearPageCache()
    
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
      if (!code) {
        setError('挪车码不能为空')
        return
      }
      
      console.log('正在加载挪车码:', code)
      console.log('微信浏览器检测:', isWeChatBrowser())
      
      // 使用专门的防缓存请求函数
      const response = await fetchWithNoCache(`/api/codes/lookup/${code}`)
      console.log('API响应状态:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API错误:', errorData)
        setError(errorData.error || '无效的挪车码')
        return
      }

      const result = await response.json()
      console.log('API返回数据:', result)
      
      if (!result.data) {
        setError('无效的响应数据')
        return
      }

      setVehicleInfo(result.data.vehicle)
      
      // 设置驾驶员信息
      if (result.data.driver) {
        setDriverInfo(result.data.driver)
        // 如果有代开驾驶员，联系信息使用驾驶员的
        setOwnerInfo({
          phone: result.data.driver.phone,
          name: result.data.driver.name
        })
      } else {
        setDriverInfo(null)
        // 如果是车主自己，联系信息使用车主的
        if (result.data.vehicle?.owner) {
          setOwnerInfo({
            phone: result.data.vehicle.owner.phone,
            name: result.data.vehicle.owner.name
          })
        }
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
    const phone = ownerInfo?.phone
    if (phone) {
      window.location.href = `tel:${phone}`
    } else {
      setErrorMessage('联系电话不可用')
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
            <div className="space-y-3 mt-4">
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
      <div className="container mx-auto px-2 py-2 max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-2"
        >
          {/* 页面标题 */}
          <Card className="mb-2 bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardHeader className="text-center py-2">
              <div className="mx-auto w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mb-1">
                <Car className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                挪车通知
              </CardTitle>
              {/* <CardDescription className="text-xs text-gray-600">
                请留下挪车信息，通知车主移车
              </CardDescription> */}
            </CardHeader>
          </Card>

          {/* 车辆信息卡片 */}
          <Card className="mb-3 bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-gray-800 flex items-center">
                <Car className="h-5 w-5 mr-2 text-blue-500" />
                车辆信息
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Label className="text-xs text-gray-500">车牌号码</Label>
                    <div className="text-base font-bold text-gray-900">{vehicleInfo.licensePlate}</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Label className="text-xs text-gray-500">车辆颜色</Label>
                    <div className="text-base font-bold text-gray-900">{vehicleInfo.color || '未知颜色'}</div>
                  </div>
                </div>
                
                {/* {(vehicleInfo.brand || vehicleInfo.model) && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-xs text-gray-500">车辆品牌</Label>
                      <div className="text-sm text-gray-900">
                        {vehicleInfo.brand} {vehicleInfo.model}
                      </div>
                    </div>
                  </div>
                )} */}

                {/* 当前驾驶员信息显示 */}
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <Label className="text-xs text-blue-600 font-medium">当前驾驶员</Label>
                    <div className="text-sm text-blue-900 font-semibold">
                      {driverInfo ? driverInfo.name : (vehicleInfo.owner?.name || '车主')}
                    </div>
                  </div>
                  <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    {driverInfo ? '非车主' : '车主'}
                  </div>
                </div>

                {/* 快捷操作按钮 */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-2">
                    {ownerInfo?.phone && (
                      <button
                        onClick={handleCallPhone}
                        className="flex flex-col items-center justify-center p-2 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                      >
                        <Phone className="h-4 w-4 text-green-600 mb-1" />
                        <span className="text-xs text-green-700 font-medium">拨打电话</span>
                      </button>
                    )}
                    
                    <button
                      onClick={handleSendDingTalk}
                      disabled={isDingtalkLoading || dingtalkBlocked || !message.trim()}
                      className="flex flex-col items-center justify-center p-2 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 active:scale-95 disabled:bg-gray-100 disabled:opacity-50 rounded-lg border border-blue-200 disabled:border-gray-200 transition-all duration-150 transform hover:shadow-md active:shadow-sm"
                    >
                      {isDingtalkLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mb-1"></div>
                      ) : (
                        <Bell className="h-4 w-4 text-blue-600 mb-1" />
                      )}
                      <span className="text-xs text-blue-700 font-medium">
                        {isDingtalkLoading ? '发送中' : dingtalkBlocked && dingtalkCountdown > 0 ? `${dingtalkCountdown}s` : '钉钉通知'}
                      </span>
                    </button>
                    
                    <button
                      onClick={handleSendWechat}
                      disabled={isWechatLoading || wechatBlocked || !message.trim()}
                      className="flex flex-col items-center justify-center p-2 bg-orange-50 hover:bg-orange-100 active:bg-orange-200 active:scale-95 disabled:bg-gray-100 disabled:opacity-50 rounded-lg border border-orange-200 disabled:border-gray-200 transition-all duration-150 transform hover:shadow-md active:shadow-sm"
                    >
                      {isWechatLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent mb-1"></div>
                      ) : (
                        <Send className="h-4 w-4 text-orange-600 mb-1" />
                      )}
                      <span className="text-xs text-orange-700 font-medium">
                        {isWechatLoading ? '发送中' : wechatBlocked && wechatCountdown > 0 ? `${wechatCountdown}s` : '企微通知'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 挪车信息输入 */}
          <Card className="mb-2 bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-800 flex items-center">
                <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
                挪车信息
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="space-y-1">
                  <textarea
                    id="message"
                    placeholder="请输入您的挪车需求，例如：您的车辆挡住了我的车，请移车"
                    value={message}
                    onChange={(e) => {
                      if (e.target.value.length <= 200) {
                        setMessage(e.target.value)
                      }
                    }}
                    className="w-full h-20 p-2 text-sm border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 transition-all duration-300 resize-none"
                    maxLength={200}
                  />
                  <div className="text-right text-xs text-gray-500">
                    {message.length}/200
                  </div>
                </div>

                {/* 消息模板选择 */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700">快速模板</Label>
                  <Tabs defaultValue="default" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-0.5 h-8">
                      <TabsTrigger 
                        value="default" 
                        onClick={() => handleTemplateSelect('default')} 
                        className="text-xs py-1 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
                      >
                        默认
                      </TabsTrigger>
                      <TabsTrigger 
                        value="polite" 
                        onClick={() => handleTemplateSelect('polite')} 
                        className="text-xs py-1 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
                      >
                        礼貌
                      </TabsTrigger>
                      <TabsTrigger 
                        value="urgent" 
                        onClick={() => handleTemplateSelect('urgent')} 
                        className="text-xs py-1 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
                      >
                        紧急
                      </TabsTrigger>
                      <TabsTrigger 
                        value="police" 
                        onClick={() => handleTemplateSelect('police')} 
                        className="text-xs py-1 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
                      >
                        交警
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
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