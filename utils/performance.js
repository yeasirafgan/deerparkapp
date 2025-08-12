// utils/performance.js

import { logger } from './logger';

/**
 * Comprehensive performance monitoring and optimization utilities
 */

// Performance metrics storage
const performanceMetrics = {
  apiRequests: new Map(),
  dbOperations: new Map(),
  cacheHits: new Map(),
  errors: new Map()
};

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  api: {
    fast: 100,
    acceptable: 500,
    slow: 1000
  },
  database: {
    fast: 50,
    acceptable: 200,
    slow: 500
  },
  cache: {
    fast: 10,
    acceptable: 50,
    slow: 100
  }
};

// Performance timer class
class PerformanceTimer {
  constructor(operation, category = 'general') {
    this.operation = operation;
    this.category = category;
    this.startTime = Date.now();
    this.startMemory = typeof process !== 'undefined' ? process.memoryUsage() : null;
  }
  
  end(context = {}) {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    let memoryDelta = null;
    if (this.startMemory && typeof process !== 'undefined') {
      const endMemory = process.memoryUsage();
      memoryDelta = {
        rss: endMemory.rss - this.startMemory.rss,
        heapUsed: endMemory.heapUsed - this.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - this.startMemory.heapTotal,
        external: endMemory.external - this.startMemory.external
      };
    }
    
    const metrics = {
      operation: this.operation,
      category: this.category,
      duration,
      memoryDelta,
      timestamp: endTime,
      ...context
    };
    
    // Store metrics
    this.storeMetrics(metrics);
    
    // Log if performance is concerning
    this.logPerformance(metrics);
    
    return metrics;
  }
  
  storeMetrics(metrics) {
    const key = `${this.category}:${this.operation}`;
    const categoryMetrics = performanceMetrics[this.category] || new Map();
    
    if (!performanceMetrics[this.category]) {
      performanceMetrics[this.category] = categoryMetrics;
    }
    
    let operationMetrics = categoryMetrics.get(key) || {
      count: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      recentDurations: [],
      errors: 0
    };
    
    operationMetrics.count++;
    operationMetrics.totalDuration += metrics.duration;
    operationMetrics.minDuration = Math.min(operationMetrics.minDuration, metrics.duration);
    operationMetrics.maxDuration = Math.max(operationMetrics.maxDuration, metrics.duration);
    
    // Keep only recent durations (last 100)
    operationMetrics.recentDurations.push(metrics.duration);
    if (operationMetrics.recentDurations.length > 100) {
      operationMetrics.recentDurations.shift();
    }
    
    if (metrics.error) {
      operationMetrics.errors++;
    }
    
    categoryMetrics.set(key, operationMetrics);
  }
  
  logPerformance(metrics) {
    const threshold = PERFORMANCE_THRESHOLDS[this.category] || PERFORMANCE_THRESHOLDS.api;
    
    if (metrics.duration > threshold.slow) {
      if (typeof logger !== 'undefined') {
        logger.warn('Slow operation detected', metrics);
      } else {
        console.warn('🐌 Slow operation detected:', metrics);
      }
    } else if (metrics.duration > threshold.acceptable) {
      if (typeof logger !== 'undefined') {
        logger.debug('Acceptable operation performance', metrics);
      }
    }
    
    // Log memory concerns
    if (metrics.memoryDelta && metrics.memoryDelta.heapUsed > 50 * 1024 * 1024) { // 50MB
      if (typeof logger !== 'undefined') {
        logger.warn('High memory usage detected', {
          operation: metrics.operation,
          memoryDelta: metrics.memoryDelta
        });
      } else {
        console.warn('💾 High memory usage detected:', metrics.operation);
      }
    }
  }
}

// Create a performance timer
export const createTimer = (operation, category = 'general') => {
  return new PerformanceTimer(operation, category);
};

// Measure async function performance
export const measureAsync = async (operation, fn, category = 'general', context = {}) => {
  const timer = createTimer(operation, category);
  
  try {
    const result = await fn();
    timer.end({ ...context, success: true });
    return result;
  } catch (error) {
    timer.end({ ...context, success: false, error: error.message });
    throw error;
  }
};

// Measure sync function performance
export const measureSync = (operation, fn, category = 'general', context = {}) => {
  const timer = createTimer(operation, category);
  
  try {
    const result = fn();
    timer.end({ ...context, success: true });
    return result;
  } catch (error) {
    timer.end({ ...context, success: false, error: error.message });
    throw error;
  }
};

// Database operation wrapper
export const measureDbOperation = async (operation, fn, context = {}) => {
  return measureAsync(operation, fn, 'dbOperations', context);
};

// Cache operation wrapper
export const measureCacheOperation = async (operation, fn, context = {}) => {
  return measureAsync(operation, fn, 'cache', context);
};

// Get performance statistics
export const getPerformanceStats = (category = null, operation = null) => {
  if (category && operation) {
    const categoryMetrics = performanceMetrics[category];
    if (!categoryMetrics) return null;
    
    const key = `${category}:${operation}`;
    const metrics = categoryMetrics.get(key);
    if (!metrics) return null;
    
    return {
      ...metrics,
      avgDuration: metrics.totalDuration / metrics.count,
      recentAvgDuration: metrics.recentDurations.reduce((a, b) => a + b, 0) / metrics.recentDurations.length,
      errorRate: metrics.errors / metrics.count
    };
  }
  
  if (category) {
    const categoryMetrics = performanceMetrics[category];
    if (!categoryMetrics) return {};
    
    const stats = {};
    for (const [key, metrics] of categoryMetrics.entries()) {
      const operation = key.split(':')[1];
      stats[operation] = {
        ...metrics,
        avgDuration: metrics.totalDuration / metrics.count,
        recentAvgDuration: metrics.recentDurations.reduce((a, b) => a + b, 0) / metrics.recentDurations.length,
        errorRate: metrics.errors / metrics.count
      };
    }
    return stats;
  }
  
  // Return all categories
  const allStats = {};
  for (const [categoryName, categoryMetrics] of Object.entries(performanceMetrics)) {
    allStats[categoryName] = {};
    for (const [key, metrics] of categoryMetrics.entries()) {
      const operation = key.split(':')[1];
      allStats[categoryName][operation] = {
        ...metrics,
        avgDuration: metrics.totalDuration / metrics.count,
        recentAvgDuration: metrics.recentDurations.reduce((a, b) => a + b, 0) / metrics.recentDurations.length,
        errorRate: metrics.errors / metrics.count
      };
    }
  }
  return allStats;
};

// Get system performance metrics
export const getSystemMetrics = () => {
  if (typeof process === 'undefined') {
    return { error: 'System metrics not available in browser environment' };
  }
  
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    memory: {
      rss: memoryUsage.rss,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024)
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    uptime: process.uptime(),
    timestamp: Date.now()
  };
};

// Export performance thresholds for external use
export { PERFORMANCE_THRESHOLDS };

/**
 * Legacy performance monitoring utilities (preserved for compatibility)
 */

// Database query performance tracker (enhanced)
export const trackQueryPerformance = (queryName) => {
  const timer = createTimer(queryName, 'dbOperations');
  
  return {
    end: () => {
      const metrics = timer.end();
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Query [${queryName}] took ${metrics.duration.toFixed(2)}ms`);
      }
      return metrics.duration;
    }
  };
};

// Component render performance tracker
export const trackRenderPerformance = (componentName) => {
  const start = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - start;
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚛️ Component [${componentName}] rendered in ${duration.toFixed(2)}ms`);
      }
      return duration;
    }
  };
};

// Memory usage tracker
export const trackMemoryUsage = (label) => {
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = performance.memory;
    console.log(`💾 Memory [${label}]:`, {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
    });
  }
};

// API response time tracker (enhanced)
export const trackApiPerformance = async (apiCall, apiName) => {
  try {
    const { result } = await measureAsync(apiName, async () => {
      return { result: await apiCall() };
    }, 'apiRequests');
    
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ API [${apiName}] failed:`, error.message);
    }
    throw error;
  }
};

// API request performance middleware
export const performanceMiddleware = (req, res, next) => {
  const timer = createTimer(`${req.method} ${req.route?.path || req.url}`, 'apiRequests');
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    timer.end({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      contentLength: res.get('content-length') || 0
    });
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// Performance health check
export const performanceHealthCheck = () => {
  const systemMetrics = getSystemMetrics();
  const performanceStats = getPerformanceStats();
  
  const issues = [];
  
  // Check memory usage (only if system metrics available)
  if (systemMetrics.memory && systemMetrics.memory.heapUsedMB > 500) {
    issues.push(`High memory usage: ${systemMetrics.memory.heapUsedMB}MB`);
  }
  
  // Check API performance
  const apiStats = performanceStats.apiRequests || {};
  for (const [operation, stats] of Object.entries(apiStats)) {
    if (stats.recentAvgDuration > PERFORMANCE_THRESHOLDS.api.slow) {
      issues.push(`Slow API operation: ${operation} (${Math.round(stats.recentAvgDuration)}ms avg)`);
    }
    if (stats.errorRate > 0.1) {
      issues.push(`High error rate: ${operation} (${Math.round(stats.errorRate * 100)}%)`);
    }
  }
  
  // Check database performance
  const dbStats = performanceStats.dbOperations || {};
  for (const [operation, stats] of Object.entries(dbStats)) {
    if (stats.recentAvgDuration > PERFORMANCE_THRESHOLDS.database.slow) {
      issues.push(`Slow DB operation: ${operation} (${Math.round(stats.recentAvgDuration)}ms avg)`);
    }
  }
  
  return {
    status: issues.length === 0 ? 'healthy' : 'degraded',
    issues,
    systemMetrics,
    timestamp: Date.now()
  };
};

// Bundle size analyzer (client-side only)
export const analyzeBundleSize = () => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const totalSize = scripts.reduce((acc, script) => {
      // This is an approximation - actual bundle analysis would require build tools
      return acc + (script.src.length * 100); // Rough estimate
    }, 0);
    
    console.log(`📦 Estimated bundle size: ${(totalSize / 1024).toFixed(2)} KB`);
  }
};

// Performance observer for Core Web Vitals
export const observeWebVitals = () => {
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('🎯 LCP:', lastEntry.startTime.toFixed(2) + 'ms');
    });
    
    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        console.log('⚡ FID:', entry.processingStart - entry.startTime + 'ms');
      });
    });
    
    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          console.log('📐 CLS:', entry.value);
        }
      });
    });
    
    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      fidObserver.observe({ entryTypes: ['first-input'] });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
  }
};

// Debounce utility for performance optimization
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle utility for performance optimization
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};