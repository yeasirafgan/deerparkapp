// utils/logger.js

/**
 * Comprehensive logging utility for better monitoring and debugging
 */

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Get current log level from environment
const getCurrentLogLevel = () => {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
  return LOG_LEVELS[envLevel] !== undefined ? LOG_LEVELS[envLevel] : LOG_LEVELS.INFO;
};

// Format timestamp
const formatTimestamp = () => {
  return new Date().toISOString();
};

// Format log message
const formatMessage = (level, message, context = {}) => {
  const timestamp = formatTimestamp();
  const logEntry = {
    timestamp,
    level,
    message,
    ...context
  };
  
  return JSON.stringify(logEntry, null, 2);
};

// Base logger function
const log = (level, levelName, message, context = {}) => {
  const currentLevel = getCurrentLogLevel();
  
  if (level <= currentLevel) {
    const formattedMessage = formatMessage(levelName, message, context);
    
    // Use appropriate console method based on level
    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(`🚨 ${formattedMessage}`);
        break;
      case LOG_LEVELS.WARN:
        console.warn(`⚠️ ${formattedMessage}`);
        break;
      case LOG_LEVELS.INFO:
        console.info(`ℹ️ ${formattedMessage}`);
        break;
      case LOG_LEVELS.DEBUG:
        console.debug(`🐛 ${formattedMessage}`);
        break;
      default:
        console.log(formattedMessage);
    }
  }
};

// Logger object with different methods
export const logger = {
  error: (message, context = {}) => {
    log(LOG_LEVELS.ERROR, 'ERROR', message, context);
  },
  
  warn: (message, context = {}) => {
    log(LOG_LEVELS.WARN, 'WARN', message, context);
  },
  
  info: (message, context = {}) => {
    log(LOG_LEVELS.INFO, 'INFO', message, context);
  },
  
  debug: (message, context = {}) => {
    log(LOG_LEVELS.DEBUG, 'DEBUG', message, context);
  },
  
  // API request logging
  apiRequest: (req, context = {}) => {
    const requestInfo = {
      method: req.method,
      url: req.url,
      userAgent: req.headers?.['user-agent'],
      ip: req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress,
      ...context
    };
    
    log(LOG_LEVELS.INFO, 'API_REQUEST', `${req.method} ${req.url}`, requestInfo);
  },
  
  // API response logging
  apiResponse: (req, statusCode, context = {}) => {
    const responseInfo = {
      method: req.method,
      url: req.url,
      statusCode,
      ...context
    };
    
    const level = statusCode >= 400 ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO;
    const levelName = statusCode >= 400 ? 'ERROR' : 'INFO';
    
    log(level, levelName, `${req.method} ${req.url} - ${statusCode}`, responseInfo);
  },
  
  // Database operation logging
  dbOperation: (operation, collection, context = {}) => {
    const dbInfo = {
      operation,
      collection,
      ...context
    };
    
    log(LOG_LEVELS.DEBUG, 'DB_OPERATION', `${operation} on ${collection}`, dbInfo);
  },
  
  // Authentication logging
  auth: (action, userId, context = {}) => {
    const authInfo = {
      action,
      userId,
      ...context
    };
    
    log(LOG_LEVELS.INFO, 'AUTH', `${action} for user ${userId}`, authInfo);
  },
  
  // Performance logging
  performance: (operation, duration, context = {}) => {
    const perfInfo = {
      operation,
      duration: `${duration}ms`,
      ...context
    };
    
    const level = duration > 1000 ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;
    const levelName = duration > 1000 ? 'WARN' : 'DEBUG';
    
    log(level, levelName, `${operation} took ${duration}ms`, perfInfo);
  },
  
  // Security logging
  security: (event, context = {}) => {
    const securityInfo = {
      event,
      timestamp: formatTimestamp(),
      ...context
    };
    
    log(LOG_LEVELS.WARN, 'SECURITY', event, securityInfo);
  }
};

// Performance measurement utility
export const measurePerformance = async (operation, fn, context = {}) => {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    logger.performance(operation, duration, { ...context, success: true });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.performance(operation, duration, { 
      ...context, 
      success: false, 
      error: error.message 
    });
    
    throw error;
  }
};

// Request timing middleware helper
export const createRequestTimer = () => {
  const startTime = Date.now();
  
  return {
    end: (req, statusCode) => {
      const duration = Date.now() - startTime;
      logger.apiResponse(req, statusCode, { duration: `${duration}ms` });
      return duration;
    }
  };
};

// Audit trail logging
export const auditLog = (action, userId, resourceType, resourceId, changes = {}) => {
  const auditInfo = {
    action,
    userId,
    resourceType,
    resourceId,
    changes,
    timestamp: formatTimestamp()
  };
  
  log(LOG_LEVELS.INFO, 'AUDIT', `${action} ${resourceType} ${resourceId}`, auditInfo);
};

// Error context helper
export const createErrorContext = (req, additionalContext = {}) => {
  return {
    url: req?.url,
    method: req?.method,
    userAgent: req?.headers?.['user-agent'],
    ip: req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress,
    timestamp: formatTimestamp(),
    ...additionalContext
  };
};

// Export log levels for external use
export { LOG_LEVELS };

// Default export
export default logger;