'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface AuthUser {
  id: string
  username: string
  phone: string
  name: string
  email?: string
  role: string
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isLoading: boolean
  isAdmin: boolean
}

interface RegisterData {
  username: string
  phone: string
  name: string
  email?: string
  password: string
  confirmPassword: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // 初始化认证状态
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('auth_token')
        if (savedToken) {
          setToken(savedToken)
          
          // 验证 token 并获取用户信息
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            setUser(data.user)
          } else {
            // Token 无效，清除本地存储
            localStorage.removeItem('auth_token')
            setToken(null)
          }
        }
      } catch (error) {
        console.error('初始化认证状态失败:', error)
        localStorage.removeItem('auth_token')
        setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  // 登录
  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (response.ok) {
        // 检查是否有用户数据和token
        if (data.user && data.token) {
          setUser(data.user)
          setToken(data.token)
          localStorage.setItem('auth_token', data.token)
          return { success: true }
        } else {
          // 处理用户不存在的情况
          return { success: false, error: data.error }
        }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('登录失败:', error)
      return { success: false, error: '网络错误，请稍后重试' }
    }
  }

  // 注册
  const register = async (registerData: RegisterData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerData)
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        setToken(data.token)
        localStorage.setItem('auth_token', data.token)
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('注册失败:', error)
      return { success: false, error: '网络错误，请稍后重试' }
    }
  }

  // 退出登录
  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      }
    } catch (error) {
      console.error('退出登录失败:', error)
    } finally {
      setUser(null)
      setToken(null)
      localStorage.removeItem('auth_token')
      router.push('/')
    }
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isLoading,
        isAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}