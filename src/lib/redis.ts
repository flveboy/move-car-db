import { createClient } from 'redis'

// Redis客户端配置
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
  },
})

// Redis连接事件监听
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err)
})

redisClient.on('connect', () => {
  console.log('Redis Client Connected')
})

redisClient.on('ready', () => {
  console.log('Redis Client Ready')
})

redisClient.on('end', () => {
  console.log('Redis Client Disconnected')
})

// 连接Redis客户端
let redisConnected = false

async function connectRedis() {
  if (!redisConnected) {
    try {
      await redisClient.connect()
      redisConnected = true
    } catch (error) {
      console.error('Failed to connect to Redis:', error)
      // 在开发环境中，如果Redis连接失败，我们继续运行但不使用缓存
      if (process.env.NODE_ENV === 'development') {
        console.warn('Running without Redis cache in development mode')
      }
    }
  }
  return redisConnected
}

// 断开Redis连接
async function disconnectRedis() {
  if (redisConnected) {
    await redisClient.quit()
    redisConnected = false
  }
}

// 缓存键前缀
const CACHE_PREFIX = {
  OWNER: 'owner:',
  VEHICLE: 'vehicle:',
  CODE: 'code:',
  RECORD: 'record:',
  CODE_INFO: 'code_info:',
  OWNER_VEHICLES: 'owner_vehicles:',
  OWNER_CODES: 'owner_codes:',
  VEHICLE_CODES: 'vehicle_codes:',
  CODE_RECORDS: 'code_records:',
  OWNER_RECORDS: 'owner_records:',
}

// 缓存时间（秒）
const CACHE_TTL = {
  SHORT: 300, // 5分钟
  MEDIUM: 1800, // 30分钟
  LONG: 3600, // 1小时
  VERY_LONG: 86400, // 24小时
}

// 缓存工具类
export class RedisCache {
  // 设置缓存
  static async set(key: string, value: any, ttl: number = CACHE_TTL.MEDIUM) {
    if (!await connectRedis()) return false
    
    try {
      const serializedValue = JSON.stringify(value)
      await redisClient.setEx(key, ttl, serializedValue)
      return true
    } catch (error) {
      console.error('Redis set error:', error)
      return false
    }
  }

  // 获取缓存
  static async get(key: string) {
    if (!await connectRedis()) return null
    
    try {
      const value = await redisClient.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  }

  // 删除缓存
  static async del(key: string) {
    if (!await connectRedis()) return false
    
    try {
      await redisClient.del(key)
      return true
    } catch (error) {
      console.error('Redis del error:', error)
      return false
    }
  }

  // 删除匹配模式的缓存
  static async delPattern(pattern: string) {
    if (!await connectRedis()) return false
    
    try {
      const keys = await redisClient.keys(pattern)
      if (keys.length > 0) {
        await redisClient.del(keys)
      }
      return true
    } catch (error) {
      console.error('Redis delPattern error:', error)
      return false
    }
  }

  // 检查缓存是否存在
  static async exists(key: string) {
    if (!await connectRedis()) return false
    
    try {
      const result = await redisClient.exists(key)
      return result === 1
    } catch (error) {
      console.error('Redis exists error:', error)
      return false
    }
  }

  // 设置过期时间
  static async expire(key: string, ttl: number) {
    if (!await connectRedis()) return false
    
    try {
      await redisClient.expire(key, ttl)
      return true
    } catch (error) {
      console.error('Redis expire error:', error)
      return false
    }
  }

  // 获取缓存剩余时间
  static async ttl(key: string) {
    if (!await connectRedis()) return -1
    
    try {
      return await redisClient.ttl(key)
    } catch (error) {
      console.error('Redis ttl error:', error)
      return -1
    }
  }
}

// 业务相关的缓存键生成函数
export const CacheKeys = {
  // 车主相关
  owner: (id: string) => `${CACHE_PREFIX.OWNER}${id}`,
  ownerByPhone: (phone: string) => `${CACHE_PREFIX.OWNER}phone:${phone}`,
  
  // 车辆相关
  vehicle: (id: string) => `${CACHE_PREFIX.VEHICLE}${id}`,
  vehicleByLicensePlate: (licensePlate: string) => `${CACHE_PREFIX.VEHICLE}license:${licensePlate}`,
  ownerVehicles: (ownerId: string) => `${CACHE_PREFIX.OWNER_VEHICLES}${ownerId}`,
  
  // 挪车码相关
  code: (id: string) => `${CACHE_PREFIX.CODE}${id}`,
  codeByValue: (code: string) => `${CACHE_PREFIX.CODE_INFO}${code}`,
  ownerCodes: (ownerId: string) => `${CACHE_PREFIX.OWNER_CODES}${ownerId}`,
  vehicleCodes: (vehicleId: string) => `${CACHE_PREFIX.VEHICLE_CODES}${vehicleId}`,
  
  // 记录相关
  record: (id: string) => `${CACHE_PREFIX.RECORD}${id}`,
  codeRecords: (codeId: string) => `${CACHE_PREFIX.CODE_RECORDS}${codeId}`,
  ownerRecords: (ownerId: string) => `${CACHE_PREFIX.OWNER_RECORDS}${ownerId}`,
}

// 缓存清理函数
export const CacheCleaner = {
  // 清理车主相关缓存
  async cleanOwner(ownerId: string, phone?: string) {
    const keys = [
      CacheKeys.owner(ownerId),
      CacheKeys.ownerVehicles(ownerId),
      CacheKeys.ownerCodes(ownerId),
      CacheKeys.ownerRecords(ownerId),
    ]
    
    if (phone) {
      keys.push(CacheKeys.ownerByPhone(phone))
    }
    
    for (const key of keys) {
      await RedisCache.del(key)
    }
  },

  // 清理车辆相关缓存
  async cleanVehicle(vehicleId: string, licensePlate?: string, ownerId?: string) {
    const keys = [
      CacheKeys.vehicle(vehicleId),
      CacheKeys.vehicleCodes(vehicleId),
    ]
    
    if (licensePlate) {
      keys.push(CacheKeys.vehicleByLicensePlate(licensePlate))
    }
    
    if (ownerId) {
      keys.push(CacheKeys.ownerVehicles(ownerId))
    }
    
    for (const key of keys) {
      await RedisCache.del(key)
    }
  },

  // 清理挪车码相关缓存
  async cleanCode(codeId: string, codeValue?: string, ownerId?: string, vehicleId?: string) {
    const keys = [
      CacheKeys.code(codeId),
      CacheKeys.codeRecords(codeId),
    ]
    
    if (codeValue) {
      keys.push(CacheKeys.codeByValue(codeValue))
    }
    
    if (ownerId) {
      keys.push(CacheKeys.ownerCodes(ownerId))
      keys.push(CacheKeys.ownerRecords(ownerId))
    }
    
    if (vehicleId) {
      keys.push(CacheKeys.vehicleCodes(vehicleId))
    }
    
    for (const key of keys) {
      await RedisCache.del(key)
    }
  },

  // 清理记录相关缓存
  async cleanRecord(recordId: string, codeId?: string, ownerId?: string) {
    const keys = [
      CacheKeys.record(recordId),
    ]
    
    if (codeId) {
      keys.push(CacheKeys.codeRecords(codeId))
    }
    
    if (ownerId) {
      keys.push(CacheKeys.ownerRecords(ownerId))
    }
    
    for (const key of keys) {
      await RedisCache.del(key)
    }
  },
}

// 导出Redis客户端（用于高级操作）
export { redisClient, connectRedis, disconnectRedis }

// 默认导出RedisCache
export default RedisCache