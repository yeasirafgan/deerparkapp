// utils/middleware.js

import { logger } from './logger';
import { validateInput, sanitizeString } from './validation';
import { handleApiError, wrapAsync } from './errorHandler';
import { rateLimitMiddleware, securityHeaders, detectSuspiciousActivity } from './security';
import { performanceMiddleware } from './performance';
import { cacheMiddleware } from './cache';
import { healthCheckMiddleware } from './healthCheck';

/**
 * Comprehensive middleware utilities for API routes
 */

// Request context object
class RequestContext {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.startTime = Date.now();
    this.requestId = this.generateRequestId();
    this.user = null;
    this.metadata = {};
  }
  
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  setUser(user) {
    this.user = user;
  }
  
  setMetadata(key, value) {
    this.metadata[key] = value;
  }
  
  getMetadata(key) {
    return this.metadata[key];
  }
  
  getDuration() {
    return Date.now() - this.startTime;
  }
}

// Middleware registry
const middlewareRegistry = new Map();

// Register middleware
export const registerMiddleware = (name, middleware, options = {}) => {
  middlewareRegistry.set(name, {
    middleware,
    enabled: options.enabled !== false,
    priority: options.priority || 0,
    conditions: options.conditions || []
  });
  
  logger.debug('Middleware registered', { name, priority: options.priority });
};

// Unregister middleware
export const unregisterMiddleware = (name) => {
  const removed = middlewareRegistry.delete(name);
  if (removed) {
    logger.debug('Middleware unregistered', { name });
  }
  return removed;
};

// Core middleware functions

// Request logging middleware
export const requestLoggingMiddleware = (req, res, next) => {
  const context = new RequestContext(req, res);
  req.context = context;
  
  // Log incoming request
  logger.logApiRequest({
    requestId: context.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString()
  });
  
  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(data) {
    const duration = context.getDuration();
    
    logger.logApiResponse({
      requestId: context.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      responseSize: JSON.stringify(data).length,
      timestamp: new Date().toISOString()
    });
    
    return originalJson.call(this, data);
  };
  
  // Override res.status to capture status changes
  const originalStatus = res.status;
  res.status = function(code) {
    context.setMetadata('statusCode', code);
    return originalStatus.call(this, code);
  };
  
  next();
};

// CORS middleware
export const corsMiddleware = (options = {}) => {
  const defaultOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
  };
  
  const config = { ...defaultOptions, ...options };
  
  return (req, res, next) => {
    const origin = req.headers.origin;
    
    // Check if origin is allowed
    if (config.origin === '*' || config.origin.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', config.methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Allow-Credentials', config.credentials);
    res.setHeader('Access-Control-Max-Age', config.maxAge);
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    next();
  };
};

// Request validation middleware
export const validationMiddleware = (schema) => {
  return (req, res, next) => {
    try {
      // Validate request body
      if (schema.body && req.body) {
        const validation = validateInput(req.body, schema.body);
        if (!validation.isValid) {
          return res.status(400).json({
            error: 'Validation failed',
            details: validation.errors
          });
        }
      }
      
      // Validate query parameters
      if (schema.query && req.query) {
        const validation = validateInput(req.query, schema.query);
        if (!validation.isValid) {
          return res.status(400).json({
            error: 'Query validation failed',
            details: validation.errors
          });
        }
      }
      
      // Validate URL parameters
      if (schema.params && req.params) {
        const validation = validateInput(req.params, schema.params);
        if (!validation.isValid) {
          return res.status(400).json({
            error: 'Parameter validation failed',
            details: validation.errors
          });
        }
      }
      
      next();
    } catch (error) {
      logger.error('Validation middleware error', {
        error: error.message,
        requestId: req.context?.requestId
      });
      
      res.status(500).json({
        error: 'Internal validation error'
      });
    }
  };
};

// Input sanitization middleware
export const sanitizationMiddleware = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    next();
  } catch (error) {
    logger.error('Sanitization middleware error', {
      error: error.message,
      requestId: req.context?.requestId
    });
    
    res.status(500).json({
      error: 'Input sanitization failed'
    });
  }
};

// Helper function to sanitize objects
const sanitizeObject = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(item => 
      typeof item === 'object' ? sanitizeObject(item) : 
      typeof item === 'string' ? sanitizeString(item) : item
    );
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return obj;
};

// Authentication middleware
export const authenticationMiddleware = (options = {}) => {
  const { required = true, roles = [] } = options;
  
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        if (required) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        return next();
      }
      
      // Verify token (implement your token verification logic)
      const user = await verifyToken(token);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      // Check user roles if specified
      if (roles.length > 0 && !roles.includes(user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      req.context.setUser(user);
      req.user = user;
      
      next();
    } catch (error) {
      logger.error('Authentication middleware error', {
        error: error.message,
        requestId: req.context?.requestId
      });
      
      res.status(401).json({ error: 'Authentication failed' });
    }
  };
};

// Placeholder token verification function
const verifyToken = async (token) => {
  // Implement your token verification logic here
  // This could involve JWT verification, database lookup, etc.
  return null;
};

// Error handling middleware
export const errorHandlingMiddleware = (err, req, res, next) => {
  const requestId = req.context?.requestId;
  
  logger.error('Unhandled error in middleware', {
    error: err.message,
    stack: err.stack,
    requestId,
    method: req.method,
    url: req.url
  });
  
  // Use the error handler utility
  handleApiError(err, res, requestId);
};

// Response compression middleware
export const compressionMiddleware = (options = {}) => {
  const { threshold = 1024, level = 6 } = options;
  
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      const jsonString = JSON.stringify(data);
      
      // Only compress if response is large enough
      if (jsonString.length > threshold) {
        res.setHeader('Content-Encoding', 'gzip');
        // Implement compression logic here if needed
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Request timeout middleware
export const timeoutMiddleware = (timeout = 30000) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          requestId: req.context?.requestId,
          method: req.method,
          url: req.url,
          timeout
        });
        
        res.status(408).json({
          error: 'Request timeout',
          timeout
        });
      }
    }, timeout);
    
    // Clear timeout when response is sent
    const originalEnd = res.end;
    res.end = function(...args) {
      clearTimeout(timer);
      return originalEnd.apply(this, args);
    };
    
    next();
  };
};

// Request size limit middleware
export const requestSizeLimitMiddleware = (limit = '10mb') => {
  const limitBytes = typeof limit === 'string' ? parseSize(limit) : limit;
  
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > limitBytes) {
      logger.warn('Request size limit exceeded', {
        requestId: req.context?.requestId,
        contentLength,
        limit: limitBytes
      });
      
      return res.status(413).json({
        error: 'Request entity too large',
        limit: limit
      });
    }
    
    next();
  };
};

// Helper function to parse size strings
const parseSize = (size) => {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * units[unit]);
};

// Middleware composer
export const composeMiddleware = (...middlewares) => {
  return (req, res, next) => {
    let index = 0;
    
    const dispatch = (i) => {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'));
      }
      
      index = i;
      
      let fn = middlewares[i];
      
      if (i === middlewares.length) {
        fn = next;
      }
      
      if (!fn) {
        return Promise.resolve();
      }
      
      try {
        return Promise.resolve(fn(req, res, () => dispatch(i + 1)));
      } catch (err) {
        return Promise.reject(err);
      }
    };
    
    return dispatch(0);
  };
};

// Conditional middleware
export const conditionalMiddleware = (condition, middleware) => {
  return (req, res, next) => {
    if (typeof condition === 'function' ? condition(req, res) : condition) {
      return middleware(req, res, next);
    }
    next();
  };
};

// Route-specific middleware
export const routeMiddleware = (routes) => {
  return (req, res, next) => {
    const route = routes[req.path] || routes[req.method + ' ' + req.path];
    
    if (route) {
      return composeMiddleware(...route)(req, res, next);
    }
    
    next();
  };
};

// Built-in middleware stack
export const createDefaultMiddlewareStack = (options = {}) => {
  const stack = [];
  
  // Request context and logging
  stack.push(requestLoggingMiddleware);
  
  // Security headers
  if (options.security !== false) {
    stack.push(securityHeaders());
  }
  
  // CORS
  if (options.cors !== false) {
    stack.push(corsMiddleware(options.cors));
  }
  
  // Request timeout
  if (options.timeout !== false) {
    stack.push(timeoutMiddleware(options.timeout));
  }
  
  // Request size limit
  if (options.requestSizeLimit !== false) {
    stack.push(requestSizeLimitMiddleware(options.requestSizeLimit));
  }
  
  // Rate limiting
  if (options.rateLimit !== false) {
    stack.push(rateLimitMiddleware(options.rateLimit));
  }
  
  // Input sanitization
  if (options.sanitization !== false) {
    stack.push(sanitizationMiddleware);
  }
  
  // Performance monitoring
  if (options.performance !== false) {
    stack.push(performanceMiddleware);
  }
  
  // Health checks
  if (options.healthCheck !== false) {
    stack.push(healthCheckMiddleware);
  }
  
  // Suspicious activity detection
  if (options.suspiciousActivity !== false) {
    stack.push(detectSuspiciousActivity());
  }
  
  return composeMiddleware(...stack);
};

// Middleware for API routes
export const apiMiddleware = (options = {}) => {
  return wrapAsync(async (req, res, next) => {
    const middleware = createDefaultMiddlewareStack(options);
    return middleware(req, res, next);
  });
};

// Export middleware registry
export { middlewareRegistry, RequestContext };

// Register built-in middlewares
registerMiddleware('logging', requestLoggingMiddleware, { priority: 100 });
registerMiddleware('cors', corsMiddleware(), { priority: 90 });
registerMiddleware('sanitization', sanitizationMiddleware, { priority: 80 });
registerMiddleware('performance', performanceMiddleware, { priority: 70 });
registerMiddleware('health', healthCheckMiddleware, { priority: 60 });
registerMiddleware('error', errorHandlingMiddleware, { priority: 10 });