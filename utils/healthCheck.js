// utils/healthCheck.js

import { logger } from './logger';
import { getConnectionStatus, healthCheck as dbHealthCheck } from './dbConnection';
import { getSystemMetrics, performanceHealthCheck } from './performance';
import { cacheHealthCheck } from './cache';

/**
 * Comprehensive health monitoring and diagnostics
 */

// Health check registry
const healthChecks = new Map();

// Health status levels
export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown'
};

// Base health check class
class HealthCheck {
  constructor(name, checkFunction, options = {}) {
    this.name = name;
    this.checkFunction = checkFunction;
    this.timeout = options.timeout || 5000; // 5 seconds default
    this.critical = options.critical || false;
    this.interval = options.interval || 60000; // 1 minute default
    this.lastCheck = null;
    this.lastResult = null;
    this.enabled = options.enabled !== false;
  }
  
  async execute() {
    if (!this.enabled) {
      return {
        name: this.name,
        status: HEALTH_STATUS.UNKNOWN,
        message: 'Health check disabled',
        timestamp: Date.now(),
        duration: 0
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Execute with timeout
      const result = await Promise.race([
        this.checkFunction(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), this.timeout)
        )
      ]);
      
      const duration = Date.now() - startTime;
      
      const healthResult = {
        name: this.name,
        status: result.status || HEALTH_STATUS.HEALTHY,
        message: result.message || 'OK',
        details: result.details || {},
        timestamp: Date.now(),
        duration,
        critical: this.critical
      };
      
      this.lastCheck = Date.now();
      this.lastResult = healthResult;
      
      return healthResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const healthResult = {
        name: this.name,
        status: HEALTH_STATUS.UNHEALTHY,
        message: error.message,
        error: error.stack,
        timestamp: Date.now(),
        duration,
        critical: this.critical
      };
      
      this.lastCheck = Date.now();
      this.lastResult = healthResult;
      
      logger.error('Health check failed', {
        name: this.name,
        error: error.message,
        duration
      });
      
      return healthResult;
    }
  }
  
  isStale() {
    if (!this.lastCheck) return true;
    return Date.now() - this.lastCheck > this.interval * 2;
  }
}

// Register a health check
export const registerHealthCheck = (name, checkFunction, options = {}) => {
  const healthCheck = new HealthCheck(name, checkFunction, options);
  healthChecks.set(name, healthCheck);
  
  logger.info('Health check registered', { 
    name, 
    critical: healthCheck.critical,
    timeout: healthCheck.timeout
  });
  
  return healthCheck;
};

// Unregister a health check
export const unregisterHealthCheck = (name) => {
  const removed = healthChecks.delete(name);
  if (removed) {
    logger.info('Health check unregistered', { name });
  }
  return removed;
};

// Execute all health checks
export const executeAllHealthChecks = async () => {
  const results = [];
  const promises = [];
  
  for (const [name, healthCheck] of healthChecks.entries()) {
    promises.push(
      healthCheck.execute().catch(error => ({
        name,
        status: HEALTH_STATUS.UNHEALTHY,
        message: `Health check execution failed: ${error.message}`,
        timestamp: Date.now(),
        duration: 0,
        critical: healthCheck.critical
      }))
    );
  }
  
  const checkResults = await Promise.all(promises);
  results.push(...checkResults);
  
  return results;
};

// Get overall health status
export const getOverallHealth = async () => {
  const startTime = Date.now();
  const results = await executeAllHealthChecks();
  const duration = Date.now() - startTime;
  
  // Determine overall status
  let overallStatus = HEALTH_STATUS.HEALTHY;
  const criticalIssues = [];
  const warnings = [];
  
  for (const result of results) {
    if (result.status === HEALTH_STATUS.UNHEALTHY) {
      if (result.critical) {
        overallStatus = HEALTH_STATUS.UNHEALTHY;
        criticalIssues.push(result);
      } else {
        if (overallStatus === HEALTH_STATUS.HEALTHY) {
          overallStatus = HEALTH_STATUS.DEGRADED;
        }
        warnings.push(result);
      }
    } else if (result.status === HEALTH_STATUS.DEGRADED) {
      if (overallStatus === HEALTH_STATUS.HEALTHY) {
        overallStatus = HEALTH_STATUS.DEGRADED;
      }
      warnings.push(result);
    }
  }
  
  const summary = {
    status: overallStatus,
    timestamp: Date.now(),
    duration,
    checks: {
      total: results.length,
      healthy: results.filter(r => r.status === HEALTH_STATUS.HEALTHY).length,
      degraded: results.filter(r => r.status === HEALTH_STATUS.DEGRADED).length,
      unhealthy: results.filter(r => r.status === HEALTH_STATUS.UNHEALTHY).length,
      unknown: results.filter(r => r.status === HEALTH_STATUS.UNKNOWN).length
    },
    issues: {
      critical: criticalIssues.length,
      warnings: warnings.length
    },
    results
  };
  
  // Log overall health status
  if (overallStatus === HEALTH_STATUS.UNHEALTHY) {
    logger.error('System health check failed', summary);
  } else if (overallStatus === HEALTH_STATUS.DEGRADED) {
    logger.warn('System health degraded', summary);
  } else {
    logger.debug('System health check passed', summary);
  }
  
  return summary;
};

// Built-in health checks

// Database health check
registerHealthCheck('database', async () => {
  try {
    const dbHealth = await dbHealthCheck();
    const connectionStatus = getConnectionStatus();
    
    if (dbHealth.status === 'healthy') {
      return {
        status: HEALTH_STATUS.HEALTHY,
        message: 'Database connection healthy',
        details: {
          ...dbHealth,
          ...connectionStatus
        }
      };
    } else {
      return {
        status: HEALTH_STATUS.UNHEALTHY,
        message: 'Database connection unhealthy',
        details: dbHealth
      };
    }
  } catch (error) {
    return {
      status: HEALTH_STATUS.UNHEALTHY,
      message: `Database health check failed: ${error.message}`
    };
  }
}, { critical: true, timeout: 10000 });

// System resources health check
registerHealthCheck('system', async () => {
  try {
    const metrics = getSystemMetrics();
    const issues = [];
    
    // Check memory usage
    if (metrics.memory && metrics.memory.heapUsedMB > 1000) {
      issues.push(`High memory usage: ${metrics.memory.heapUsedMB}MB`);
    }
    
    // Check uptime
    if (metrics.uptime < 60) {
      issues.push('System recently restarted');
    }
    
    const status = issues.length === 0 ? HEALTH_STATUS.HEALTHY : 
                  issues.some(issue => issue.includes('High memory')) ? HEALTH_STATUS.DEGRADED : HEALTH_STATUS.HEALTHY;
    
    return {
      status,
      message: issues.length === 0 ? 'System resources healthy' : issues.join(', '),
      details: metrics
    };
  } catch (error) {
    return {
      status: HEALTH_STATUS.UNHEALTHY,
      message: `System health check failed: ${error.message}`
    };
  }
}, { critical: false });

// Performance health check
registerHealthCheck('performance', async () => {
  try {
    const perfHealth = performanceHealthCheck();
    
    return {
      status: perfHealth.status === 'healthy' ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.DEGRADED,
      message: perfHealth.issues.length === 0 ? 'Performance healthy' : perfHealth.issues.join(', '),
      details: perfHealth
    };
  } catch (error) {
    return {
      status: HEALTH_STATUS.DEGRADED,
      message: `Performance health check failed: ${error.message}`
    };
  }
}, { critical: false });

// Cache health check
registerHealthCheck('cache', async () => {
  try {
    const cacheHealth = cacheHealthCheck();
    
    return {
      status: cacheHealth.status === 'healthy' ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.DEGRADED,
      message: cacheHealth.issues.length === 0 ? 'Cache healthy' : cacheHealth.issues.join(', '),
      details: cacheHealth
    };
  } catch (error) {
    return {
      status: HEALTH_STATUS.DEGRADED,
      message: `Cache health check failed: ${error.message}`
    };
  }
}, { critical: false });

// Environment health check
registerHealthCheck('environment', async () => {
  const issues = [];
  const requiredEnvVars = ['MONGODB_URI', 'NEXTAUTH_SECRET'];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      issues.push(`Missing environment variable: ${envVar}`);
    }
  }
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 16) {
    issues.push(`Node.js version ${nodeVersion} is outdated (minimum: 16.x)`);
  }
  
  return {
    status: issues.length === 0 ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNHEALTHY,
    message: issues.length === 0 ? 'Environment configuration healthy' : issues.join(', '),
    details: {
      nodeVersion,
      platform: process.platform,
      arch: process.arch,
      env: process.env.NODE_ENV
    }
  };
}, { critical: true });

// Health check middleware for API routes
export const healthCheckMiddleware = (req, res, next) => {
  if (req.path === '/health' || req.path === '/api/health') {
    return getOverallHealth()
      .then(health => {
        const statusCode = health.status === HEALTH_STATUS.HEALTHY ? 200 :
                          health.status === HEALTH_STATUS.DEGRADED ? 200 : 503;
        
        res.status(statusCode).json(health);
      })
      .catch(error => {
        logger.error('Health check middleware error', { error: error.message });
        res.status(500).json({
          status: HEALTH_STATUS.UNHEALTHY,
          message: 'Health check failed',
          error: error.message,
          timestamp: Date.now()
        });
      });
  }
  
  next();
};

// Readiness check (for Kubernetes/Docker)
export const readinessCheck = async () => {
  const criticalChecks = ['database', 'environment'];
  const results = [];
  
  for (const checkName of criticalChecks) {
    const healthCheck = healthChecks.get(checkName);
    if (healthCheck) {
      const result = await healthCheck.execute();
      results.push(result);
      
      if (result.status === HEALTH_STATUS.UNHEALTHY) {
        return {
          ready: false,
          message: `Critical service not ready: ${checkName}`,
          details: results
        };
      }
    }
  }
  
  return {
    ready: true,
    message: 'All critical services ready',
    details: results
  };
};

// Liveness check (for Kubernetes/Docker)
export const livenessCheck = async () => {
  try {
    // Simple check to ensure the application is responsive
    const startTime = Date.now();
    
    // Perform a lightweight operation
    await new Promise(resolve => setTimeout(resolve, 1));
    
    const duration = Date.now() - startTime;
    
    return {
      alive: true,
      message: 'Application is responsive',
      duration,
      timestamp: Date.now()
    };
  } catch (error) {
    return {
      alive: false,
      message: 'Application is not responsive',
      error: error.message,
      timestamp: Date.now()
    };
  }
};

// Get health check status for specific check
export const getHealthCheckStatus = (name) => {
  const healthCheck = healthChecks.get(name);
  if (!healthCheck) {
    return null;
  }
  
  return {
    name,
    enabled: healthCheck.enabled,
    critical: healthCheck.critical,
    lastCheck: healthCheck.lastCheck,
    lastResult: healthCheck.lastResult,
    isStale: healthCheck.isStale(),
    interval: healthCheck.interval,
    timeout: healthCheck.timeout
  };
};

// Get all registered health checks info
export const getHealthChecksInfo = () => {
  const info = [];
  
  for (const [name, healthCheck] of healthChecks.entries()) {
    info.push(getHealthCheckStatus(name));
  }
  
  return info;
};

// Enable/disable health check
export const setHealthCheckEnabled = (name, enabled) => {
  const healthCheck = healthChecks.get(name);
  if (healthCheck) {
    healthCheck.enabled = enabled;
    logger.info('Health check status changed', { name, enabled });
    return true;
  }
  return false;
};

// Export health check registry for external access
export { healthChecks };