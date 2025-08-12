// utils/cache.js

import { logger } from './logger';
import { measureCacheOperation } from './performance';

/**
 * Comprehensive caching utilities for improved performance
 */

// In-memory cache store
const cacheStore = new Map();
const cacheMetrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  evictions: 0
};

// Cache configuration
const CACHE_CONFIG = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000, // Maximum number of cache entries
  cleanupInterval: 60 * 1000, // 1 minute
  enableMetrics: true
};

// Cache entry structure
class CacheEntry {
  constructor(value, ttl = CACHE_CONFIG.defaultTTL) {
    this.value = value;
    this.createdAt = Date.now();
    this.expiresAt = Date.now() + ttl;
    this.accessCount = 0;
    this.lastAccessed = Date.now();
  }
  
  isExpired() {
    return Date.now() > this.expiresAt;
  }
  
  touch() {
    this.accessCount++;
    this.lastAccessed = Date.now();
  }
  
  getRemainingTTL() {
    return Math.max(0, this.expiresAt - Date.now());
  }
}

// Cache implementation
export class Cache {
  constructor(options = {}) {
    this.config = { ...CACHE_CONFIG, ...options };
    this.store = new Map();
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
    
    // Start cleanup interval
    if (this.config.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.config.cleanupInterval);
    }
  }
  
  // Get value from cache
  async get(key) {
    return measureCacheOperation('get', async () => {
      const entry = this.store.get(key);
      
      if (!entry) {
        this.metrics.misses++;
        logger.debug('Cache miss', { key });
        return null;
      }
      
      if (entry.isExpired()) {
        this.store.delete(key);
        this.metrics.misses++;
        this.metrics.evictions++;
        logger.debug('Cache expired', { key, age: Date.now() - entry.createdAt });
        return null;
      }
      
      entry.touch();
      this.metrics.hits++;
      logger.debug('Cache hit', { key, accessCount: entry.accessCount });
      
      return entry.value;
    });
  }
  
  // Set value in cache
  async set(key, value, ttl = null) {
    return measureCacheOperation('set', async () => {
      // Check cache size limit
      if (this.store.size >= this.config.maxSize) {
        this.evictLRU();
      }
      
      const actualTTL = ttl || this.config.defaultTTL;
      const entry = new CacheEntry(value, actualTTL);
      
      this.store.set(key, entry);
      this.metrics.sets++;
      
      logger.debug('Cache set', { 
        key, 
        ttl: actualTTL, 
        size: this.store.size,
        valueType: typeof value
      });
      
      return true;
    });
  }
  
  // Delete value from cache
  async delete(key) {
    return measureCacheOperation('delete', async () => {
      const deleted = this.store.delete(key);
      
      if (deleted) {
        this.metrics.deletes++;
        logger.debug('Cache delete', { key });
      }
      
      return deleted;
    });
  }
  
  // Check if key exists in cache
  async has(key) {
    const entry = this.store.get(key);
    return entry && !entry.isExpired();
  }
  
  // Clear all cache entries
  async clear() {
    const size = this.store.size;
    this.store.clear();
    logger.info('Cache cleared', { entriesRemoved: size });
    return size;
  }
  
  // Get or set pattern
  async getOrSet(key, factory, ttl = null) {
    let value = await this.get(key);
    
    if (value === null) {
      logger.debug('Cache miss, executing factory', { key });
      value = await factory();
      await this.set(key, value, ttl);
    }
    
    return value;
  }
  
  // Evict least recently used entry
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.store.delete(oldestKey);
      this.metrics.evictions++;
      logger.debug('LRU eviction', { key: oldestKey, age: Date.now() - oldestTime });
    }
  }
  
  // Clean up expired entries
  cleanup() {
    const before = this.store.size;
    let cleaned = 0;
    
    for (const [key, entry] of this.store.entries()) {
      if (entry.isExpired()) {
        this.store.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.metrics.evictions += cleaned;
      logger.debug('Cache cleanup', { 
        cleaned, 
        before, 
        after: this.store.size 
      });
    }
  }
  
  // Get cache statistics
  getStats() {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;
    
    return {
      ...this.metrics,
      totalRequests,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.store.size,
      maxSize: this.config.maxSize,
      utilizationRate: Math.round((this.store.size / this.config.maxSize) * 100),
      timestamp: Date.now()
    };
  }
  
  // Get cache entries info
  getEntriesInfo() {
    const entries = [];
    
    for (const [key, entry] of this.store.entries()) {
      entries.push({
        key,
        createdAt: entry.createdAt,
        expiresAt: entry.expiresAt,
        lastAccessed: entry.lastAccessed,
        accessCount: entry.accessCount,
        remainingTTL: entry.getRemainingTTL(),
        isExpired: entry.isExpired(),
        valueType: typeof entry.value,
        valueSize: JSON.stringify(entry.value).length
      });
    }
    
    return entries.sort((a, b) => b.lastAccessed - a.lastAccessed);
  }
  
  // Destroy cache and cleanup
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.store.clear();
    logger.info('Cache destroyed');
  }
}

// Global cache instance
const globalCache = new Cache();

// Convenience functions using global cache
export const get = (key) => globalCache.get(key);
export const set = (key, value, ttl) => globalCache.set(key, value, ttl);
export const del = (key) => globalCache.delete(key);
export const has = (key) => globalCache.has(key);
export const clear = () => globalCache.clear();
export const getOrSet = (key, factory, ttl) => globalCache.getOrSet(key, factory, ttl);
export const getStats = () => globalCache.getStats();
export const getEntriesInfo = () => globalCache.getEntriesInfo();

// Cache decorators for functions
export const memoize = (fn, options = {}) => {
  const cache = new Cache(options);
  const keyGenerator = options.keyGenerator || ((...args) => JSON.stringify(args));
  
  return async function(...args) {
    const key = keyGenerator(...args);
    
    return cache.getOrSet(key, async () => {
      return await fn.apply(this, args);
    }, options.ttl);
  };
};

// Cache middleware for API routes
export const cacheMiddleware = (options = {}) => {
  const cache = new Cache(options);
  const keyGenerator = options.keyGenerator || ((req) => `${req.method}:${req.url}`);
  
  return async (req, res, next) => {
    // Only cache GET requests by default
    if (req.method !== 'GET' && !options.cacheAllMethods) {
      return next();
    }
    
    const key = keyGenerator(req);
    const cached = await cache.get(key);
    
    if (cached) {
      logger.debug('Serving cached response', { key });
      return res.json(cached);
    }
    
    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, data, options.ttl);
      }
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Specialized caches for different data types
export const createUserCache = () => new Cache({
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  maxSize: 500
});

export const createTimesheetCache = () => new Cache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000
});

export const createReportCache = () => new Cache({
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  maxSize: 200
});

// Cache warming utilities
export const warmCache = async (keys, factory, options = {}) => {
  const cache = options.cache || globalCache;
  const results = [];
  
  logger.info('Starting cache warming', { keyCount: keys.length });
  
  for (const key of keys) {
    try {
      const value = await factory(key);
      await cache.set(key, value, options.ttl);
      results.push({ key, success: true });
    } catch (error) {
      logger.error('Cache warming failed for key', { key, error: error.message });
      results.push({ key, success: false, error: error.message });
    }
  }
  
  const successful = results.filter(r => r.success).length;
  logger.info('Cache warming completed', { 
    total: keys.length, 
    successful, 
    failed: keys.length - successful 
  });
  
  return results;
};

// Cache health check
export const cacheHealthCheck = () => {
  const stats = getStats();
  const issues = [];
  
  // Check hit rate
  if (stats.hitRate < 50 && stats.totalRequests > 100) {
    issues.push(`Low cache hit rate: ${stats.hitRate}%`);
  }
  
  // Check utilization
  if (stats.utilizationRate > 90) {
    issues.push(`High cache utilization: ${stats.utilizationRate}%`);
  }
  
  // Check for excessive evictions
  if (stats.evictions > stats.sets * 0.5) {
    issues.push(`High eviction rate: ${stats.evictions} evictions vs ${stats.sets} sets`);
  }
  
  return {
    status: issues.length === 0 ? 'healthy' : 'degraded',
    issues,
    stats,
    timestamp: Date.now()
  };
};

// Export the Cache class and global instance
export { globalCache };
export default globalCache;