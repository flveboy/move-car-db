'use client'

import { useState, createContext, useContext, ReactNode, useEffect, useRef } from 'react'
import { PageLoading } from './page-loading'

const LoadingContext = createContext<{
  isLoading: boolean
  loadingMessage: string
  loadingSubMessage: string
  setLoading: (loading: boolean, message?: string, subMessage?: string, timeout?: number) => void
}>({
  isLoading: false,
  loadingMessage: '页面加载中...',
  loadingSubMessage: '请稍候',
  setLoading: () => {}
})

export const useLoading = () => useContext(LoadingContext)

interface LoadingProviderProps {
  children: ReactNode
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('页面加载中...')
  const [loadingSubMessage, setLoadingSubMessage] = useState('请稍候')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const setLoading = (loading: boolean, message?: string, subMessage?: string, timeout: number = 30000) => {
    // 清除之前的超时定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    setIsLoading(loading)
    if (loading && message) {
      setLoadingMessage(message)
    } else if (!loading) {
      setLoadingMessage('页面加载中...')
    }
    if (loading && subMessage) {
      setLoadingSubMessage(subMessage)
    } else if (!loading) {
      setLoadingSubMessage('请稍候')
    }

    // 如果设置为loading状态，添加超时保护
    if (loading) {
      timeoutRef.current = setTimeout(() => {
        console.warn('Loading timed out, automatically hiding')
        setIsLoading(false)
        setLoadingMessage('页面加载中...')
        setLoadingSubMessage('请稍候')
        timeoutRef.current = null
      }, timeout)
    }
  }

  // 清理函数，确保组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // 添加页面可见性变化监听，当页面重新变为可见时重置loading状态
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isLoading) {
        // 页面重新变为可见时，如果loading仍在显示，重置状态
        setIsLoading(false)
        setLoadingMessage('页面加载中...')
        setLoadingSubMessage('请稍候')
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [isLoading])

  return (
    <LoadingContext.Provider value={{ isLoading, loadingMessage, loadingSubMessage, setLoading }}>
      {children}
      {isLoading && <PageLoading message={loadingMessage} subMessage={loadingSubMessage} />}
    </LoadingContext.Provider>
  )
}

// 页面加载完成后自动隐藏 loading 的 Hook
export function usePageLoadComplete() {
  const { setLoading } = useLoading()
  
  useEffect(() => {
    const handleLoad = () => setLoading(false)
    const handleBeforeUnload = () => setLoading(false)
    
    // 确保在客户端执行
    if (typeof window !== 'undefined') {
      // 如果文档已加载完成，立即隐藏 loading
      if (document.readyState === 'complete') {
        setLoading(false)
      } else {
        // 否则监听加载完成事件
        window.addEventListener('load', handleLoad)
      }
      // 添加页面卸载前的事件监听
      window.addEventListener('beforeunload', handleBeforeUnload)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('load', handleLoad)
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
      setLoading(false)
    }
  }, [setLoading])
}