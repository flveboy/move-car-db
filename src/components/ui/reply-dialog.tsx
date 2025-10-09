'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { MessageCircle, Send, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Reply {
  id: string
  message: string
  senderType: 'ADMIN' | 'USER'
  createdAt: string
  sender: {
    id: string
    name: string
    role: string
  }
}

interface ReplyDialogProps {
  recordId: string
  recordMessage: string
  onReplySent?: () => void
}

export function ReplyDialog({ recordId, recordMessage, onReplySent }: ReplyDialogProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [replies, setReplies] = useState<Reply[]>([])
  const [showReplies, setShowReplies] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const fetchReplies = async () => {
    try {
      const response = await fetch(`/api/records/${recordId}/replies`)
      if (response.ok) {
        const data = await response.json()
        setReplies(data.data.replies || [])
      }
    } catch (error) {
      console.error('获取回复列表失败:', error)
    }
  }

  const handleSendReply = async () => {
    if (!message.trim()) {
      setNotification({
        type: 'error',
        message: '请输入回复内容'
      })
      return
    }

    setLoading(true)
    setNotification({ type: null, message: '' })

    try {
      // 使用新的推送回复API，通过会话ID推送
      const response = await fetch(`/api/notifications/push-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recordId: recordId,
          message: message.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        setNotification({
          type: 'success',
          message: '回复发送成功'
        })
        setMessage('')
        // 刷新回复列表
        await fetchReplies()
        onReplySent?.()
      } else {
        setNotification({
          type: 'error',
          message: result.error || '回复发送失败'
        })
      }
    } catch (error) {
      console.error('发送回复失败:', error)
      setNotification({
        type: 'error',
        message: '网络错误，请稍后重试'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = async (open: boolean) => {
    setOpen(open)
    if (open) {
      await fetchReplies()
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageCircle className="h-4 w-4" />
          回复
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>回复挪车通知</DialogTitle>
          <DialogDescription>
            原始消息: {recordMessage}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 回复列表 */}
          {replies.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>对话记录</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplies(!showReplies)}
                >
                  {showReplies ? '收起' : '展开'} ({replies.length})
                </Button>
              </div>
              
              {showReplies && (
                <div className="max-h-60 overflow-y-auto space-y-3">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-3 rounded-lg ${
                        reply.senderType === 'ADMIN'
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {reply.sender.name}
                          </span>
                          {reply.sender.role === 'ADMIN' && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              管理员
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTime(reply.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{reply.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 回复输入 */}
          <div className="space-y-2">
            <Label htmlFor="reply-message">回复内容</Label>
            <Textarea
              id="reply-message"
              placeholder="请输入回复内容..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <div className="text-xs text-gray-500 text-right">
              {message.length}/500 字符
            </div>
          </div>

          {/* 通知 */}
          {notification.type && (
            <Alert className={
              notification.type === 'success' 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
            }>
              <AlertDescription className={
                notification.type === 'success' 
                  ? 'text-green-800' 
                  : 'text-red-800'
              }>
                {notification.message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSendReply}
            disabled={loading || !message.trim()}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            发送回复
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}