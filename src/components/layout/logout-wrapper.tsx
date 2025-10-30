'use client'

import { useAuth } from '@/hooks/use-auth'
import { LogoutLoading } from './logout-loading'

export function LogoutWrapper({ children }: { children: React.ReactNode }) {
  const { isLoggingOut } = useAuth()
  
  return (
    <>
      {children}
      <LogoutLoading isLoggingOut={isLoggingOut} />
    </>
  )
}