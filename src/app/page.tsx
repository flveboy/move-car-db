'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Header } from '@/components/layout/header'
import { Car, QrCode, History, Plus, Trash2, Power, Download, Share2, Loader2, Edit, Users, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Driver {
  id: string
  name: string
  phone: string
  vehicleId: string
  createdAt: string
  dingtalkWebhook?: string
  dingtalkSign?: boolean
  dingtalkSecret?: string
  dingtalkKeyword?: string
  wechatWebhook?: string
}

interface Vehicle {
  id: string
  licensePlate: string
  brand?: string
  model?: string
  color?: string
    drivers: number
  // 钉钉通知配置
  dingtalkWebhook?: string
  dingtalkSign: boolean
  dingtalkKeyword?: string
  dingtalkSecret?: string
  // 企微通知配置
  wechatWebhook?: string
  createdAt: string
  _count: {
    codes: number
    drivers: number
  }
}

interface Code {
  id: string
  vehicleId: string
  code: string
  isActive: boolean
  createdAt: string
  expiredAt?: string
  driverId?: string
  driver?: {
    id: string
    name: string
  }
  vehicle: {
    licensePlate: string
    brand?: string
  }
  _count: {
    records: number
  }
}

interface Record {
  id: string
  codeId: string
  scanTime: string
  ipAddress?: string
  message?: string
  code: {
    code: string
    vehicle: {
      licensePlate: string
    }
  }
}

export default function Home() {
  const { user, token, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('vehicles')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [codes, setCodes] = useState<Code[]>([])
  const [records, setRecords] = useState<Record[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false)
  const [isEditDriverDialogOpen, setIsEditDriverDialogOpen] = useState(false)
  const [isAddDriverDialogOpen, setIsAddDriverDialogOpen] = useState(false)
  const [currentVehicleId, setCurrentVehicleId] = useState<string>('')
  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    dingtalkWebhook: '',
    dingtalkSign: false,
    dingtalkSecret: '',
    dingtalkKeyword: '',
    wechatWebhook: ''
  })
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 搜索状态
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredCodes, setFilteredCodes] = useState<Code[]>([])

  // 车辆添加表单状态
  const [vehicleForm, setVehicleForm] = useState({
    licensePlate: '',
    brand: '',
    model: '',
    color: '',
    // 钉钉通知配置
    dingtalkWebhook: '',
    dingtalkSign: false,
    dingtalkKeyword: '',
    dingtalkSecret: '',
    // 企微通知配置
    wechatWebhook: ''
  })

  // 车辆编辑表单状态
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  // 驾驶员管理状态

  


  // 编辑车辆表单状态
  const [editForm, setEditForm] = useState({
    licensePlate: '',
    brand: '',
    model: '',
    color: '',
    // 钉钉通知配置
    dingtalkWebhook: '',
    dingtalkSign: false,
    dingtalkKeyword: '',
    dingtalkSecret: '',
    // 企微通知配置
    wechatWebhook: ''
  })


  const [codeToDelete, setCodeToDelete] = useState<Code | null>(null)

  // 挪车码元素引用，用于滚动定位
  const codeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  
  // 当前需要高亮显示的挪车码ID
  const [highlightedCodeId, setHighlightedCodeId] = useState<string | null>(null)
  
  // 挪车码tab状态
  const [codesTab, setCodesTab] = useState('owner')

  // 通知测试状态
  const [dingtalkTestForm, setDingtalkTestForm] = useState({
    webhook: '',
    sign: false,
    keyword: '',
    secret: '',
    message: '这是一条挪车码通知测试消息'
  })

  const [wechatTestForm, setWechatTestForm] = useState({
    webhook: '',
    message: '这是一条挪车码通知测试消息',
    messageType: 'text'
  })

  // 保存通知测试配置到本地存储
  const saveNotificationConfig = () => {
    const config = {
      dingtalk: dingtalkTestForm,
      wechat: wechatTestForm
    }
    localStorage.setItem('notificationTestConfig', JSON.stringify(config))
  }

  // 从本地存储加载通知测试配置
  const loadNotificationConfig = () => {
    try {
      const savedConfig = localStorage.getItem('notificationTestConfig')
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        if (config.dingtalk) {
          setDingtalkTestForm(config.dingtalk)
        }
        if (config.wechat) {
          setWechatTestForm(config.wechat)
        }
      }
    } catch (error) {
      console.error('加载通知配置失败:', error)
    }
  }

  // 检查认证状态并重定向
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  // 组件挂载时加载通知配置
  useEffect(() => {
    loadNotificationConfig()
  }, [])

  // 加载用户数据
  useEffect(() => {
    if (user && token) {
      loadUserData()
    }
  }, [user, token])

  // 搜索挪车码
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCodes(codes)
    } else {
      const filtered = codes.filter(code => 
        code.vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredCodes(filtered)
    }
  }, [searchTerm, codes])

  // 处理挪车码高亮和滚动
  useEffect(() => {
    if (highlightedCodeId && activeTab === 'codes') {
      // 延迟一下确保DOM已经更新
      setTimeout(() => {
        const element = codeRefs.current[highlightedCodeId]
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
          
          // 添加高亮效果
          element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-75')
          
          // 3秒后移除高亮效果
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-75')
            setHighlightedCodeId(null)
          }, 3000)
        }
      }, 100)
    }
  }, [highlightedCodeId, activeTab])

  const loadUserData = async () => {
    try {
      setIsLoading(true)
      
      // 并行加载车辆、挪车码和记录
      const [vehiclesRes, codesRes, recordsRes] = await Promise.all([
        fetch('/api/vehicles', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/codes', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/records/owner/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json()
        setVehicles(vehiclesData.data || [])
      }

      if (codesRes.ok) {
        const codesData = await codesRes.json()
        setCodes(codesData.data || [])
        setFilteredCodes(codesData.data || [])
      }

      if (recordsRes.ok) {
        const recordsData = await recordsRes.json()
        setRecords(recordsData.data || [])
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(vehicleForm)
      })

      if (response.ok) {
        const data = await response.json()
        setVehicles([data.data, ...vehicles])
        setVehicleForm({ 
          licensePlate: '', 
          brand: '', 
          model: '', 
          color: '',
          // 钉钉通知配置
          dingtalkWebhook: '',
          dingtalkSign: false,
          dingtalkKeyword: '',
          dingtalkSecret: '',
          // 企微通知配置
          wechatWebhook: ''
        })
        setIsAddDialogOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || '添加车辆失败')
      }
    } catch (error) {
      console.error('添加车辆失败:', error)
      alert('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 打开编辑对话框
  const handleEditClick = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setEditForm({
      licensePlate: vehicle.licensePlate,
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      color: vehicle.color || '',
      // 钉钉通知配置
      dingtalkWebhook: vehicle.dingtalkWebhook || '',
      dingtalkSign: vehicle.dingtalkSign,
      dingtalkKeyword: vehicle.dingtalkKeyword || '',
      dingtalkSecret: vehicle.dingtalkSecret || '',
      // 企微通知配置
      wechatWebhook: vehicle.wechatWebhook || ''
    })
    setIsEditDialogOpen(true)
  }

  // 处理车辆编辑
  const handleEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingVehicle) return
    
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/vehicles/${editingVehicle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        const data = await response.json()
        setVehicles(vehicles.map(v => 
          v.id === editingVehicle.id ? data.data : v
        ))
        setIsEditDialogOpen(false)
        setEditingVehicle(null)
      } else {
        const error = await response.json()
        alert(error.error || '编辑车辆失败')
      }
    } catch (error) {
      console.error('编辑车辆失败:', error)
      alert('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理车辆删除
  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return
    
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/vehicles/${vehicleToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        // 从车辆列表中删除车辆
        setVehicles(vehicles.filter(v => v.id !== vehicleToDelete.id))
        
        // 从挪车码列表中删除该车辆的所有挪车码
        setCodes(codes.filter(c => c.vehicleId !== vehicleToDelete.id))
        setFilteredCodes(filteredCodes.filter(c => c.vehicleId !== vehicleToDelete.id))
        
        // 从扫描记录中删除该车辆所有挪车码的记录
        setRecords(records.filter(r => !codes.find(c => c.vehicleId === vehicleToDelete.id && c.id === r.codeId)))
        
        setVehicleToDelete(null)
      } else {
        const error = await response.json()
        alert(error.error || '删除车辆失败')
      }
    } catch (error) {
      console.error('删除车辆失败:', error)
      alert('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理挪车码删除
  const handleDeleteCode = async () => {
    if (!codeToDelete) return
    
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/codes/${codeToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setCodes(codes.filter(c => c.id !== codeToDelete.id))
        setFilteredCodes(filteredCodes.filter(c => c.id !== codeToDelete.id))
        setCodeToDelete(null)
      } else {
        const error = await response.json()
        alert(error.error || '删除挪车码失败')
      }
    } catch (error) {
      console.error('删除挪车码失败:', error)
      alert('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateOrNavigateToCode = async (vehicleId: string) => {
    setIsLoading(true)
    
    try {
      // 检查该车辆是否已经有挪车码
      const existingCodes = codes.filter(code => code.vehicleId === vehicleId && !code.driverId)
      
      if (existingCodes.length > 0) {
        // 如果已经有挪车码，切换到挪车码tab并定位到第一个挪车码
        const firstCode = existingCodes[0]
        setActiveTab('codes')
        setCodesTab('owner') // 切换到我的挪车码tab
        setHighlightedCodeId(firstCode.id)
        
        // 清空搜索框以确保挪车码可见
        setSearchTerm('')
      } else {
        // 如果没有挪车码，生成一个新的
        const response = await fetch('/api/codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ vehicleId })
        })

        if (response.ok) {
          const data = await response.json()
          const newCode = data.data
          
          // 更新挪车码列表
          setCodes([...codes, newCode])
          setFilteredCodes([...filteredCodes, newCode])
          
          // 切换到挪车码tab并定位到新生成的挪车码
          setActiveTab('codes')
          setCodesTab('owner') // 切换到我的挪车码tab
          setHighlightedCodeId(newCode.id)
          
          // 清空搜索框以确保挪车码可见
          setSearchTerm('')
        } else {
          const error = await response.json()
          alert(error.error || '生成挪车码失败')
        }
      }
    } catch (error) {
      console.error('处理挪车码失败:', error)
      alert('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleCode = async (codeId: string) => {
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/codes/${codeId}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setCodes(codes.map(code => 
          code.id === codeId ? { ...code, isActive: !code.isActive } : code
        ))
        setFilteredCodes(filteredCodes.map(code => 
          code.id === codeId ? { ...code, isActive: !code.isActive } : code
        ))
      } else {
        const error = await response.json()
        alert(error.error || '切换状态失败')
      }
    } catch (error) {
      console.error('切换状态失败:', error)
      alert('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadQRCode = async (code: string, vehicleLicensePlate: string) => {
    try {
      setIsLoading(true)
      
      // Generate QR code as data URL with full URL
      const canvas = document.createElement('canvas')
      const qrContent = `${window.location.origin}/scan/${code}`
      await QRCode.toCanvas(canvas, qrContent, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Create download link
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `挪车码_${vehicleLicensePlate}_${code}.png`
          
          // Trigger download
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          // Clean up
          URL.revokeObjectURL(url)
          
          alert('二维码已下载')
        }
      }, 'image/png')
      
    } catch (error) {
      console.error('生成二维码失败:', error)
      alert('生成二维码失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 钉钉通知测试函数
  const handleTestDingTalkNotification = async () => {
    if (!dingtalkTestForm.webhook.trim()) {
      alert('请输入钉钉webhook地址')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/notifications/test-dingtalk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          webhook: dingtalkTestForm.webhook,
          sign: dingtalkTestForm.sign,
          keyword: dingtalkTestForm.keyword,
          secret: dingtalkTestForm.secret,
          message: dingtalkTestForm.message
        })
      })

      const result = await response.json()
      
      if (result.success) {
        saveNotificationConfig() // 保存配置
        alert(result.message)
      } else {
        alert(`钉钉通知发送失败：${result.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('钉钉通知测试失败:', error)
      alert('钉钉通知测试失败，请检查网络连接和配置')
    } finally {
      setIsLoading(false)
    }
  }

  // 添加驾驶员函数
  const handleAddDriver = async () => {
    if (!driverForm.name.trim() || !driverForm.phone.trim()) {
      alert('请填写驾驶员姓名和手机号')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/vehicles/${currentVehicleId}/drivers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(driverForm)
      })

      const result = await response.json()
      
      if (result.success) {
        // 刷新驾驶员列表
        await fetchDrivers()
        // 清空表单
        setDriverForm({ 
          name: '', 
          phone: '', 
          dingtalkWebhook: '',
          dingtalkSign: false,
          dingtalkSecret: '',
          dingtalkKeyword: '',
          wechatWebhook: ''
        })
        toast({
          title: "驾驶员添加成功",
          description: `${driverForm.name} 已成功添加为代开驾驶员`,
        })
        // 关闭添加对话框，保持管理界面打开
        setIsAddDriverDialogOpen(false)
        setIsDriverDialogOpen(true)
      } else {
        alert(`添加驾驶员失败：${result.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('添加驾驶员失败:', error)
      alert('添加驾驶员失败，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  // 编辑驾驶员函数
  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver)
    setDriverForm({
      name: driver.name,
      phone: driver.phone,
      dingtalkWebhook: driver.dingtalkWebhook || '',
      dingtalkSign: driver.dingtalkSign || false,
      dingtalkSecret: driver.dingtalkSecret || '',
      dingtalkKeyword: driver.dingtalkKeyword || '',
      wechatWebhook: driver.wechatWebhook || ''
    })
    setIsEditDriverDialogOpen(true)
  }

  // 更新驾驶员函数
  const handleUpdateDriver = async () => {
    if (!editingDriver || !currentVehicleId) return
    
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/vehicles/${currentVehicleId}/drivers/${editingDriver.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(driverForm)
      })

      const result = await response.json()
      
      if (response.ok) {
        // 刷新驾驶员列表
        await fetchDrivers()
        setIsEditDriverDialogOpen(false)
        setEditingDriver(null)
        setDriverForm({ 
          name: '', 
          phone: '', 
          dingtalkWebhook: '',
          dingtalkSign: false,
          dingtalkSecret: '',
          dingtalkKeyword: '',
          wechatWebhook: ''
        })
        toast({
          title: "更新成功",
          description: `${driverForm.name} 的信息已更新`,
        })
      } else {
        toast({
          title: "更新失败",
          description: result.error || '未知错误',
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('更新驾驶员信息失败:', error)
      toast({
        title: "更新失败",
        description: '更新驾驶员信息失败，请检查网络连接',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 生成驾驶员挪车码函数
  const handleGenerateDriverCode = async (driver: Driver) => {
    setIsLoading(true)
    
    try {
      // 首先检查驾驶员是否已有挪车码
      const checkResponse = await fetch(`/api/codes?driverId=${driver.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (checkResponse.ok) {
        const checkResult = await checkResponse.json()
        const existingCode = checkResult.data?.find((code: any) => code.driverId === driver.id)
        
        if (existingCode) {
          // 如果已有挪车码，跳转到挪车码管理页面并高亮对应记录
          setActiveTab('codes')
          setCodesTab('driver')
          setHighlightedCodeId(existingCode.id)
          setIsDriverDialogOpen(false)
          setSearchTerm('')
          return
        }
      }

      // 如果没有挪车码，则生成新的挪车码
      const response = await fetch('/api/codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicleId: currentVehicleId,
          driverId: driver.id
        })
      })

      const result = await response.json()
      
      if (result.success) {
        // 刷新挪车码列表
        await fetchCodes()
        setActiveTab('codes')
        setCodesTab('driver')
        setHighlightedCodeId(result.data.id)
        setIsDriverDialogOpen(false)
        setSearchTerm('')
        toast({
          title: "挪车码生成成功",
          description: `已为驾驶员 ${driver.name} 生成新的挪车码`,
        })
      } else {
        toast({
          title: "生成挪车码失败",
          description: result.error || '未知错误',
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('生成挪车码失败:', error)
      toast({
        title: "生成挪车码失败",
        description: '请检查网络连接',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 切换驾驶员状态函数
  const handleToggleDriver = async (driverId: string, isActive: boolean) => {
    if (!currentVehicleId) return
    
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/vehicles/${currentVehicleId}/drivers/${driverId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive })
      })

      const result = await response.json()
      
      if (result.success) {
        // 刷新驾驶员列表
        await fetchDrivers()
        toast({
          title: `驾驶员已${isActive ? '启用' : '停用'}`,
          description: `${editingDriver?.name || '驾驶员'} 已${isActive ? '启用' : '停用'}`,
        })
      } else {
        alert(`切换驾驶员状态失败：${result.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('切换驾驶员状态失败:', error)
      alert('切换驾驶员状态失败，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  // 删除驾驶员函数
  const handleDeleteDriver = async (driverId: string) => {
    setIsLoading(true)
    
    try {
      // 获取并删除该驾驶员的所有挪车码
      const codesResponse = await fetch(`/api/codes?driverId=${driverId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (codesResponse.ok) {
        const codesData = await codesResponse.json()
        // 只删除该驾驶员的挪车码
        for (const code of codesData.data) {
          if (code.driverId === driverId) {
            const deleteResponse = await fetch(`/api/codes/${code.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            if (!deleteResponse.ok) {
              throw new Error('删除挪车码失败')
            }
          }
        }
      }

      // 然后删除驾驶员
      const response = await fetch(`/api/vehicles/${currentVehicleId}/drivers/${driverId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('删除驾驶员失败')
      }

      // 刷新驾驶员和挪车码列表
      await fetchDrivers()
      await fetchCodes()
      toast({
        title: "删除成功",
        description: `驾驶员 ${editingDriver?.name || ''} 及其挪车码已删除`,
      })
    } catch (error) {
      console.error('删除驾驶员失败:', error)
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : '未知错误',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 获取挪车码列表函数
  const fetchCodes = async () => {
    try {
      const response = await fetch('/api/codes?includeDriver=true&includeVehicle=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setCodes(result.data || [])
      }
    } catch (error) {
      console.error('获取挪车码列表失败:', error)
    }
  }

  // 获取驾驶员列表函数
  const fetchDrivers = async () => {
    if (!currentVehicleId) return
    
    try {
      const response = await fetch(`/api/vehicles/${currentVehicleId}/drivers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setDrivers(result.data || [])
      }
    } catch (error) {
      console.error('获取驾驶员列表失败:', error)
    }
  }

  // 监听对话框打开状态变化，自动获取驾驶员数据
  useEffect(() => {
    if (isDriverDialogOpen && currentVehicleId) {
      fetchDrivers()
    }
  }, [isDriverDialogOpen, currentVehicleId])

  // 企微通知测试函数
  const handleTestWechatNotification = async () => {
    if (!wechatTestForm.webhook.trim()) {
      alert('请输入企业微信webhook地址')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/notifications/test-wechat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          webhook: wechatTestForm.webhook,
          message: wechatTestForm.message,
          messageType: wechatTestForm.messageType
        })
      })

      const result = await response.json()
      
      if (result.success) {
        saveNotificationConfig() // 保存配置
        alert(result.message)
      } else {
        alert(`企业微信通知发送失败：${result.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('企业微信通知测试失败:', error)
      alert('企业微信通知测试失败，请检查网络连接和配置')
    } finally {
      setIsLoading(false)
    }
  }



  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return null // 会自动重定向到登录页面
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />
      
      <div className="max-w-7xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-14 bg-white/80 backdrop-blur-sm shadow-lg rounded-xl p-1">
            <TabsTrigger 
              value="vehicles" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg transition-all duration-300"
            >
              <Car className="h-4 w-4" />
              车辆管理
            </TabsTrigger>
            <TabsTrigger 
              value="codes" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg transition-all duration-300"
            >
              <QrCode className="h-4 w-4" />
              挪车码
            </TabsTrigger>
            <TabsTrigger 
              value="records" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg transition-all duration-300"
            >
              <History className="h-4 w-4" />
              查看记录
            </TabsTrigger>
            <TabsTrigger 
              value="notification-test" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg transition-all duration-300"
            >
              <Download className="h-4 w-4" />
              通知测试
            </TabsTrigger>
          </TabsList>

          <div className="mt-8">
            <AnimatePresence mode="wait">
              {activeTab === 'vehicles' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                            <Car className="h-5 w-5" />
                            我的车辆
                          </CardTitle>
                          <CardDescription className="text-gray-600">
                            管理您的车辆信息
                          </CardDescription>
                        </div>
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
                              <Plus className="h-4 w-4 mr-2" />
                              添加车辆
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                添加车辆
                              </DialogTitle>
                              <DialogDescription>
                                添加您的车辆信息
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddVehicle} className="space-y-4">
                              <Tabs defaultValue="basic" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                  <TabsTrigger value="basic">基本信息</TabsTrigger>
                                  <TabsTrigger value="notification">通知配置</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="basic" className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="licensePlate" className="text-sm font-medium text-gray-700">
                                      车牌号 <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      id="licensePlate"
                                      placeholder="请输入车牌号"
                                      value={vehicleForm.licensePlate}
                                      onChange={(e) => setVehicleForm({...vehicleForm, licensePlate: e.target.value})}
                                      required
                                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="brand" className="text-sm font-medium text-gray-700">
                                      品牌
                                    </Label>
                                    <Input
                                      id="brand"
                                      placeholder="请输入品牌"
                                      value={vehicleForm.brand}
                                      onChange={(e) => setVehicleForm({...vehicleForm, brand: e.target.value})}
                                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="model" className="text-sm font-medium text-gray-700">
                                      型号
                                    </Label>
                                    <Input
                                      id="model"
                                      placeholder="请输入型号"
                                      value={vehicleForm.model}
                                      onChange={(e) => setVehicleForm({...vehicleForm, model: e.target.value})}
                                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="color" className="text-sm font-medium text-gray-700">
                                      颜色
                                    </Label>
                                    <Input
                                      id="color"
                                      placeholder="请输入颜色"
                                      value={vehicleForm.color}
                                      onChange={(e) => setVehicleForm({...vehicleForm, color: e.target.value})}
                                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                    />
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="notification" className="space-y-4">
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 mb-3">钉钉通知配置</h4>
                                      <div className="space-y-3">
                                        <div className="space-y-2">
                                          <Label htmlFor="dingtalkWebhook" className="text-sm font-medium text-gray-700">
                                            Webhook 地址
                                          </Label>
                                          <Input
                                            id="dingtalkWebhook"
                                            placeholder="请输入钉钉机器人webhook地址"
                                            value={vehicleForm.dingtalkWebhook}
                                            onChange={(e) => setVehicleForm({...vehicleForm, dingtalkWebhook: e.target.value})}
                                            className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                          />
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Switch
                                            id="dingtalkSign"
                                            checked={vehicleForm.dingtalkSign}
                                            onCheckedChange={(checked) => setVehicleForm({
                                              ...vehicleForm, 
                                              dingtalkSign: checked,
                                              // 如果关闭加签，清空secret字段
                                              dingtalkSecret: checked ? vehicleForm.dingtalkSecret : ''
                                            })}
                                          />
                                          <Label htmlFor="dingtalkSign" className="text-sm font-medium text-gray-700">
                                            启用加签
                                          </Label>
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="dingtalkKeyword" className="text-sm font-medium text-gray-700">
                                            关键词
                                          </Label>
                                          <Input
                                            id="dingtalkKeyword"
                                            placeholder="请输入关键词（如果使用加签方式）"
                                            value={vehicleForm.dingtalkKeyword}
                                            onChange={(e) => setVehicleForm({...vehicleForm, dingtalkKeyword: e.target.value})}
                                            className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                          />
                                        </div>
                                        {vehicleForm.dingtalkSign && (
                                          <div className="space-y-2">
                                            <Label htmlFor="dingtalkSecret" className="text-sm font-medium text-gray-700">
                                              Secret
                                            </Label>
                                            <Input
                                              id="dingtalkSecret"
                                              placeholder="请输入加签密钥"
                                              value={vehicleForm.dingtalkSecret}
                                              onChange={(e) => setVehicleForm({...vehicleForm, dingtalkSecret: e.target.value})}
                                              className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 mb-3">企微通知配置</h4>
                                      <div className="space-y-3">
                                        <div className="space-y-2">
                                          <Label htmlFor="wechatWebhook" className="text-sm font-medium text-gray-700">
                                            Webhook 地址
                                          </Label>
                                          <Input
                                            id="wechatWebhook"
                                            placeholder="请输入企业微信机器人webhook地址"
                                            value={vehicleForm.wechatWebhook}
                                            onChange={(e) => setVehicleForm({...vehicleForm, wechatWebhook: e.target.value})}
                                            className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </TabsContent>
                              </Tabs>
                              
                              <Button 
                                type="submit" 
                                className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <div className="flex items-center justify-center">
                                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                    添加中...
                                  </div>
                                ) : (
                                  '添加车辆'
                                )}
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                编辑车辆
                              </DialogTitle>
                              <DialogDescription>
                                编辑您的车辆信息
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleEditVehicle} className="space-y-4">
                              <Tabs defaultValue="basic" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                  <TabsTrigger value="basic">基本信息</TabsTrigger>
                                  <TabsTrigger value="notification">通知配置</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="basic" className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="editLicensePlate" className="text-sm font-medium text-gray-700">
                                      车牌号 <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      id="editLicensePlate"
                                      placeholder="请输入车牌号"
                                      value={editForm.licensePlate}
                                      onChange={(e) => setEditForm({...editForm, licensePlate: e.target.value})}
                                      required
                                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="editBrand" className="text-sm font-medium text-gray-700">
                                      品牌
                                    </Label>
                                    <Input
                                      id="editBrand"
                                      placeholder="请输入品牌"
                                      value={editForm.brand}
                                      onChange={(e) => setEditForm({...editForm, brand: e.target.value})}
                                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="editModel" className="text-sm font-medium text-gray-700">
                                      型号
                                    </Label>
                                    <Input
                                      id="editModel"
                                      placeholder="请输入型号"
                                      value={editForm.model}
                                      onChange={(e) => setEditForm({...editForm, model: e.target.value})}
                                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="editColor" className="text-sm font-medium text-gray-700">
                                      颜色
                                    </Label>
                                    <Input
                                      id="editColor"
                                      placeholder="请输入颜色"
                                      value={editForm.color}
                                      onChange={(e) => setEditForm({...editForm, color: e.target.value})}
                                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                    />
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="notification" className="space-y-4">
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 mb-3">钉钉通知配置</h4>
                                      <div className="space-y-3">
                                        <div className="space-y-2">
                                          <Label htmlFor="editDingtalkWebhook" className="text-sm font-medium text-gray-700">
                                            Webhook 地址
                                          </Label>
                                          <Input
                                            id="editDingtalkWebhook"
                                            placeholder="请输入钉钉机器人webhook地址"
                                            value={editForm.dingtalkWebhook}
                                            onChange={(e) => setEditForm({...editForm, dingtalkWebhook: e.target.value})}
                                            className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                          />
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Switch
                                            id="editDingtalkSign"
                                            checked={editForm.dingtalkSign}
                                            onCheckedChange={(checked) => setEditForm({
                                              ...editForm, 
                                              dingtalkSign: checked,
                                              // 如果关闭加签，清空secret字段
                                              dingtalkSecret: checked ? editForm.dingtalkSecret : ''
                                            })}
                                          />
                                          <Label htmlFor="editDingtalkSign" className="text-sm font-medium text-gray-700">
                                            启用加签
                                          </Label>
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="editDingtalkKeyword" className="text-sm font-medium text-gray-700">
                                            关键词
                                          </Label>
                                          <Input
                                            id="editDingtalkKeyword"
                                            placeholder="请输入关键词（如果使用加签方式）"
                                            value={editForm.dingtalkKeyword}
                                            onChange={(e) => setEditForm({...editForm, dingtalkKeyword: e.target.value})}
                                            className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                          />
                                        </div>
                                        {editForm.dingtalkSign && (
                                          <div className="space-y-2">
                                            <Label htmlFor="editDingtalkSecret" className="text-sm font-medium text-gray-700">
                                              Secret
                                            </Label>
                                            <Input
                                              id="editDingtalkSecret"
                                              placeholder="请输入加签密钥"
                                              value={editForm.dingtalkSecret}
                                              onChange={(e) => setEditForm({...editForm, dingtalkSecret: e.target.value})}
                                              className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 mb-3">企微通知配置</h4>
                                      <div className="space-y-3">
                                        <div className="space-y-2">
                                          <Label htmlFor="editWechatWebhook" className="text-sm font-medium text-gray-700">
                                            Webhook 地址
                                          </Label>
                                          <Input
                                            id="editWechatWebhook"
                                            placeholder="请输入企业微信机器人webhook地址"
                                            value={editForm.wechatWebhook}
                                            onChange={(e) => setEditForm({...editForm, wechatWebhook: e.target.value})}
                                            className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </TabsContent>
                              </Tabs>
                              
                              <Button 
                                type="submit" 
                                className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <div className="flex items-center justify-center">
                                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                    保存中...
                                  </div>
                                ) : (
                                  '保存修改'
                                )}
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {vehicles.length === 0 ? (
                        <div className="text-center py-8">
                          <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">暂无车辆，请先添加车辆</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {vehicles.map((vehicle) => (
                            <div key={vehicle.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div>
                                <div className="font-medium text-gray-900">{vehicle.licensePlate}</div>
                                <div className="text-sm text-gray-500">
                                  {vehicle.brand} {vehicle.model} {vehicle.color}
                                </div>
                                <div className="text-xs text-gray-400">
                                  添加时间: {new Date(vehicle.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditClick(vehicle)}
                                  disabled={isLoading}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { 
                                    setCurrentVehicleId(vehicle.id); 
                                    setIsDriverDialogOpen(true);
                                  }}
                                  disabled={isLoading}
                                  title="管理代开驾驶员"
                                >
                                  <Users className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={isLoading}
                                      onClick={() => setVehicleToDelete(vehicle)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>确认删除车辆</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        您确定要删除车牌号为 "{vehicleToDelete?.licensePlate}" 的车辆吗？
                                      </AlertDialogDescription>
                                      {vehicleToDelete && (vehicleToDelete._count?.codes || 0) > 0 && (
                                        <div className="mt-2 text-orange-600 text-sm">
                                          注意：该车辆下还有 {(vehicleToDelete._count?.codes || 0)} 个挪车码，删除车辆时会同时删除这些挪车码及其所有扫描记录。
                                        </div>
                                      )}
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>取消</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={handleDeleteVehicle}
                                        className="bg-red-600 hover:bg-red-700"
                                        disabled={isLoading}
                                      >
                                        {isLoading ? (
                                          <div className="flex items-center justify-center">
                                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                            删除中...
                                          </div>
                                        ) : (
                                          '删除'
                                        )}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                <Button
                                  size="sm"
                                  onClick={() => handleGenerateOrNavigateToCode(vehicle.id)}
                                  disabled={isLoading}
                                >
                                  <QrCode className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'codes' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                            <QrCode className="h-5 w-5" />
                            挪车码管理
                          </CardTitle>
                          <CardDescription className="text-gray-600">
                            管理您的挪车码，支持车主挪车码和代开驾驶员挪车码分类管理
                          </CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64">
                          <Input
                            placeholder="搜索车牌号或挪车码..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-10 pl-10"
                          />
                          <svg
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs value={codesTab} onValueChange={setCodesTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                          <TabsTrigger value="owner">我的挪车码</TabsTrigger>
                          <TabsTrigger value="driver">代开驾驶员挪车码</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="owner" className="space-y-4">
                          {filteredCodes.filter(code => !code.driverId).length === 0 ? (
                            <div className="text-center py-8">
                              <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500">
                                {searchTerm ? '没有找到匹配的车主挪车码' : '暂无车主挪车码，请先为车辆生成挪车码'}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {filteredCodes.filter(code => !code.driverId).map((code) => (
                                <div 
                                  key={code.id} 
                                  ref={(el) => { codeRefs.current[code.id] = el }}
                                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg transition-all duration-300"
                                >
                                  <div>
                                    <div className="font-medium text-gray-900">{code.code}</div>
                                    <div className="text-sm text-gray-500">
                                      {code.vehicle.licensePlate} {code.vehicle.brand}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      创建时间: {new Date(code.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      扫描次数: {code._count?.records || 0}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={code.isActive}
                                        onCheckedChange={() => handleToggleCode(code.id)}
                                        disabled={isLoading}
                                        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                                      />
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDownloadQRCode(code.code, code.vehicle.licensePlate)}
                                      disabled={isLoading}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          disabled={isLoading}
                                          onClick={() => setCodeToDelete(code)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>确认删除挪车码</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            您确定要删除挪车码 "{codeToDelete?.code}" 吗？
                                            {codeToDelete && codeToDelete._count?.records && codeToDelete._count.records > 0 && (
                                              <div className="mt-2 text-red-600">
                                                注意：该挪车码还有 {codeToDelete._count.records} 条扫描记录，删除后无法恢复。
                                              </div>
                                            )}
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>取消</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={handleDeleteCode}
                                            className="bg-red-600 hover:bg-red-700"
                                            disabled={isLoading}
                                          >
                                            {isLoading ? (
                                              <div className="flex items-center justify-center">
                                                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                                删除中...
                                              </div>
                                            ) : (
                                              '删除'
                                            )}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="driver" className="space-y-4">
                          {filteredCodes.filter(code => code.driverId).length === 0 ? (
                            <div className="text-center py-8">
                              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500">
                                {searchTerm ? '没有找到匹配的代开驾驶员挪车码' : '暂无代开驾驶员挪车码，请先为代开驾驶员生成挪车码'}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {filteredCodes.filter(code => code.driverId).map((code) => (
                                <div 
                                  key={code.id} 
                                  ref={(el) => { codeRefs.current[code.id] = el }}
                                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg transition-all duration-300"
                                >
                                  <div>
                                    <div className="font-medium text-gray-900">{code.code}</div>
                                    <div className="text-sm text-gray-500">
                                      {code.vehicle.licensePlate} {code.vehicle.brand}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      驾驶员: {code.driver?.name || '未知驾驶员'}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      创建时间: {new Date(code.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      扫描次数: {code._count?.records || 0}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={code.isActive}
                                        onCheckedChange={() => handleToggleCode(code.id)}
                                        disabled={isLoading}
                                        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                                      />
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDownloadQRCode(code.code, code.vehicle.licensePlate)}
                                      disabled={isLoading}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          disabled={isLoading}
                                          onClick={() => setCodeToDelete(code)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>确认删除挪车码</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            您确定要删除挪车码 "{codeToDelete?.code}" 吗？
                                            {codeToDelete && codeToDelete._count?.records && codeToDelete._count.records > 0 && (
                                              <div className="mt-2 text-red-600">
                                                注意：该挪车码还有 {codeToDelete._count.records} 条扫描记录，删除后无法恢复。
                                              </div>
                                            )}
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>取消</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={handleDeleteCode}
                                            className="bg-red-600 hover:bg-red-700"
                                            disabled={isLoading}
                                          >
                                            {isLoading ? (
                                              <div className="flex items-center justify-center">
                                                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                                删除中...
                                              </div>
                                            ) : (
                                              '删除'
                                            )}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'records' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
                    <CardHeader>
                      <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                        <History className="h-5 w-5" />
                        扫描记录
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        查看您的挪车码被扫描的记录
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {records.length === 0 ? (
                        <div className="text-center py-8">
                          <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">暂无扫描记录</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {records.map((record) => (
                            <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div>
                                <div className="font-medium text-gray-900">{record.code.code}</div>
                                <div className="text-sm text-gray-500">
                                  车辆: {record.code.vehicle.licensePlate}
                                </div>
                                <div className="text-xs text-gray-400">
                                  扫描时间: {new Date(record.scanTime).toLocaleString()}
                                </div>
                                {record.ipAddress && (
                                  <div className="text-xs text-gray-400">
                                    IP地址: {record.ipAddress}
                                  </div>
                                )}
                                {record.message && (
                                  <div className="text-sm text-gray-600 mt-1">
                                    留言: {record.message}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'notification-test' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
                    <CardHeader>
                      <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        通知测试
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        测试钉钉和企业微信通知功能
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 钉钉通知测试 */}
                        <Card className="bg-gray-50 border border-gray-200">
                          <CardHeader>
                            <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-bold">钉</span>
                              </div>
                              钉钉通知测试
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                              测试钉钉机器人通知功能
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="dingtalkTestWebhook" className="text-sm font-medium text-gray-700">
                                Webhook 地址
                              </Label>
                              <Input
                                id="dingtalkTestWebhook"
                                placeholder="请输入钉钉机器人webhook地址"
                                value={dingtalkTestForm.webhook}
                                onChange={(e) => setDingtalkTestForm({...dingtalkTestForm, webhook: e.target.value})}
                                className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="dingtalkTestSign"
                                checked={dingtalkTestForm.sign}
                                onCheckedChange={(checked) => {
                                  setDingtalkTestForm({
                                    ...dingtalkTestForm, 
                                    sign: checked,
                                    // 如果关闭加签，清空secret字段
                                    secret: checked ? dingtalkTestForm.secret : ''
                                  })
                                }}
                              />
                              <Label htmlFor="dingtalkTestSign" className="text-sm font-medium text-gray-700">
                                启用加签
                              </Label>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="dingtalkTestKeyword" className="text-sm font-medium text-gray-700">
                                关键词
                              </Label>
                              <Input
                                id="dingtalkTestKeyword"
                                placeholder="请输入关键词（如果使用加签方式）"
                                value={dingtalkTestForm.keyword}
                                onChange={(e) => setDingtalkTestForm({...dingtalkTestForm, keyword: e.target.value})}
                                className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                              />
                            </div>
                            {dingtalkTestForm.sign && (
                              <div className="space-y-2">
                                <Label htmlFor="dingtalkTestSecret" className="text-sm font-medium text-gray-700">
                                  Secret
                                </Label>
                                <Input
                                  id="dingtalkTestSecret"
                                  placeholder="请输入加签密钥"
                                  value={dingtalkTestForm.secret}
                                  onChange={(e) => setDingtalkTestForm({...dingtalkTestForm, secret: e.target.value})}
                                  className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                                />
                              </div>
                            )}
                            <div className="space-y-2">
                              <Label htmlFor="dingtalkTestMessage" className="text-sm font-medium text-gray-700">
                                测试消息
                              </Label>
                              <textarea
                                id="dingtalkTestMessage"
                                placeholder="请输入测试消息内容"
                                value={dingtalkTestForm.message}
                                onChange={(e) => setDingtalkTestForm({...dingtalkTestForm, message: e.target.value})}
                                className="w-full h-24 p-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 transition-all duration-300 resize-none"
                              />
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                onClick={saveNotificationConfig}
                                variant="outline"
                                className="flex-1 h-10 border-gray-300 text-gray-700 hover:bg-gray-50"
                                disabled={isLoading}
                              >
                                保存配置
                              </Button>
                              <Button 
                                onClick={handleTestDingTalkNotification}
                                className="flex-1 h-12 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <div className="flex items-center justify-center">
                                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                    发送中...
                                  </div>
                                ) : (
                                  '发送钉钉通知'
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        {/* 企微通知测试 */}
                        <Card className="bg-gray-50 border border-gray-200">
                          <CardHeader>
                            <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-bold">微</span>
                              </div>
                              企微通知测试
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                              测试企业微信机器人通知功能
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="wechatTestWebhook" className="text-sm font-medium text-gray-700">
                                Webhook 地址
                              </Label>
                              <Input
                                id="wechatTestWebhook"
                                placeholder="请输入企业微信机器人webhook地址"
                                value={wechatTestForm.webhook}
                                onChange={(e) => setWechatTestForm({...wechatTestForm, webhook: e.target.value})}
                                className="h-12 border-gray-200 focus:border-green-500 focus:ring-green-500 transition-all duration-300"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="wechatTestMessage" className="text-sm font-medium text-gray-700">
                                测试消息
                              </Label>
                              <textarea
                                id="wechatTestMessage"
                                placeholder="请输入测试消息内容"
                                value={wechatTestForm.message}
                                onChange={(e) => setWechatTestForm({...wechatTestForm, message: e.target.value})}
                                className="w-full h-24 p-3 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-green-500 transition-all duration-300 resize-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">
                                消息类型
                              </Label>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className={`flex-1 h-10 ${wechatTestForm.messageType === 'text' ? 'bg-green-100 border-green-500 text-green-700' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                                  onClick={() => setWechatTestForm({...wechatTestForm, messageType: 'text'})}
                                >
                                  文本
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className={`flex-1 h-10 ${wechatTestForm.messageType === 'markdown' ? 'bg-green-100 border-green-500 text-green-700' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                                  onClick={() => setWechatTestForm({...wechatTestForm, messageType: 'markdown'})}
                                >
                                  Markdown
                                </Button>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                onClick={saveNotificationConfig}
                                variant="outline"
                                className="flex-1 h-10 border-gray-300 text-gray-700 hover:bg-gray-50"
                                disabled={isLoading}
                              >
                                保存配置
                              </Button>
                              <Button 
                                onClick={handleTestWechatNotification}
                                className="flex-1 h-12 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <div className="flex items-center justify-center">
                                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                    发送中...
                                  </div>
                                ) : (
                                  '发送企微通知'
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Tabs>
      </div>

      {/* 驾驶员管理对话框 */}
      <Dialog open={isDriverDialogOpen} onOpenChange={setIsDriverDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              管理代开驾驶员 - {vehicles.find(v => v.id === currentVehicleId)?.licensePlate}
            </DialogTitle>
            <DialogDescription>
              为车辆【{vehicles.find(v => v.id === currentVehicleId)?.licensePlate}】管理代开驾驶员，支持驾驶员信息的增删改查以及挪车码生成
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 添加驾驶员按钮 */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900"></h3>
                {/* <p className="text-sm text-gray-500">为车辆 {vehicles.find(v => v.id === currentVehicleId)?.licensePlate} 管理代开驾驶员</p> */}
              </div>
              <Dialog open={isAddDriverDialogOpen} onOpenChange={setIsAddDriverDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setDriverForm({
                      name: '',
                      phone: '',
                      dingtalkWebhook: '',
                      dingtalkSign: false,
                      dingtalkSecret: '',
                      dingtalkKeyword: '',
                      wechatWebhook: ''
                    })
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加驾驶员
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>添加代开驾驶员</DialogTitle>
                    <DialogDescription>填写驾驶员基本信息</DialogDescription>
                  </DialogHeader>
                  
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="basic">基础信息</TabsTrigger>
                      <TabsTrigger value="notification">通知配置</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="driverName" className="text-sm font-medium text-gray-700">姓名</Label>
                        <Input 
                          id="driverName"
                          placeholder="请输入驾驶员姓名"
                          value={driverForm.name}
                          onChange={(e) => setDriverForm({...driverForm, name: e.target.value})}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="driverPhone" className="text-sm font-medium text-gray-700">手机号</Label>
                        <Input 
                          id="driverPhone"
                          placeholder="请输入手机号"
                          value={driverForm.phone}
                          onChange={(e) => setDriverForm({...driverForm, phone: e.target.value})}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">

                      </div>
                    </TabsContent>
                    
                    <TabsContent value="notification" className="space-y-4 mt-4">
                      {/* 钉钉通知配置 */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-700">钉钉通知配置（可选）</h4>
                        <div className="space-y-2">
                          <Label htmlFor="dingtalkWebhook" className="text-sm font-medium text-gray-700">钉钉Webhook地址</Label>
                          <Input 
                            id="dingtalkWebhook"
                            placeholder="请输入钉钉机器人Webhook地址"
                            value={driverForm.dingtalkWebhook}
                            onChange={(e) => setDriverForm({...driverForm, dingtalkWebhook: e.target.value})}
                            className="h-10"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="dingtalkSign"
                            checked={driverForm.dingtalkSign}
                            onCheckedChange={(checked) => setDriverForm({...driverForm, dingtalkSign: checked})}
                          />
                          <Label htmlFor="dingtalkSign" className="text-sm font-medium text-gray-700">是否加签</Label>
                        </div>
                        {driverForm.dingtalkSign && (
                          <div className="space-y-2">
                            <Label htmlFor="dingtalkSecret" className="text-sm font-medium text-gray-700">加签Secret</Label>
                            <Input 
                              id="dingtalkSecret"
                              placeholder="请输入加签Secret"
                              value={driverForm.dingtalkSecret}
                              onChange={(e) => setDriverForm({...driverForm, dingtalkSecret: e.target.value})}
                              className="h-10"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="dingtalkKeyword" className="text-sm font-medium text-gray-700">关键词</Label>
                          <Input 
                            id="dingtalkKeyword"
                            placeholder="请输入关键词"
                            value={driverForm.dingtalkKeyword}
                            onChange={(e) => setDriverForm({...driverForm, dingtalkKeyword: e.target.value})}
                            className="h-10"
                          />
                        </div>
                      </div>

                      {/* 企微通知配置 */}
                      <div className="space-y-4 border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-700">企微通知配置（可选）</h4>
                        <div className="space-y-2">
                          <Label htmlFor="wechatWebhook" className="text-sm font-medium text-gray-700">企微Webhook地址</Label>
                          <Input 
                            id="wechatWebhook"
                            placeholder="请输入企业微信机器人Webhook地址"
                            value={driverForm.wechatWebhook}
                            onChange={(e) => setDriverForm({...driverForm, wechatWebhook: e.target.value})}
                            className="h-10"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <Button 
                    className="w-full mt-4" 
                    disabled={isLoading}
                    onClick={handleAddDriver}
                  >
                    {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    添加驾驶员
                  </Button>
                </DialogContent>
              </Dialog>
            </div>

            {/* 驾驶员列表 */}
            <Card>
              <CardContent className="p-0">
                {drivers.filter(d => d.vehicleId === currentVehicleId).length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">暂无代开驾驶员，请先添加驾驶员</p>
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>姓名</TableHead>
                          <TableHead>手机号</TableHead>


                          <TableHead>添加时间</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drivers.filter(d => d.vehicleId === currentVehicleId).map((driver) => (
                          <TableRow key={driver.id}>
                            <TableCell className="font-medium">{driver.name}</TableCell>
                            <TableCell>{driver.phone}</TableCell>

                            <TableCell>{driver.createdAt ? new Date(driver.createdAt).toLocaleDateString() : ''}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={true}
                                  onCheckedChange={() => handleToggleDriver(driver.id, !true)}
                                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                                />
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  title="编辑驾驶员"
                                  onClick={() => handleEditDriver(driver)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  title="生成二维码"
                                  onClick={() => handleGenerateDriverCode(driver)}
                                >
                                  <QrCode className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive" title="删除驾驶员">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>确认删除驾驶员</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        您确定要删除驾驶员 "{driver.name}" 吗？此操作不可撤销。
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>取消</AlertDialogCancel>
                                      <AlertDialogAction 
                                        className="bg-red-600 hover:bg-red-700"
                                        onClick={() => handleDeleteDriver(driver.id)}
                                      >
                                        确认删除
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑驾驶员对话框 */}
      <Dialog open={isEditDriverDialogOpen} onOpenChange={setIsEditDriverDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑代开驾驶员</DialogTitle>
            <DialogDescription>修改驾驶员基本信息</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">基础信息</TabsTrigger>
              <TabsTrigger value="notification">通知配置</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="editDriverName" className="text-sm font-medium text-gray-700">姓名</Label>
                <Input 
                  id="editDriverName"
                  placeholder="请输入驾驶员姓名"
                  value={driverForm.name}
                  onChange={(e) => setDriverForm({...driverForm, name: e.target.value})}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDriverPhone" className="text-sm font-medium text-gray-700">手机号</Label>
                <Input 
                  id="editDriverPhone"
                  placeholder="请输入手机号"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({...driverForm, phone: e.target.value})}
                  className="h-10"
                />
              </div>

            </TabsContent>
            
            <TabsContent value="notification" className="space-y-4 mt-4">
              {/* 钉钉通知配置 */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">钉钉通知配置（可选）</h4>
                <div className="space-y-2">
                  <Label htmlFor="editDingtalkWebhook" className="text-sm font-medium text-gray-700">钉钉Webhook地址</Label>
                  <Input 
                    id="editDingtalkWebhook"
                    placeholder="请输入钉钉机器人Webhook地址"
                    value={driverForm.dingtalkWebhook}
                    onChange={(e) => setDriverForm({...driverForm, dingtalkWebhook: e.target.value})}
                    className="h-10"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="editDingtalkSign"
                    checked={driverForm.dingtalkSign}
                    onCheckedChange={(checked) => setDriverForm({...driverForm, dingtalkSign: checked})}
                  />
                  <Label htmlFor="editDingtalkSign" className="text-sm font-medium text-gray-700">是否加签</Label>
                </div>
                {driverForm.dingtalkSign && (
                  <div className="space-y-2">
                    <Label htmlFor="editDingtalkSecret" className="text-sm font-medium text-gray-700">加签Secret</Label>
                    <Input 
                      id="editDingtalkSecret"
                      placeholder="请输入加签Secret"
                      value={driverForm.dingtalkSecret}
                      onChange={(e) => setDriverForm({...driverForm, dingtalkSecret: e.target.value})}
                      className="h-10"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="editDingtalkKeyword" className="text-sm font-medium text-gray-700">关键词</Label>
                  <Input 
                    id="editDingtalkKeyword"
                    placeholder="请输入关键词"
                    value={driverForm.dingtalkKeyword}
                    onChange={(e) => setDriverForm({...driverForm, dingtalkKeyword: e.target.value})}
                    className="h-10"
                  />
                </div>
              </div>

              {/* 企微通知配置 */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700">企微通知配置（可选）</h4>
                <div className="space-y-2">
                  <Label htmlFor="editWechatWebhook" className="text-sm font-medium text-gray-700">企微Webhook地址</Label>
                  <Input 
                    id="editWechatWebhook"
                    placeholder="请输入企业微信机器人Webhook地址"
                    value={driverForm.wechatWebhook}
                    onChange={(e) => setDriverForm({...driverForm, wechatWebhook: e.target.value})}
                    className="h-10"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <Button 
            className="w-full mt-4" 
            disabled={isLoading}
            onClick={handleUpdateDriver}
          >
            {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            更新驾驶员信息
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}