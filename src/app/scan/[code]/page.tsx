'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Phone, MessageCircle, Car, Clock, MapPin } from 'lucide-react'

export default function ScanPage() {
  const params = useParams()
  const router = useRouter()
  const [code, setCode] = useState<any>(null)
  const [vehicle, setVehicle] = useState<any>(null)
  const [owner, setOwner] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCodeInfo = async () => {
      try {
        // TODO: 实现获取码信息的API调用
        // 模拟数据
        const mockCode = {
          id: '1',
          code: params.code,
          isActive: true,
          vehicle: {
            id: '1',
            licensePlate: '京A12345',
            brand: '丰田',
            model: '凯美瑞',
            color: '白色'
          },
          owner: {
            id: '1',
            phone: '138****8888',
            name: '张三'
          }
        }
        
        if (!mockCode.isActive) {
          setError('此挪车码已停用')
          return
        }

        setCode(mockCode)
        setVehicle(mockCode.vehicle)
        setOwner(mockCode.owner)
      } catch (err) {
        setError('获取信息失败，请检查挪车码是否正确')
      } finally {
        setLoading(false)
      }
    }

    fetchCodeInfo()
  }, [params.code])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return

    try {
      // TODO: 实现提交扫码记录的API调用
      console.log('提交扫码记录:', {
        codeId: code.id,
        message,
        timestamp: new Date().toISOString()
      })
      
      setSubmitted(true)
    } catch (err) {
      setError('提交失败，请重试')
    }
  }

  const handleCall = () => {
    if (owner?.phone) {
      window.location.href = `tel:${owner.phone}`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center text-red-600">错误</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              className="w-full mt-4" 
              onClick={() => router.push('/')}
            >
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center text-green-600">通知已发送</CardTitle>
            <CardDescription className="text-center">
              您的挪车请求已成功发送给车主
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <MessageCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-gray-600">
                车主收到通知后会尽快前来挪车，感谢您的耐心等待
              </p>
              <Button 
                className="w-full" 
                onClick={() => router.push('/')}
              >
                完成
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">扫码挪车</h1>
          <p className="text-gray-600">请车主挪车通知</p>
        </header>

        <div className="space-y-6">
          {/* 车辆信息卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                车辆信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">车牌号</p>
                  <p className="font-semibold text-lg">{vehicle?.licensePlate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">车型</p>
                  <p className="font-semibold">{vehicle?.brand} {vehicle?.model}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">颜色</p>
                  <Badge variant="secondary">{vehicle?.color}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">挪车码</p>
                  <p className="font-mono text-sm">{code?.code}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 联系车主卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                联系车主
              </CardTitle>
              <CardDescription>
                您可以选择直接拨打电话或发送挪车通知
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  className="w-full flex items-center gap-2" 
                  onClick={handleCall}
                >
                  <Phone className="h-4 w-4" />
                  直接拨打电话
                </Button>
                
                <div className="text-center text-gray-500">或</div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="message">挪车留言</Label>
                    <Textarea
                      id="message"
                      placeholder="请描述需要挪车的原因，例如：您的车辆挡住了我的车位，麻烦挪一下车，谢谢！"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    发送挪车通知
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          {/* 提示信息 */}
          <Alert>
            <AlertDescription>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">温馨提示</p>
                  <ul className="text-sm space-y-1">
                    <li>• 发送通知后，车主会收到挪车提醒</li>
                    <li>• 请耐心等待车主前来挪车</li>
                    <li>• 如遇紧急情况，请直接拨打电话联系</li>
                    <li>• 请文明用语，感谢您的理解与配合</li>
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}