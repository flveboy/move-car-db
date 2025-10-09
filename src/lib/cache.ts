// 简单的内存缓存实现
class SimpleCache {
  private cache = new Map<string, { data: any; expiry: number }>()
  private defaultTTL = 5 * 60 * 1000 // 5分钟

  set(key: string, data: any, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL)
    this.cache.set(key, { data, expiry })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return item.data as T
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // 清理过期缓存
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key)
      }
    }
  }
}

export const cache = new SimpleCache()

// 定期清理过期缓存
setInterval(() => {
  cache.cleanup()
}, 10 * 60 * 1000) // 每10分钟清理一次

// 缓存装饰器
export function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      // 尝试从缓存获取
      const cached = cache.get<T>(key)
      if (cached !== null) {
        resolve(cached)
        return
      }

      // 执行函数并缓存结果
      const result = await fn()
      cache.set(key, result, ttl)
      resolve(result)
    } catch (error) {
      reject(error)
    }
  })
}

// 用户相关缓存
export class OwnerCache {
  private static keyPrefix = 'owner:'

  static async getByPhone(phone: string, fetcher: () => Promise<any>) {
    const key = `${this.keyPrefix}phone:${phone}`
    return withCache(key, fetcher, 2 * 60 * 1000) // 2分钟缓存
  }

  static async getById(id: string, fetcher: () => Promise<any>) {
    const key = `${this.keyPrefix}id:${id}`
    return withCache(key, fetcher, 5 * 60 * 1000) // 5分钟缓存
  }

  static async create(creator: () => Promise<any>) {
    const result = await creator()
    // 创建后清除相关缓存
    this.clearUserCache(result.phone, result.id)
    return result
  }

  static clearUserCache(phone?: string, id?: string) {
    if (phone) cache.delete(`${this.keyPrefix}phone:${phone}`)
    if (id) cache.delete(`${this.keyPrefix}id:${id}`)
  }
}

// 系统配置缓存
export class SystemConfigCache {
  private static keyPrefix = 'config:'

  static async get(key: string, fetcher: () => Promise<any>) {
    const cacheKey = `${this.keyPrefix}${key}`
    return withCache(cacheKey, fetcher, 10 * 60 * 1000) // 10分钟缓存
  }

  static clear(key?: string) {
    if (key) {
      cache.delete(`${this.keyPrefix}${key}`)
    } else {
      // 清除所有配置缓存
      cache.clear()
    }
  }
}