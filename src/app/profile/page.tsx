// src/app/profile/page.tsx
'use client'

import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

import { Header } from '@/components/layout/header'
import { EditProfileDialog } from '@/components/profile/edit-profile-dialog'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Car, QrCode, Bell, Calendar, Edit } from 'lucide-react'
import { PageLoading } from '@/components/layout/page-loading'
import { usePageLoadComplete } from '@/components/layout/loading-provider'
export default function ProfilePage() {
  const { user, token, isLoading: authLoading } = useAuth()
  // 使用这个hook会在页面加载完成后自动隐藏全局loading遮罩
  usePageLoadComplete()
  const router = useRouter()
  const [stats, setStats] = useState({ vehicleCount: 0, codeCount: 0, notificationCount: 0 })
  const [error, setError] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [navigating, setNavigating] = useState(false)

  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    console.log('useEffect触发', { token: !!token, user: !!user, authLoading })
    
    // 如果还在认证loading中，等待认证完成
    if (authLoading) {
      console.log('认证仍在loading中，等待...')
      return
    }

    // 认证完成，如果有用户数据，异步获取统计数据
    if (user && token) {
      const fetchStats = async () => {
        try {
          console.log('开始获取统计数据')
          
          // 如果是管理员，不调用统计信息接口
          if (user.role === 'ADMIN') {
            console.log('管理员用户，跳过统计信息获取')
            setStats({
              vehicleCount: 0,
              codeCount: 0,
              notificationCount: 0
            })
            setLoading(false)
            return
          }
          
          const response = await fetch('/api/user/stats', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          console.log('API响应状态:', response.status)
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const data = await response.json()
          console.log('获取到统计数据:', data)
          setStats(data.stats)
          setError(null)
        } catch (error) {
          console.error('获取统计信息失败:', error)
          setError(error instanceof Error ? error.message : '加载数据失败，请稍后刷新或联系管理员')
          setStats({
            vehicleCount: 0,
            codeCount: 0,
            notificationCount: 0
          })
        } finally {
          // 无论成功失败都设置加载完成
          setLoading(false)
        }
      }
      
      fetchStats()
    } else {
      // 如果没有用户数据，也设置加载完成
      setLoading(false)
    }
  }, [token, user, authLoading])
  
  // 只依赖认证的loading状态
  if (authLoading) {
    return <PageLoading />;
  }
  
  if (!user) {
    return null;
  }
  
  // 如果统计数据还在加载中，显示加载组件
  if (loading) {
    return (
      <>
        <Header title="个人信息" />
        <div className="max-w-3xl mx-auto py-16 px-4 text-center">
          <PageLoading />
        </div>
      </>
    );
  }
  
  console.log('显示正常内容', { authLoading, user, loading })

  return (
    <>
      <Header title="个人信息" />
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">个人资料</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              编辑资料
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setNavigating(true)
                router.push('/admin')
              }}
              disabled={navigating}
            >
              {navigating ? '跳转中...' : '返回管理界面'}
            </Button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6 bg-gradient-to-br from-blue-50 to-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-500">用户名</Label>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-lg font-medium">{user.username || '未设置'}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-500">姓名</Label>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-lg font-medium">{user.name}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-500">手机号</Label>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-lg font-medium">{user.phone}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-500">邮箱</Label>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-lg font-medium">{user.email || '未设置'}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-500">角色</Label>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-lg font-medium">
                  {user.role === 'ADMIN' ? '管理员' : '普通用户'}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-500 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                注册时间
              </Label>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-lg font-medium">
                  {user.createdAt ? format(new Date(user.createdAt), 'yyyy-MM-dd HH:mm:ss') : '未知'}
                </p>
              </div>
            </div>
          </div>
          
          {/* 管理员不显示数据统计 */}
          {user?.role !== 'ADMIN' && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4 text-blue-700">数据统计</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Car className="h-5 w-5 text-blue-500" />
                      车辆数量
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-700">{stats.vehicleCount}</p>
                  </CardContent>
                </Card>
                
                <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-green-500" />
                      挪车码数量
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-700">{stats.codeCount}</p>
                  </CardContent>
                </Card>
                
                <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bell className="h-5 w-5 text-amber-500" />
                      收到通知数
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-amber-700">{stats.notificationCount}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
          {/* 移除了"前往设置"按钮 */}
        </div>
      </div>

      <EditProfileDialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen}
        onProfileUpdated={() => {
          window.location.reload()
        }}
      />
    </>
  )
}