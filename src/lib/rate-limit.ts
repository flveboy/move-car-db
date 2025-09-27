// 内存存储速率限制数据 (在生产环境中建议使用Redis)
interface RateLimitData {
  count: number
  resetTime: number
}

class RateLimiter {
  private limits: Map<string, RateLimitData> = new Map()
  private readonly windowMs: number // 时间窗口（毫秒）
  private readonly maxRequests: number // 最大请求数

  constructor(windowMs: number = 60 * 1000, maxRequests: number = 10) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
  }

  // 检查是否允许请求
  check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const record = this.limits.get(key)

    if (!record) {
      // 第一次请求
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      })
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      }
    }

    // 检查时间窗口是否已过期
    if (now > record.resetTime) {
      // 重置计数器
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      })
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      }
    }

    // 检查是否超过限制
    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime
      }
    }

    // 增加计数
    record.count++
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetTime: record.resetTime
    }
  }

  // 获取当前状态
  getStatus(key: string): { count: number; remaining: number; resetTime: number } | null {
    const record = this.limits.get(key)
    if (!record) return null

    const now = Date.now()
    if (now > record.resetTime) {
      this.limits.delete(key)
      return null
    }

    return {
      count: record.count,
      remaining: Math.max(0, this.maxRequests - record.count),
      resetTime: record.resetTime
    }
  }

  // 清理过期的记录
  cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.limits.entries()) {
      if (now > record.resetTime) {
        this.limits.delete(key)
      }
    }
  }
}

// 创建速率限制器实例
export const dingTalkRateLimiter = new RateLimiter(60 * 1000, 10) // 1分钟10次
export const wechatRateLimiter = new RateLimiter(60 * 1000, 10) // 1分钟10次

// 定期清理过期记录（每分钟）
if (typeof window === 'undefined') {
  setInterval(() => {
    dingTalkRateLimiter.cleanup()
    wechatRateLimiter.cleanup()
  }, 60 * 1000)
}

export default RateLimiter