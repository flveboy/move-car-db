'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Header } from '@/components/layout/header'
import { Plus, Search, Edit, Trash2, Key, UserCheck, UserX, Settings, Database, Trash, Users, Wrench, Save, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'

interface User {
  id: string
  username: string
  phone: string
  name: string
  email?: string
  role: 'USER' | 'ADMIN'
  isActive: boolean
  createdAt: string
  lastLogin?: string
  _count: {
    vehicles: number
    codes: number
    records: number
  }
}

interface CreateUserData {
  username: string
  phone: string
  name: string
  email?: string
  role: 'USER' | 'ADMIN'
  isActive: boolean
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'system' | 'cleanup'>('users')
  
  // 用户管理相关状态
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  
  // 创建用户对话框
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createUserForm, setCreateUserForm] = useState<CreateUserData>({
    username: '',
    phone: '',
    name: '',
    email: '',
    role: 'USER',
    isActive: true
  })
  
  // 重置密码对话框
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  
  // 数据库清理功能
  const [cleanupStats, setCleanupStats] = useState({
    recordsToClean: 0,
    repliesToClean: 0,
    totalRecords: 0,
    totalReplies: 0,
    cutoffTime: ''
  })
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false)
  
  // 系统配置功能
  const [configs, setConfigs] = useState<any[]>([])
  const [configLoading, setConfigLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})
  
  const { toast } = useToast()
  const { user, token } = useAuth()

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter && roleFilter !== 'ALL' && { role: roleFilter })
      })
      
      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setTotalPages(data.pagination.totalPages)
        setTotalUsers(data.pagination.total)
      } else {
        toast({
          title: "获取用户列表失败",
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
    fetchUsers()
  }, [currentPage, searchTerm, roleFilter])

  // 创建用户相关状态
  const [isCreating, setIsCreating] = useState(false)

  // 创建用户
  const handleCreateUser = async () => {
    try {
      setIsCreating(true)
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(createUserForm)
      })
      
      if (response.ok) {
        const data = await response.json()
        toast({
          title: "用户创建成功",
          description: `初始密码: ${data.initialPassword}`
        })
        setIsCreateDialogOpen(false)
        setCreateUserForm({
          phone: '',
          username: '',
          name: '',
          email: '',
          role: 'USER',
          isActive: true
        })
        fetchUsers()
      } else {
        const error = await response.json()
        toast({
          title: "创建用户失败",
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
      setIsCreating(false)
    }
  }

  // 更新用户状态相关状态
  const [togglingUser, setTogglingUser] = useState<string | null>(null)

  // 更新用户状态
  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      setTogglingUser(userId)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ isActive })
      })
      
      if (response.ok) {
        toast({
          title: "用户状态更新成功",
          description: isActive ? "用户已启用" : "用户已禁用"
        })
        fetchUsers()
      } else {
        // 获取后端返回的错误信息
        const errorData = await response.json()
        toast({
          title: "更新失败",
          description: errorData.error || "请稍后重试",
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
      setTogglingUser(null)
    }
  }

  // 重置密码相关状态
  const [isResetting, setIsResetting] = useState(false)

  // 重置密码
  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return
    
    try {
      setIsResetting(true)
      const response = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ newPassword })
      })
      
      if (response.ok) {
        toast({
          title: "密码重置成功",
          description: `新密码: ${newPassword}`
        })
        setIsResetPasswordDialogOpen(false)
        setNewPassword('')
        setSelectedUser(null)
      } else {
        // 获取后端返回的错误信息
        const errorData = await response.json()
        toast({
          title: "密码重置失败",
          description: errorData.error || "请稍后重试",
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
      setIsResetting(false)
    }
  }

  // 编辑用户相关状态
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<User | null>(null)
  const [editUserForm, setEditUserForm] = useState<CreateUserData>({
    username: '',
    phone: '',
    name: '',
    email: '',
    role: 'USER',
    isActive: true
  })
  const [isEditing, setIsEditing] = useState(false)

  // 删除用户相关状态
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // 打开编辑对话框
  const openEditDialog = (user: User) => {
    setUserToEdit(user)
    setEditUserForm({
      username: user.username,
      phone: user.phone,
      name: user.name,
      email: user.email || '',
      role: user.role,
      isActive: user.isActive
    })
    setIsEditDialogOpen(true)
  }

  // 更新用户信息
  const handleEditUser = async () => {
    if (!userToEdit) return
    
    try {
      setIsEditing(true)
      const response = await fetch(`/api/admin/users/${userToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(editUserForm)
      })
      
      if (response.ok) {
        toast({
          title: "用户信息更新成功",
          description: "用户信息已成功更新"
        })
        setIsEditDialogOpen(false)
        setUserToEdit(null)
        fetchUsers()
      } else {
        const errorData = await response.json()
        toast({
          title: "更新失败",
          description: errorData.error || "请稍后重试",
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
      setIsEditing(false)
    }
  }

  // 打开删除确认对话框
  const openDeleteDialog = (user: User) => {
    setUserToDelete(user)
    setIsDeleteDialogOpen(true)
  }

  // 删除用户
  const handleDeleteUser = async () => {
    if (!userToDelete) return
    
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        toast({
          title: "用户删除成功",
          description: result.message || "用户及其相关数据已删除"
        })
        fetchUsers()
      } else {
        // 获取后端返回的错误信息
        const errorData = await response.json()
        toast({
          title: "删除失败",
          description: errorData.error || "请稍后重试",
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
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  // 获取数据库清理统计信息
  const fetchCleanupStats = async () => {
    try {
      const response = await fetch('/api/admin/cleanup', {
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setCleanupStats(data.data)
        }
      }
    } catch (error) {
      console.error('获取清理统计失败:', error)
    }
  }

  // 执行数据库清理
  const handleCleanupDatabase = async () => {
    if (!confirm('确定要清理数据库吗？此操作将删除两天前的records和replies数据，且不可恢复。')) return
    
    try {
      setIsCleaning(true)
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast({
            title: "数据库清理完成",
            description: `已删除 ${data.data.deletedRecords} 条records记录和 ${data.data.deletedReplies} 条replies记录`
          })
          setCleanupDialogOpen(false)
          fetchCleanupStats() // 刷新统计信息
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "清理失败",
          description: errorData.error || "请稍后重试",
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
      setIsCleaning(false)
    }
  }

  // 获取系统配置
  const fetchConfigs = async () => {
    try {
      setConfigLoading(true)
      const response = await fetch('/api/admin/system-config', {
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setConfigs(data.configs)
        
        // 初始化配置值
        const values: Record<string, string> = {}
        data.configs.forEach((config: any) => {
          values[config.key] = config.value
        })
        
        // 如果没有开放注册配置，添加默认值
        if (!data.configs.find((c: any) => c.key === 'ALLOW_REGISTRATION')) {
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
      setConfigLoading(false)
    }
  }

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
          'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`
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

  // 组件挂载时获取清理统计和系统配置
  useEffect(() => {
    fetchCleanupStats()
    fetchConfigs()
  }, [])

  return (
    <AuthGuard requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header title="管理后台" />
        
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* 标签页导航 */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">管理后台</h1>
                <p className="mt-1 text-sm text-gray-600">
                  系统管理和维护功能
                </p>
              </div>
            </div>
            
            {/* 标签页切换 */}
            <div className="mt-6 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'users'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="inline-block mr-2 h-4 w-4" />
                  用户管理
                </button>
                <button
                  onClick={() => setActiveTab('system')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'system'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Wrench className="inline-block mr-2 h-4 w-4" />
                  系统配置
                </button>
                <button
                  onClick={() => setActiveTab('cleanup')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'cleanup'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Database className="inline-block mr-2 h-4 w-4" />
                  数据库清理
                </button>
              </nav>
            </div>
          </div>

          {/* 编辑用户对话框 */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">编辑用户信息</DialogTitle>
                <DialogDescription className="text-base">
                  修改用户 {userToEdit?.name} 的基本信息
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-3">
                  <Label htmlFor="edit-name" className="text-sm font-medium">姓名</Label>
                  <Input
                    id="edit-name"
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    placeholder="请输入姓名"
                    className="h-10"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="edit-phone" className="text-sm font-medium">手机号</Label>
                  <Input
                    id="edit-phone"
                    value={editUserForm.phone}
                    onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                    placeholder="请输入手机号"
                    className="h-10"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="edit-email" className="text-sm font-medium">邮箱（可选）</Label>
                  <Input
                    id="edit-email"
                    value={editUserForm.email || ''}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    placeholder="请输入邮箱"
                    className="h-10"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="edit-role" className="text-sm font-medium">角色</Label>
                  <Select value={editUserForm.role} onValueChange={(value: 'USER' | 'ADMIN') => setEditUserForm({ ...editUserForm, role: value })}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">普通用户</SelectItem>
                      <SelectItem value="ADMIN">管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-active" className="text-sm font-medium">启用状态</Label>
                  <Switch
                    id="edit-active"
                    checked={editUserForm.isActive}
                    onCheckedChange={(checked) => setEditUserForm({ ...editUserForm, isActive: checked })}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              </div>
              <DialogFooter className="gap-4 sm:gap-3">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1 sm:flex-none">
                  取消
                </Button>
                <Button 
                  onClick={handleEditUser} 
                  disabled={isEditing}
                  className="flex-1 sm:flex-none"
                >
                  {isEditing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    '保存修改'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 删除确认对话框 */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">确认删除</DialogTitle>
                <DialogDescription className="text-base">
                  确定要删除用户 {userToDelete?.name} ({userToDelete?.username}) 吗？
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Alert variant="destructive">
                  <AlertDescription>
                    此操作不可恢复！将删除该用户及其所有相关数据（车辆、挪车码、记录等）。
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter className="gap-4 sm:gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="flex-1 sm:flex-none"
                >
                  取消
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="flex-1 sm:flex-none"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      删除中...
                    </>
                  ) : (
                    '确认删除'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 用户管理标签页内容 */}
          {activeTab === 'users' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">用户管理</h2>
                <p className="mt-1 text-sm text-gray-600">
                  管理系统用户，包括创建、编辑、删除用户等操作
                </p>
              </div>

          {/* 搜索和过滤 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>用户列表</span>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      创建用户
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl">创建新用户</DialogTitle>
                      <DialogDescription className="text-base">
                        填写用户信息，初始密码为手机号后6位
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-3">
                        <Label htmlFor="username" className="text-sm font-medium">用户名</Label>
                        <Input
                          id="username"
                          value={createUserForm.username}
                          onChange={(e) => setCreateUserForm({ ...createUserForm, username: e.target.value })}
                          placeholder="请输入用户名"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="phone" className="text-sm font-medium">手机号</Label>
                        <Input
                          id="phone"
                          value={createUserForm.phone}
                          onChange={(e) => setCreateUserForm({ ...createUserForm, phone: e.target.value })}
                          placeholder="请输入手机号"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="name" className="text-sm font-medium">姓名</Label>
                        <Input
                          id="name"
                          value={createUserForm.name}
                          onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                          placeholder="请输入姓名"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="email" className="text-sm font-medium">邮箱（可选）</Label>
                        <Input
                          id="email"
                          value={createUserForm.email || ''}
                          onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                          placeholder="请输入邮箱"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="role" className="text-sm font-medium">角色</Label>
                        <Select value={createUserForm.role} onValueChange={(value: 'USER' | 'ADMIN') => setCreateUserForm({ ...createUserForm, role: value })}>
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">普通用户</SelectItem>
                            <SelectItem value="ADMIN">管理员</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter className="gap-4 sm:gap-3">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1 sm:flex-none" disabled={isCreating}>
                        取消
                      </Button>
                      <Button onClick={handleCreateUser} className="flex-1 sm:flex-none" disabled={isCreating}>
                        {isCreating ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            创建中...
                          </>
                        ) : (
                          '创建用户'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="搜索用户（用户名、手机号、姓名、邮箱）"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="角色筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">全部角色</SelectItem>
                    <SelectItem value="USER">普通用户</SelectItem>
                    <SelectItem value="ADMIN">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 用户表格 */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户信息</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>统计</TableHead>
                      <TableHead>注册时间</TableHead>
                      <TableHead>最后登录</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          加载中...
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          暂无用户数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.username}</div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.phone}</div>
                              {user.email && (
                                <div className="text-sm text-gray-500">{user.email}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                              {user.role === 'ADMIN' ? '管理员' : '普通用户'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? 'default' : 'destructive'} className={user.isActive ? 'bg-green-500 hover:bg-green-600' : ''}>
                              {user.isActive ? '启用' : '禁用'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>车辆: {user._count?.vehicles || 0}</div>
                              <div>挪车码: {user._count?.codes || 0}</div>
                              <div>记录: {user._count?.records || 0}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(user.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                          </TableCell>
                          <TableCell>
                            {user.lastLogin ? 
                              format(new Date(user.lastLogin), 'yyyy-MM-dd HH:mm', { locale: zhCN }) : 
                              '从未登录'
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {/* 编辑按钮 */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              <Dialog open={isResetPasswordDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                                setIsResetPasswordDialogOpen(open)
                                if (!open) setSelectedUser(null)
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedUser(user)}
                                  >
                                    <Key className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle className="text-xl">重置密码</DialogTitle>
                                    <DialogDescription className="text-base">
                                      为用户 {user.name} 重置密码
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-3">
                                      <Label htmlFor="newPassword" className="text-sm font-medium">新密码</Label>
                                      <Input
                                        id="newPassword"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="请输入新密码（至少6位）"
                                        className="h-10"
                                      />
                                      <p className="text-xs text-gray-500">密码长度至少6位</p>
                                    </div>
                                  </div>
                                  <DialogFooter className="gap-4 sm:gap-3">
                                    <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)} className="flex-1 sm:flex-none">
                                      取消
                                    </Button>
                                    <Button 
                                      onClick={handleResetPassword} 
                                      disabled={!newPassword || newPassword.length < 6 || isResetting}
                                      className="flex-1 sm:flex-none"
                                    >
                                      {isResetting ? (
                                        <>
                                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                          重置中...
                                        </>
                                      ) : (
                                        '重置密码'
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              
                              {/* 禁用/启用按钮 - admin账号不能禁用 */}
                              {user.username !== 'admin' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleUserStatus(user.id, !user.isActive)}
                                  disabled={togglingUser === user.id}
                                >
                                  {togglingUser === user.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : user.isActive ? (
                                    <UserX className="h-4 w-4" />
                                  ) : (
                                    <UserCheck className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              
                              {/* 删除按钮 - admin账号不能删除 */}
                              {user.username !== 'admin' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDeleteDialog(user)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-700">
                    显示 {((currentPage - 1) * 10) + 1} - {Math.min(currentPage * 10, totalUsers)} 条，共 {totalUsers} 条
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      上一页
                    </Button>
                    <span className="text-sm">
                      第 {currentPage} 页，共 {totalPages} 页
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
            </div>
          )}
          
          {/* 系统配置标签页内容 */}
          {activeTab === 'system' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">系统配置</h2>
                <p className="mt-1 text-sm text-gray-600">
                  管理系统的全局配置项和功能开关
                </p>
              </div>

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
                      className="data-[state=checked]:bg-green-500"
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
          
          {/* 数据库清理标签页内容 */}
          {activeTab === 'cleanup' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">数据库清理</h2>
                <p className="mt-1 text-sm text-gray-600">
                  清理过期数据，释放存储空间
                </p>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>数据库清理统计</CardTitle>
                  <CardDescription>
                    显示需要清理的数据统计信息
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium">Records 表</h3>
                      <p>总记录数: {cleanupStats.totalRecords}</p>
                      <p>待清理记录: {cleanupStats.recordsToClean}</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Replies 表</h3>
                      <p>总记录数: {cleanupStats.totalReplies}</p>
                      <p>待清理记录: {cleanupStats.repliesToClean}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">
                      清理时间点: {cleanupStats.cutoffTime ? format(new Date(cleanupStats.cutoffTime), 'yyyy-MM-dd HH:mm:ss') : '计算中...'}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>执行清理</CardTitle>
                  <CardDescription>
                    清理两天前的数据记录
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <AlertDescription>
                      此操作将删除两天前的records和replies数据，删除后无法恢复，请谨慎操作。
                    </AlertDescription>
                  </Alert>
                  <div className="mt-4">
                    <Dialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash className="mr-2 h-4 w-4" />
                          执行数据库清理
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>确认数据库清理</DialogTitle>
                          <DialogDescription>
                            确定要清理数据库吗？此操作将删除两天前的数据，且不可恢复。
                          </DialogDescription>
                        </DialogHeader>
                        <div>
                          <p>将删除以下数据：</p>
                          <ul className="list-disc list-inside mt-2">
                            <li>Records 表: {cleanupStats.recordsToClean} 条记录</li>
                            <li>Replies 表: {cleanupStats.repliesToClean} 条记录</li>
                          </ul>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setCleanupDialogOpen(false)}>
                            取消
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={handleCleanupDatabase}
                            disabled={isCleaning}
                          >
                            {isCleaning ? '清理中...' : '确认清理'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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