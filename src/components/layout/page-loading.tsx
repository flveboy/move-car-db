'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function PageLoading({ message = '页面加载中...', subMessage = '请稍候' }: { message?: string; subMessage?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">{message}</p>
          <p className="text-xs text-gray-500 mt-1">{subMessage}</p>
        </div>
      </div>
    </div>
  )
}