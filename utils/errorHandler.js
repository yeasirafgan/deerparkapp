// utils/errorHandler.js

/**
 * Enhanced error handling utilities for better debugging and user experience
 */

// Custom error classes for better error categorization
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class DatabaseError extends Error {
  constructor(message = 'Database operation failed') {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
  }
}

// Error logging utility
export const logError = (error, context = {}) => {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    name: error.name,
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode || 500,
    context
  };
  
  // Log to console (in production, this could be sent to a logging service)
  console.error('🚨 Error logged:', JSON.stringify(errorInfo, null, 2));
  
  return errorInfo;
};

// API error response handler
export const handleApiError = (error, req = null) => {
  const errorInfo = logError(error, { 
    url: req?.url, 
    method: req?.method,
    userAgent: req?.headers?.['user-agent']
  });
  
  // Determine status code
  let statusCode = 500;
  let message = 'Internal server error';
  
  if (error instanceof ValidationError) {
    statusCode = 400;
    message = error.message;
  } else if (error instanceof AuthenticationError) {
    statusCode = 401;
    message = error.message;
  } else if (error instanceof AuthorizationError) {
    statusCode = 403;
    message = error.message;
  } else if (error instanceof NotFoundError) {
    statusCode = 404;
    message = error.message;
  } else if (error instanceof DatabaseError) {
    statusCode = 500;
    message = 'Database operation failed';
  } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
    statusCode = 500;
    message = 'Database operation failed';
  } else if (error.statusCode) {
    statusCode = error.statusCode;
    message = error.message;
  }
  
  return {
    success: false,
    error: {
      message,
      code: error.name || 'UnknownError',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    },
    statusCode
  };
};

// Client-side error handler
export const handleClientError = (error, context = {}) => {
  logError(error, { ...context, side: 'client' });
  
  // Return user-friendly error message
  if (error.name === 'ValidationError') {
    return {
      success: false,
      message: error.message || 'Please check your input and try again.'
    };
  }
  
  if (error.name === 'NetworkError' || error.message.includes('fetch')) {
    return {
      success: false,
      message: 'Network error. Please check your connection and try again.'
    };
  }
  
  return {
    success: false,
    message: 'Something went wrong. Please try again.'
  };
};

// Async error wrapper for API routes
export const asyncHandler = (fn) => {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      const errorResponse = handleApiError(error, req);
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  };
};

// Validation helper
export const validateRequired = (data, requiredFields) => {
  const missing = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
};

// Date validation helper
export const validateDate = (dateString, fieldName = 'date') => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
  }
  return date;
};

// Email validation helper
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email');
  }
};

// Number validation helper
export const validateNumber = (value, fieldName, min = null, max = null) => {
  const num = parseFloat(value);
  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`, fieldName);
  }
  
  if (min !== null && num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName);
  }
  
  if (max !== null && num > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`, fieldName);
  }
  
  return num;
};

// Safe JSON parse
export const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logError(new Error('JSON parse failed'), { jsonString });
    return defaultValue;
  }
};