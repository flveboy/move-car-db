'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export function LogoutLoading({ isLoggingOut }: { isLoggingOut: boolean }) {
  return (
    <AnimatePresence>
      {isLoggingOut && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-card p-8 rounded-lg shadow-lg flex flex-col items-center space-y-4"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-medium">退出登录中...</p>
            <p className="text-sm text-muted-foreground">正在安全退出，请稍候</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}