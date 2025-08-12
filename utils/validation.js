// utils/validation.js

import { ValidationError } from './errorHandler';

/**
 * Comprehensive input validation utilities
 */

// Sanitize string input to prevent XSS
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
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
};

// Validate timesheet entry
export const validateTimesheetEntry = (data) => {
  const errors = [];
  
  // Required fields
  if (!data.date) errors.push('Date is required');
  if (!data.startTime) errors.push('Start time is required');
  if (!data.endTime) errors.push('End time is required');
  if (!data.userId) errors.push('User ID is required');
  
  // Date validation
  if (data.date) {
    const date = new Date(data.date);
    if (isNaN(date.getTime())) {
      errors.push('Invalid date format');
    } else {
      // Check if date is not too far in the future
      const maxFutureDate = new Date();
      maxFutureDate.setMonth(maxFutureDate.getMonth() + 3);
      if (date > maxFutureDate) {
        errors.push('Date cannot be more than 3 months in the future');
      }
    }
  }
  
  // Time validation
  if (data.startTime && data.endTime) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.startTime)) {
      errors.push('Invalid start time format (use HH:MM)');
    }
    if (!timeRegex.test(data.endTime)) {
      errors.push('Invalid end time format (use HH:MM)');
    }
    
    // Check if end time is after start time
    if (timeRegex.test(data.startTime) && timeRegex.test(data.endTime)) {
      const [startHour, startMin] = data.startTime.split(':').map(Number);
      const [endHour, endMin] = data.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (endMinutes <= startMinutes) {
        errors.push('End time must be after start time');
      }
      
      // Check for reasonable work hours (max 16 hours)
      const totalMinutes = endMinutes - startMinutes;
      if (totalMinutes > 16 * 60) {
        errors.push('Work period cannot exceed 16 hours');
      }
    }
  }
  
  // Break time validation
  if (data.breakTime !== undefined) {
    const breakTime = parseFloat(data.breakTime);
    if (isNaN(breakTime) || breakTime < 0 || breakTime > 8) {
      errors.push('Break time must be between 0 and 8 hours');
    }
  }
  
  // Notes validation (optional but limited length)
  if (data.notes && data.notes.length > 500) {
    errors.push('Notes cannot exceed 500 characters');
  }
  
  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }
  
  return {
    ...data,
    notes: data.notes ? sanitizeString(data.notes) : ''
  };
};

// Validate leave request
export const validateLeaveRequest = (data) => {
  const errors = [];
  
  // Required fields
  if (!data.startDate) errors.push('Start date is required');
  if (!data.endDate) errors.push('End date is required');
  if (!data.leaveType) errors.push('Leave type is required');
  if (!data.userId) errors.push('User ID is required');
  
  // Date validation
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    if (isNaN(startDate.getTime())) {
      errors.push('Invalid start date format');
    }
    if (isNaN(endDate.getTime())) {
      errors.push('Invalid end date format');
    }
    
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      if (endDate < startDate) {
        errors.push('End date must be after start date');
      }
      
      // Check for reasonable leave duration (max 365 days)
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 365) {
        errors.push('Leave duration cannot exceed 365 days');
      }
    }
  }
  
  // Leave type validation
  const validLeaveTypes = ['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'other'];
  if (data.leaveType && !validLeaveTypes.includes(data.leaveType)) {
    errors.push('Invalid leave type');
  }
  
  // Reason validation (optional but limited length)
  if (data.reason && data.reason.length > 1000) {
    errors.push('Reason cannot exceed 1000 characters');
  }
  
  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }
  
  return {
    ...data,
    reason: data.reason ? sanitizeString(data.reason) : ''
  };
};

// Validate training record
export const validateTrainingRecord = (data) => {
  const errors = [];
  
  // Required fields
  if (!data.trainingName) errors.push('Training name is required');
  if (!data.date) errors.push('Date is required');
  if (!data.userId) errors.push('User ID is required');
  
  // Training name validation
  if (data.trainingName) {
    if (data.trainingName.length < 2) {
      errors.push('Training name must be at least 2 characters');
    }
    if (data.trainingName.length > 200) {
      errors.push('Training name cannot exceed 200 characters');
    }
  }
  
  // Date validation
  if (data.date) {
    const date = new Date(data.date);
    if (isNaN(date.getTime())) {
      errors.push('Invalid date format');
    }
  }
  
  // Duration validation (optional)
  if (data.duration !== undefined) {
    const duration = parseFloat(data.duration);
    if (isNaN(duration) || duration < 0 || duration > 24) {
      errors.push('Duration must be between 0 and 24 hours');
    }
  }
  
  // Provider validation (optional but limited length)
  if (data.provider && data.provider.length > 200) {
    errors.push('Provider name cannot exceed 200 characters');
  }
  
  // Notes validation (optional but limited length)
  if (data.notes && data.notes.length > 1000) {
    errors.push('Notes cannot exceed 1000 characters');
  }
  
  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }
  
  return {
    ...data,
    trainingName: sanitizeString(data.trainingName),
    provider: data.provider ? sanitizeString(data.provider) : '',
    notes: data.notes ? sanitizeString(data.notes) : ''
  };
};

// Validate user data
export const validateUserData = (data, isUpdate = false) => {
  const errors = [];
  
  // Required fields for new users
  if (!isUpdate) {
    if (!data.username) errors.push('Username is required');
    if (!data.email) errors.push('Email is required');
    if (!data.firstName) errors.push('First name is required');
    if (!data.lastName) errors.push('Last name is required');
  }
  
  // Username validation
  if (data.username) {
    if (data.username.length < 3) {
      errors.push('Username must be at least 3 characters');
    }
    if (data.username.length > 50) {
      errors.push('Username cannot exceed 50 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
      errors.push('Username can only contain letters, numbers, hyphens, and underscores');
    }
  }
  
  // Email validation
  if (data.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Invalid email format');
    }
  }
  
  // Name validation
  if (data.firstName && (data.firstName.length < 1 || data.firstName.length > 50)) {
    errors.push('First name must be between 1 and 50 characters');
  }
  if (data.lastName && (data.lastName.length < 1 || data.lastName.length > 50)) {
    errors.push('Last name must be between 1 and 50 characters');
  }
  
  // Role validation
  const validRoles = ['user', 'admin', 'manager'];
  if (data.role && !validRoles.includes(data.role)) {
    errors.push('Invalid role');
  }
  
  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }
  
  return {
    ...data,
    username: data.username ? sanitizeString(data.username) : undefined,
    email: data.email ? sanitizeString(data.email.toLowerCase()) : undefined,
    firstName: data.firstName ? sanitizeString(data.firstName) : undefined,
    lastName: data.lastName ? sanitizeString(data.lastName) : undefined
  };
};

// Validate MongoDB ObjectId
export const validateObjectId = (id, fieldName = 'ID') => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id)) {
    throw new ValidationError(`Invalid ${fieldName} format`);
  }
  return id;
};

// Validate pagination parameters
export const validatePagination = (page, limit) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  
  if (pageNum < 1) {
    throw new ValidationError('Page must be a positive number');
  }
  
  if (limitNum < 1 || limitNum > 100) {
    throw new ValidationError('Limit must be between 1 and 100');
  }
  
  return { page: pageNum, limit: limitNum };
};

// Validate date range
export const validateDateRange = (startDate, endDate, maxDays = 365) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime())) {
    throw new ValidationError('Invalid start date format');
  }
  
  if (isNaN(end.getTime())) {
    throw new ValidationError('Invalid end date format');
  }
  
  if (end < start) {
    throw new ValidationError('End date must be after start date');
  }
  
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > maxDays) {
    throw new ValidationError(`Date range cannot exceed ${maxDays} days`);
  }
  
  return { startDate: start, endDate: end };
};