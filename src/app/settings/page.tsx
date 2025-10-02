// src/app/setting/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function SettingPage() {
  const { user, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const router = useRouter()
  const { toast } = useToast()

  if (!user) return null

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast({
        title: "密码不匹配",
        description: "两次输入的密码不一致",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ 
          currentPassword,
          newPassword,
          confirmPassword
        })
      })

      if (response.ok) {
        toast({
          title: "密码修改成功",
          description: "请使用新密码登录"
        })
        logout()
      } else {
        const data = await response.json()
        toast({
          title: "修改失败",
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "网络错误",
        description: "请稍后重试",
        variant: "destructive"
      })
    }
  }

  return (
    <AuthGuard>
      <Header title="系统设置" />
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">账户设置</h1>
          <Button variant="outline" onClick={() => router.push('/')}>
            返回主页
          </Button>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">修改密码</h2>
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">当前密码</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="请输入当前密码"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少6位）"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">保存修改</Button>
            </div>
          </form>
        </div>
        
        <div>
          <Button variant="destructive" onClick={logout}>
            退出登录
          </Button>
        </div>
      </div>
    </AuthGuard>
  )
}