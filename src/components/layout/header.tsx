'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Car, User, Settings, LogOut, Shield } from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useLoading } from './loading-provider'

interface HeaderProps {
  title?: string
}

export function Header({ title = '扫码挪车' }: HeaderProps) {
  const { user, logout, isAdmin } = useAuth()
  const router = useRouter()
  const { setLoading } = useLoading()
  const pathname = usePathname()
  if (!user) {
    return (
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Car className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>
            <Link href="/auth">
              <Button>登录/注册</Button>
            </Link>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Car className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAdmin && (
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  管理后台
                </Button>
              </Link>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={user.name} />
                    <AvatarFallback>
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.phone}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                  if (pathname !== '/profile') {
                    setLoading(true)
                    await new Promise(resolve => setTimeout(resolve, 300))
                    await router.push('/profile')
                  } else {
                    router.push('/profile')
                  }
                }}>
                  <User className="mr-2 h-4 w-4" />
                  <span>个人信息</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  if (pathname !== '/settings') {
                    setLoading(true)
                    await new Promise(resolve => setTimeout(resolve, 300))
                    await router.push('/settings')
                  } else {
                    router.push('/settings')
                  }
                }}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>设置</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                  try {
                    await logout()
                  } catch (error) {
                    console.error('退出登录失败:', error)
                  }
                }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}