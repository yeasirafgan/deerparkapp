// utils/security.js

import { logger } from './logger';
import { AuthenticationError, AuthorizationError } from './errorHandler';

/**
 * Security utilities for rate limiting, input sanitization, and protection
 */

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map();
const securityEventStore = new Map();

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per window
    message: 'Too many requests, please try again later'
  },
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 auth attempts per window
    message: 'Too many authentication attempts, please try again later'
  },
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 sensitive operations per hour
    message: 'Rate limit exceeded for sensitive operations'
  }
};

// Clean up expired entries from rate limit store
const cleanupRateLimitStore = () => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

// Rate limiting middleware
export const rateLimit = (type = 'api') => {
  return (req, res, next) => {
    const config = RATE_LIMIT_CONFIG[type] || RATE_LIMIT_CONFIG.api;
    const identifier = getClientIdentifier(req);
    const key = `${type}:${identifier}`;
    const now = Date.now();
    
    // Clean up expired entries periodically
    if (Math.random() < 0.1) { // 10% chance
      cleanupRateLimitStore();
    }
    
    let rateLimitData = rateLimitStore.get(key);
    
    if (!rateLimitData || now > rateLimitData.resetTime) {
      // Initialize or reset the rate limit data
      rateLimitData = {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now
      };
    } else {
      rateLimitData.count++;
    }
    
    rateLimitStore.set(key, rateLimitData);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - rateLimitData.count));
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitData.resetTime).toISOString());
    
    if (rateLimitData.count > config.maxRequests) {
      logger.security('Rate limit exceeded', {
        type,
        identifier,
        count: rateLimitData.count,
        limit: config.maxRequests,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent']
      });
      
      return res.status(429).json({
        success: false,
        error: {
          message: config.message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000)
        }
      });
    }
    
    next();
  };
};

// Get client identifier for rate limiting
const getClientIdentifier = (req) => {
  // Use user ID if authenticated, otherwise use IP
  return req.user?.id || getClientIP(req);
};

// Get client IP address
export const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
};

// Input sanitization
export const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input
      .replace(/[<>"'&]/g, (match) => {
        const entities = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match];
      })
      .trim();
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};

// SQL injection prevention (for raw queries)
export const escapeSqlString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\%]/g, (char) => {
    switch (char) {
      case '\0': return '\\0';
      case '\x08': return '\\b';
      case '\x09': return '\\t';
      case '\x1a': return '\\z';
      case '\n': return '\\n';
      case '\r': return '\\r';
      case '"':
      case "'":
      case '\\':
      case '%': return '\\' + char;
      default: return char;
    }
  });
};

// NoSQL injection prevention
export const sanitizeMongoQuery = (query) => {
  if (typeof query === 'string') {
    // Remove potential NoSQL operators
    return query.replace(/\$[a-zA-Z]+/g, '');
  }
  
  if (typeof query === 'object' && query !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(query)) {
      // Skip keys that start with $ (MongoDB operators)
      if (!key.startsWith('$')) {
        sanitized[key] = sanitizeMongoQuery(value);
      }
    }
    return sanitized;
  }
  
  return query;
};

// CSRF token generation and validation
const csrfTokens = new Map();

export const generateCSRFToken = (sessionId) => {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
  
  csrfTokens.set(sessionId, { token, expiresAt });
  
  // Clean up expired tokens
  setTimeout(() => {
    const tokenData = csrfTokens.get(sessionId);
    if (tokenData && Date.now() > tokenData.expiresAt) {
      csrfTokens.delete(sessionId);
    }
  }, 60 * 60 * 1000);
  
  return token;
};

export const validateCSRFToken = (sessionId, token) => {
  const tokenData = csrfTokens.get(sessionId);
  
  if (!tokenData) {
    return false;
  }
  
  if (Date.now() > tokenData.expiresAt) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  return tokenData.token === token;
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict transport security (HTTPS only)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self';"
  );
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

// Suspicious activity detection
export const detectSuspiciousActivity = (req, activity) => {
  const identifier = getClientIdentifier(req);
  const key = `suspicious:${identifier}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour window
  
  let activityData = securityEventStore.get(key) || {
    events: [],
    resetTime: now + windowMs
  };
  
  // Clean old events
  if (now > activityData.resetTime) {
    activityData = {
      events: [],
      resetTime: now + windowMs
    };
  }
  
  // Add new event
  activityData.events.push({
    activity,
    timestamp: now,
    ip: getClientIP(req),
    userAgent: req.headers['user-agent']
  });
  
  securityEventStore.set(key, activityData);
  
  // Check for suspicious patterns
  const recentEvents = activityData.events.filter(event => 
    now - event.timestamp < 15 * 60 * 1000 // Last 15 minutes
  );
  
  const suspiciousThresholds = {
    'failed_login': 5,
    'invalid_token': 10,
    'permission_denied': 15,
    'malformed_request': 20
  };
  
  const eventCount = recentEvents.filter(event => event.activity === activity).length;
  const threshold = suspiciousThresholds[activity] || 10;
  
  if (eventCount >= threshold) {
    logger.security('Suspicious activity detected', {
      activity,
      count: eventCount,
      threshold,
      identifier,
      ip: getClientIP(req),
      recentEvents: recentEvents.slice(-5) // Last 5 events
    });
    
    return true;
  }
  
  return false;
};

// Password strength validation
export const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const issues = [];
  
  if (password.length < minLength) {
    issues.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (!hasUpperCase) {
    issues.push('Password must contain at least one uppercase letter');
  }
  
  if (!hasLowerCase) {
    issues.push('Password must contain at least one lowercase letter');
  }
  
  if (!hasNumbers) {
    issues.push('Password must contain at least one number');
  }
  
  if (!hasSpecialChar) {
    issues.push('Password must contain at least one special character');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    score: [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar, password.length >= minLength]
      .filter(Boolean).length
  };
};

// Environment-specific security configuration
export const getSecurityConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    isProduction,
    enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
    enableCSRF: isProduction,
    enableSecurityHeaders: isProduction,
    logLevel: isProduction ? 'warn' : 'debug',
    sessionTimeout: isProduction ? 30 * 60 * 1000 : 60 * 60 * 1000, // 30 min prod, 1 hour dev
  };
};

// Export rate limit configurations for external use
export { RATE_LIMIT_CONFIG };