'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Header } from '@/components/layout/header'
import { Settings, Save, RefreshCw } from 'lucide-react'

interface SystemConfig {
  id: string
  key: string
  value: string
  type: 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON'
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})
  
  const { toast } = useToast()

  // 获取系统配置
  const fetchConfigs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/system-config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setConfigs(data.configs)
        
        // 初始化配置值
        const values: Record<string, string> = {}
        data.configs.forEach((config: SystemConfig) => {
          values[config.key] = config.value
        })
        
        // 如果没有开放注册配置，添加默认值
        if (!data.configs.find((c: SystemConfig) => c.key === 'ALLOW_REGISTRATION')) {
          values['ALLOW_REGISTRATION'] = 'true'
        }
        
        setConfigValues(values)
      } else {
        toast({
          title: "获取系统配置失败",
          description: "请检查权限或稍后重试",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "网络错误",
        description: "请检查网络连接",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  // 更新配置值
  const handleConfigChange = (key: string, value: string) => {
    setConfigValues(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 保存配置
  const handleSaveConfig = async (key: string, type: string = 'BOOLEAN') => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/system-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          key,
          value: configValues[key],
          type
        })
      })
      
      if (response.ok) {
        toast({
          title: "配置保存成功",
          description: "系统配置已更新"
        })
        await fetchConfigs() // 重新获取配置
      } else {
        const error = await response.json()
        toast({
          title: "保存配置失败",
          description: error.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "网络错误",
        description: "请检查网络连接",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // 保存所有配置
  const handleSaveAllConfigs = async () => {
    try {
      setSaving(true)
      
      // 保存开放注册配置
      await handleSaveConfig('ALLOW_REGISTRATION', 'BOOLEAN')
      
      toast({
        title: "所有配置保存成功",
        description: "系统配置已全部更新"
      })
    } catch (error) {
      toast({
        title: "保存失败",
        description: "请稍后重试",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthGuard requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header title="系统配置" />
        
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Settings className="mr-3 h-6 w-6" />
              系统配置
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              管理系统的全局配置项和功能开关
            </p>
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  加载配置中...
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* 用户注册配置 */}
              <Card>
                <CardHeader>
                  <CardTitle>用户注册设置</CardTitle>
                  <CardDescription>
                    控制新用户注册功能的开关
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="allow-registration" className="text-base font-medium">
                        开放注册
                      </Label>
                      <p className="text-sm text-gray-500">
                        开启后允许新用户自主注册账号；关闭后仅管理员可创建用户
                      </p>
                    </div>
                    <Switch
                      id="allow-registration"
                      checked={configValues['ALLOW_REGISTRATION'] === 'true'}
                      onCheckedChange={(checked) => 
                        handleConfigChange('ALLOW_REGISTRATION', checked ? 'true' : 'false')
                      }
                    />
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center space-x-4">
                      <Button 
                        onClick={() => handleSaveConfig('ALLOW_REGISTRATION', 'BOOLEAN')}
                        disabled={saving}
                        className="flex items-center"
                      >
                        {saving ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            保存中...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            保存配置
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={fetchConfigs}
                        disabled={saving}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        刷新
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 配置状态提示 */}
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">当前配置状态：</div>
                    <div className="text-sm">
                      • 开放注册: <span className={`font-medium ${configValues['ALLOW_REGISTRATION'] === 'true' ? 'text-green-600' : 'text-red-600'}`}>
                        {configValues['ALLOW_REGISTRATION'] === 'true' ? '开启' : '关闭'}
                      </span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* 未来扩展区域 */}
              <Card>
                <CardHeader>
                  <CardTitle>更多配置</CardTitle>
                  <CardDescription>
                    更多系统配置项将在后续版本中添加
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>敬请期待更多配置选项...</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}