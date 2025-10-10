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
import { useToast } from '@/hooks/use-toast'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Header } from '@/components/layout/header'
import { Plus, Search, Edit, Trash2, Key, UserCheck, UserX, Settings, Database, Trash } from 'lucide-react'
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

  // 创建用户
  const handleCreateUser = async () => {
    try {
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
    }
  }

  // 更新用户状态
  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
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
    }
  }

  // 重置密码
  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return
    
    try {
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
    }
  }

  // 删除用户
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除该用户吗？此操作不可恢复。')) return
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
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

  // 组件挂载时获取清理统计
  useEffect(() => {
    fetchCleanupStats()
  }, [])

  return (
    <AuthGuard requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header title="管理后台" />
        
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
                <p className="mt-1 text-sm text-gray-600">
                  管理系统用户，包括创建、编辑、删除用户等操作
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/admin/system-config">
                  <Button variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    系统配置
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* 数据库清理功能 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                <span>数据库清理</span>
              </CardTitle>
              <CardDescription>
                自动清理两天前的records和replies数据，释放存储空间
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">当前数据统计</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>总records记录:</span>
                      <span className="font-medium">{cleanupStats.totalRecords}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>总replies记录:</span>
                      <span className="font-medium">{cleanupStats.totalReplies}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>待清理records:</span>
                      <span className="font-medium">{cleanupStats.recordsToClean}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>待清理replies:</span>
                      <span className="font-medium">{cleanupStats.repliesToClean}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-xs">
                      <span>清理截止时间:</span>
                      <span>{cleanupStats.cutoffTime ? new Date(cleanupStats.cutoffTime).toLocaleString('zh-CN') : '计算中...'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-center items-center space-y-4">
                  <Dialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        disabled={cleanupStats.recordsToClean === 0 && cleanupStats.repliesToClean === 0}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        执行清理
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>确认数据库清理</DialogTitle>
                        <DialogDescription>
                          此操作将永久删除两天前的数据，不可恢复。请确认您要清理以下数据：
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 py-4">
                        <div className="flex justify-between">
                          <span>待清理records记录:</span>
                          <span className="font-medium text-red-600">{cleanupStats.recordsToClean}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>待清理replies记录:</span>
                          <span className="font-medium text-red-600">{cleanupStats.repliesToClean}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          清理截止时间: {cleanupStats.cutoffTime ? new Date(cleanupStats.cutoffTime).toLocaleString('zh-CN') : ''}
                        </div>
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
                  <Button variant="outline" onClick={fetchCleanupStats}>
                    刷新统计
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

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
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>创建新用户</DialogTitle>
                      <DialogDescription>
                        填写用户信息，初始密码为手机号后6位
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="username">用户名</Label>
                        <Input
                          id="username"
                          value={createUserForm.username}
                          onChange={(e) => setCreateUserForm({ ...createUserForm, username: e.target.value })}
                          placeholder="请输入用户名"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">手机号</Label>
                        <Input
                          id="phone"
                          value={createUserForm.phone}
                          onChange={(e) => setCreateUserForm({ ...createUserForm, phone: e.target.value })}
                          placeholder="请输入手机号"
                        />
                      </div>
                      <div>
                        <Label htmlFor="name">姓名</Label>
                        <Input
                          id="name"
                          value={createUserForm.name}
                          onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                          placeholder="请输入姓名"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">邮箱（可选）</Label>
                        <Input
                          id="email"
                          value={createUserForm.email || ''}
                          onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                          placeholder="请输入邮箱"
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">角色</Label>
                        <Select value={createUserForm.role} onValueChange={(value: 'USER' | 'ADMIN') => setCreateUserForm({ ...createUserForm, role: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">普通用户</SelectItem>
                            <SelectItem value="ADMIN">管理员</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={handleCreateUser}>创建</Button>
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
                            <Badge variant={user.isActive ? 'default' : 'destructive'}>
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
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>重置密码</DialogTitle>
                                    <DialogDescription>
                                      为用户 {user.name} 重置密码
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div>
                                    <Label htmlFor="newPassword">新密码</Label>
                                    <Input
                                      id="newPassword"
                                      type="password"
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                      placeholder="请输入新密码（至少6位）"
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
                                      取消
                                    </Button>
                                    <Button onClick={handleResetPassword} disabled={!newPassword || newPassword.length < 6}>
                                      重置
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
                                >
                                  {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                </Button>
                              )}
                              
                              {/* 删除按钮 - admin账号不能删除 */}
                              {user.username !== 'admin' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
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
      </div>
    </AuthGuard>
  )
}