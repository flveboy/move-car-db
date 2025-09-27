import { RedisCache, CacheKeys, CacheCleaner } from './redis'

// 缓存装饰器选项
interface CacheOptions {
  key?: string
  ttl?: number
  strategy?: 'read' | 'write' | 'both'
}

// 带缓存的数据库查询函数
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 1800 } = options // 默认30分钟

  // 尝试从缓存获取
  const cached = await RedisCache.get(key)
  if (cached) {
    return cached
  }

  // 缓存未命中，从数据库获取
  const data = await fetchFn()
  
  // 存入缓存
  await RedisCache.set(key, data, ttl)
  
  return data
}

// 带缓存清理的数据库更新函数
export async function withCacheClean<T>(
  updateFn: () => Promise<T>,
  cleanKeys: string | string[]
): Promise<T> {
  // 执行更新操作
  const result = await updateFn()
  
  // 清理相关缓存
  if (Array.isArray(cleanKeys)) {
    await Promise.all(cleanKeys.map(key => RedisCache.del(key)))
  } else {
    await RedisCache.del(cleanKeys)
  }
  
  return result
}

// 车主相关缓存操作
export const OwnerCache = {
  // 获取车主信息（带缓存）
  async getById(id: string, fetchFn: () => Promise<any>) {
    return withCache(CacheKeys.owner(id), fetchFn)
  },

  // 根据手机号获取车主（带缓存）
  async getByPhone(phone: string, fetchFn: () => Promise<any>) {
    return withCache(CacheKeys.ownerByPhone(phone), fetchFn)
  },

  // 创建车主（清理缓存）
  async create(createFn: () => Promise<any>, phone?: string) {
    const result = await createFn()
    if (result && phone) {
      // 清理手机号相关的缓存
      await RedisCache.del(CacheKeys.ownerByPhone(phone))
    }
    return result
  },

  // 更新车主（清理缓存）
  async update(id: string, updateFn: () => Promise<any>, oldPhone?: string, newPhone?: string) {
    const result = await updateFn()
    
    // 清理相关缓存
    await CacheCleaner.cleanOwner(id)
    
    // 如果手机号有变化，清理新旧手机号的缓存
    if (oldPhone && newPhone && oldPhone !== newPhone) {
      await RedisCache.del(CacheKeys.ownerByPhone(oldPhone))
      await RedisCache.del(CacheKeys.ownerByPhone(newPhone))
    }
    
    return result
  },

  // 删除车主（清理缓存）
  async delete(id: string, deleteFn: () => Promise<any>, phone?: string) {
    const result = await deleteFn()
    
    // 清理相关缓存
    await CacheCleaner.cleanOwner(id, phone)
    
    return result
  },
}

// 车辆相关缓存操作
export const VehicleCache = {
  // 获取车辆信息（带缓存）
  async getById(id: string, fetchFn: () => Promise<any>) {
    return withCache(CacheKeys.vehicle(id), fetchFn)
  },

  // 根据车牌号获取车辆（带缓存）
  async getByLicensePlate(licensePlate: string, fetchFn: () => Promise<any>) {
    return withCache(CacheKeys.vehicleByLicensePlate(licensePlate), fetchFn)
  },

  // 获取车主的车辆列表（带缓存）
  async getByOwner(ownerId: string, fetchFn: () => Promise<any>) {
    return withCache(CacheKeys.ownerVehicles(ownerId), fetchFn)
  },

  // 创建车辆（清理缓存）
  async create(createFn: () => Promise<any>, ownerId?: string, licensePlate?: string) {
    const result = await createFn()
    
    if (result && ownerId) {
      // 清理车主的车辆列表缓存
      await RedisCache.del(CacheKeys.ownerVehicles(ownerId))
    }
    
    if (result && licensePlate) {
      // 清理车牌号相关的缓存
      await RedisCache.del(CacheKeys.vehicleByLicensePlate(licensePlate))
    }
    
    return result
  },

  // 更新车辆（清理缓存）
  async update(id: string, updateFn: () => Promise<any>, ownerId?: string, oldLicensePlate?: string, newLicensePlate?: string) {
    const result = await updateFn()
    
    // 清理相关缓存
    await CacheCleaner.cleanVehicle(id, oldLicensePlate, ownerId)
    
    // 如果车牌号有变化，清理新旧车牌号的缓存
    if (oldLicensePlate && newLicensePlate && oldLicensePlate !== newLicensePlate) {
      await RedisCache.del(CacheKeys.vehicleByLicensePlate(oldLicensePlate))
      await RedisCache.del(CacheKeys.vehicleByLicensePlate(newLicensePlate))
    }
    
    return result
  },

  // 删除车辆（清理缓存）
  async delete(id: string, deleteFn: () => Promise<any>, ownerId?: string, licensePlate?: string) {
    const result = await deleteFn()
    
    // 清理相关缓存
    await CacheCleaner.cleanVehicle(id, licensePlate, ownerId)
    
    return result
  },
}

// 挪车码相关缓存操作
export const CodeCache = {
  // 获取挪车码信息（带缓存）
  async getById(id: string, fetchFn: () => Promise<any>) {
    return withCache(CacheKeys.code(id), fetchFn)
  },

  // 根据码值获取挪车码信息（带缓存）
  async getByCode(code: string, fetchFn: () => Promise<any>) {
    return withCache(CacheKeys.codeByValue(code), fetchFn, { ttl: 300 }) // 码值查询缓存时间较短
  },

  // 获取车主的挪车码列表（带缓存）
  async getByOwner(ownerId: string, fetchFn: () => Promise<any>) {
    return withCache(CacheKeys.ownerCodes(ownerId), fetchFn)
  },

  // 获取车辆的挪车码列表（带缓存）
  async getByVehicle(vehicleId: string, fetchFn: () => Promise<any>) {
    return withCache(CacheKeys.vehicleCodes(vehicleId), fetchFn)
  },

  // 创建挪车码（清理缓存）
  async create(createFn: () => Promise<any>, ownerId?: string, vehicleId?: string, code?: string) {
    const result = await createFn()
    
    if (result && ownerId) {
      // 清理车主的挪车码列表缓存
      await RedisCache.del(CacheKeys.ownerCodes(ownerId))
    }
    
    if (result && vehicleId) {
      // 清理车辆的挪车码列表缓存
      await RedisCache.del(CacheKeys.vehicleCodes(vehicleId))
    }
    
    return result
  },

  // 更新挪车码（清理缓存）
  async update(id: string, updateFn: () => Promise<any>, ownerId?: string, vehicleId?: string, code?: string) {
    const result = await updateFn()
    
    // 清理相关缓存
    await CacheCleaner.cleanCode(id, code, ownerId, vehicleId)
    
    return result
  },

  // 删除挪车码（清理缓存）
  async delete(id: string, deleteFn: () => Promise<any>, ownerId?: string, vehicleId?: string, code?: string) {
    const result = await deleteFn()
    
    // 清理相关缓存
    await CacheCleaner.cleanCode(id, code, ownerId, vehicleId)
    
    return result
  },

  // 切换挪车码状态（清理缓存）
  async toggle(id: string, toggleFn: () => Promise<any>, ownerId?: string, vehicleId?: string, code?: string) {
    const result = await toggleFn()
    
    // 清理相关缓存
    await CacheCleaner.cleanCode(id, code, ownerId, vehicleId)
    
    return result
  },
}

// 记录相关缓存操作
export const RecordCache = {
  // 获取挪车码的记录列表（带缓存）
  async getByCode(codeId: string, fetchFn: () => Promise<any>) {
    return withCache(CacheKeys.codeRecords(codeId), fetchFn, { ttl: 600 }) // 记录缓存时间较短
  },

  // 获取车主的记录列表（带缓存）
  async getByOwner(ownerId: string, fetchFn: () => Promise<any>) {
    return withCache(CacheKeys.ownerRecords(ownerId), fetchFn, { ttl: 600 }) // 记录缓存时间较短
  },

  // 创建记录（清理缓存）
  async create(createFn: () => Promise<any>, codeId?: string, ownerId?: string) {
    const result = await createFn()
    
    if (result && codeId) {
      // 清理挪车码的记录列表缓存
      await RedisCache.del(CacheKeys.codeRecords(codeId))
    }
    
    if (result && ownerId) {
      // 清理车主的记录列表缓存
      await RedisCache.del(CacheKeys.ownerRecords(ownerId))
    }
    
    return result
  },
}

// 批量缓存操作
export const BatchCache = {
  // 批量设置缓存
  async setMany(data: Array<{ key: string; value: any; ttl?: number }>) {
    const promises = data.map(item => 
      RedisCache.set(item.key, item.value, item.ttl || 1800)
    )
    await Promise.all(promises)
  },

  // 批量获取缓存
  async getMany(keys: string[]) {
    const promises = keys.map(key => RedisCache.get(key))
    const results = await Promise.all(promises)
    return results.reduce((acc, result, index) => {
      acc[keys[index]] = result
      return acc
    }, {} as Record<string, any>)
  },

  // 批量删除缓存
  async delMany(keys: string[]) {
    const promises = keys.map(key => RedisCache.del(key))
    await Promise.all(promises)
  },
}

// 缓存统计和监控
export const CacheStats = {
  // 获取缓存命中率（需要自行实现计数器）
  async getHitRate() {
    // 这里可以实现缓存命中率统计
    // 由于Redis本身不提供命中率统计，需要自行实现
    return { hitRate: 0, hits: 0, misses: 0 }
  },

  // 获取缓存键的数量
  async getKeyCount(pattern: string = '*') {
    try {
      const keys = await RedisCache['redisClient']?.keys(pattern) || []
      return keys.length
    } catch (error) {
      console.error('Failed to get key count:', error)
      return 0
    }
  },

  // 清空所有缓存（谨慎使用）
  async flushAll() {
    try {
      await RedisCache['redisClient']?.flushAll()
      return true
    } catch (error) {
      console.error('Failed to flush all cache:', error)
      return false
    }
  },
}