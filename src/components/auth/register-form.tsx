'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/use-auth'
import { Loader2, Phone, User, Mail, Lock } from 'lucide-react'

const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(20, '用户名最多20个字符'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码'),
  name: z.string().min(2, '姓名至少2个字符'),
  email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')),
  password: z.string().min(6, '密码至少6个字符'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword']
})

type RegisterFormData = z.infer<typeof registerSchema> & {
  username: string
  confirmPassword: string
}

interface RegisterFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { register: registerUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allowRegistration, setAllowRegistration] = useState(true)
  const [checkingConfig, setCheckingConfig] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  })

  // 检查是否允许注册
  useEffect(() => {
    const checkRegistrationConfig = async () => {
      try {
        const response = await fetch('/api/system-config/public?key=ALLOW_REGISTRATION')
        if (response.ok) {
          const config = await response.json()
          setAllowRegistration(config.value === 'true')
        }
      } catch (error) {
        console.error('检查注册配置失败:', error)
        // 默认允许注册
        setAllowRegistration(true)
      } finally {
        setCheckingConfig(false)
      }
    }

    checkRegistrationConfig()
  }, [])

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await registerUser({
        username: data.username,
        phone: data.phone,
        name: data.name,
        email: data.email || undefined,
        password: data.password,
        confirmPassword: data.confirmPassword
      })
      
      if (result.success) {
        onSuccess?.()
      } else {
        setError(result.error || '注册失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 如果正在检查配置，显示加载状态
  if (checkingConfig) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            检查系统配置中...
          </div>
        </CardContent>
      </Card>
    )
  }

  // 如果不允许注册，显示提示信息
  if (!allowRegistration) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>用户注册</CardTitle>
          <CardDescription>
            系统注册状态
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              系统暂未开放注册，请联系管理员获取账号。
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          {onSwitchToLogin && (
            <div className="w-full text-center text-sm">
              已有账号？
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={onSwitchToLogin}
              >
                立即登录
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>用户注册</CardTitle>
        <CardDescription>
          请填写以下信息完成注册
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                className="pl-10"
                {...register('username')}
              />
            </div>
            {errors.username && (
              <p className="text-sm text-red-500">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                placeholder="请输入手机号"
                className="pl-10"
                {...register('phone')}
              />
            </div>
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="name"
                type="text"
                placeholder="请输入姓名"
                className="pl-10"
                {...register('name')}
              />
            </div>
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">邮箱（可选）</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="请输入邮箱"
                className="pl-10"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="请输入密码（至少6位）"
                className="pl-10"
                {...register('password')}
              />
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                className="pl-10"
                {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                注册中...
              </>
            ) : (
              '注册'
            )}
          </Button>
          
          {onSwitchToLogin && (
            <div className="text-center text-sm">
              已有账号？
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={onSwitchToLogin}
              >
                立即登录
              </Button>
            </div>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}