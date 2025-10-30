'use client'

import { useState } from 'react'
import { useLoading } from '@/components/layout/loading-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProfileUpdated?: () => void
  onLoadingChange?: (loading: boolean) => void
}

export function EditProfileDialog({ open, onOpenChange, onProfileUpdated, onLoadingChange }: EditProfileDialogProps) {
  const { user, token } = useAuth()
  const { setLoading: setGlobalLoading } = useLoading()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      toast.error('请先登录')
      return
    }

    if (!formData.name.trim()) {
      toast.error('请输入姓名')
      return
    }

    if (!formData.phone.trim()) {
      toast.error('请输入手机号')
      return
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(formData.phone)) {
      toast.error('请输入正确的手机号格式')
      return
    }

    // 验证邮箱格式（如果提供）
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('请输入正确的邮箱格式')
      return
    }

    setLoading(true)
    onLoadingChange?.(true)

    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('个人资料更新成功')
        onOpenChange(false)
        // 添加延迟确保loading效果可见
        setGlobalLoading(true)
        onProfileUpdated?.() // 立即刷新页面
        // 不手动关闭loading，由新页面的usePageLoadComplete自动处理
      } else {
        toast.error(data.error || '更新失败')
      }
    } catch (error) {
      console.error('更新个人资料错误:', error)
      toast.error('网络错误，请稍后重试')
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>编辑个人资料</DialogTitle>
          <DialogDescription>
            修改您的个人信息，保存后立即生效。
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="请输入您的姓名"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="请输入手机号"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">邮箱（可选）</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="请输入邮箱地址"
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '保存中...' : '保存更改'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}