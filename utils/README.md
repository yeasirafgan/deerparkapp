# Utilities Documentation

This directory contains comprehensive utility modules that enhance the robustness, maintainability, and performance of the timesheet application. These utilities provide foundational functionality for database management, error handling, security, performance monitoring, and more.

## Overview

The utilities are designed to work together as a cohesive system, providing:

- **Database Management**: Connection pooling, cleanup utilities, and health monitoring
- **Error Handling**: Structured error management with custom error types
- **Security**: Rate limiting, input sanitization, and security headers
- **Performance**: Monitoring, caching, and optimization utilities
- **Logging**: Comprehensive logging with multiple levels and contexts
- **Validation**: Input validation and sanitization
- **Configuration**: Environment-specific settings and feature flags
- **Testing**: Comprehensive testing utilities and helpers
- **Service Layer**: Business logic abstraction and data access patterns
- **Middleware**: Request/response processing and API enhancements
- **Health Monitoring**: Application health checks and diagnostics

## Utility Modules

### 1. Database Cleanup (`databaseCleanup.js`)

**Purpose**: Provides utilities for cleaning up database records and managing data lifecycle.

**Key Features**:
- User-specific data cleanup
- Orphaned record removal
- Draft record cleanup
- Database statistics
- Complete cleanup functions

**Usage**:
```javascript
import { cleanupUserData, cleanupOrphanedWeeklySummaries, getDatabaseStats } from './utils/databaseCleanup';

// Clean up all data for a specific user
await cleanupUserData('username123');

// Remove orphaned weekly summaries
await cleanupOrphanedWeeklySummaries();

// Get database statistics
const stats = await getDatabaseStats();
```

### 2. Error Handler (`errorHandler.js`)

**Purpose**: Provides structured error handling with custom error types and logging.

**Key Features**:
- Custom error classes (ValidationError, AuthenticationError, etc.)
- API error response handling
- Error logging and tracking
- Async error wrapper for API routes
- Client-side error handling

**Usage**:
```javascript
import { ValidationError, handleApiError, wrapAsync } from './utils/errorHandler';

// Throw custom errors
throw new ValidationError('Invalid input data', validationErrors);

// Wrap API routes for error handling
export default wrapAsync(async (req, res) => {
  // Your API logic here
});
```

### 3. Validation (`validation.js`)

**Purpose**: Comprehensive input validation and sanitization utilities.

**Key Features**:
- String sanitization
- Timesheet entry validation
- User data validation
- MongoDB ObjectId validation
- Date range validation
- Pagination parameter validation

**Usage**:
```javascript
import { validateTimesheetEntry, sanitizeString, validateEmail } from './utils/validation';

// Validate timesheet data
const validation = validateTimesheetEntry(timesheetData);
if (!validation.isValid) {
  throw new ValidationError('Invalid timesheet', validation.errors);
}

// Sanitize user input
const cleanInput = sanitizeString(userInput);
```

### 4. Logger (`logger.js`)

**Purpose**: Comprehensive logging system with multiple levels and specialized logging functions.

**Key Features**:
- Multiple log levels (ERROR, WARN, INFO, DEBUG)
- API request/response logging
- Database operation logging
- Performance logging
- Security event logging
- Audit trail logging

**Usage**:
```javascript
import { logger } from './utils/logger';

// Basic logging
logger.info('User logged in', { userId: '123' });
logger.error('Database connection failed', { error: error.message });

// Specialized logging
logger.logApiRequest({ method: 'POST', url: '/api/users' });
logger.logDatabaseOperation('CREATE', 'User', { userId: '123' });
logger.logPerformance('API Response', 150);
```

### 5. Database Connection (`dbConnection.js`)

**Purpose**: Enhanced database connection management with pooling and health monitoring.

**Key Features**:
- Connection pooling
- Retry logic
- Connection event listeners
- Graceful shutdown
- Health checks
- Transaction helpers

**Usage**:
```javascript
import { connectMongo, healthCheck, withTransaction } from './utils/dbConnection';

// Connect to database
await connectMongo();

// Check database health
const health = await healthCheck();

// Use transactions
const result = await withTransaction(async (session) => {
  // Database operations within transaction
});
```

### 6. Security (`security.js`)

**Purpose**: Security enhancements including rate limiting, input sanitization, and threat detection.

**Key Features**:
- Rate limiting middleware
- Input sanitization
- SQL/NoSQL injection prevention
- CSRF protection
- Security headers
- Suspicious activity detection
- Password strength validation

**Usage**:
```javascript
import { rateLimitMiddleware, sanitizeInput, securityHeaders } from './utils/security';

// Apply rate limiting
app.use(rateLimitMiddleware());

// Sanitize input
const cleanData = sanitizeInput(userInput);

// Apply security headers
app.use(securityHeaders());
```

### 7. Performance (`performance.js`)

**Purpose**: Performance monitoring and optimization utilities.

**Key Features**:
- Performance timer class
- Database query performance tracking
- API response time monitoring
- Memory usage tracking
- Performance metrics collection
- Performance health checks

**Usage**:
```javascript
import { PerformanceTimer, trackQueryPerformance, performanceMiddleware } from './utils/performance';

// Measure operation performance
const timer = new PerformanceTimer();
// ... perform operation
const duration = timer.end();

// Track database query performance
trackQueryPerformance('User.find', 150, true);

// Use performance middleware
app.use(performanceMiddleware);
```

### 8. Cache (`cache.js`)

**Purpose**: Comprehensive caching utilities with in-memory storage and cache management.

**Key Features**:
- In-memory cache with TTL
- LRU eviction
- Cache statistics
- Function memoization
- Cache middleware for API routes
- Specialized cache instances

**Usage**:
```javascript
import { cache, memoize, cacheMiddleware } from './utils/cache';

// Basic caching
cache.set('key', data, 300000); // 5 minutes TTL
const data = cache.get('key');

// Memoize functions
const memoizedFunction = memoize(expensiveFunction);

// Use cache middleware
app.use('/api/data', cacheMiddleware({ ttl: 600000 }));
```

### 9. Health Check (`healthCheck.js`)

**Purpose**: Comprehensive health monitoring and diagnostics for the application.

**Key Features**:
- Health check registry
- Built-in health checks (database, system, performance)
- Overall health status calculation
- Health check middleware
- Readiness and liveness checks
- Health check watchers

**Usage**:
```javascript
import { getOverallHealth, registerHealthCheck, healthCheckMiddleware } from './utils/healthCheck';

// Get overall application health
const health = await getOverallHealth();

// Register custom health check
registerHealthCheck('custom-service', async () => {
  // Custom health check logic
  return { status: 'healthy', message: 'Service is running' };
});

// Use health check middleware
app.use(healthCheckMiddleware);
```

### 10. Testing (`testing.js`)

**Purpose**: Comprehensive testing utilities for unit, integration, and performance testing.

**Key Features**:
- Test data factories
- Database test utilities
- API test helpers
- Test assertions
- Performance testing
- Mock utilities
- Test suite management

**Usage**:
```javascript
import { TestDataFactory, ApiTestHelper, TestDatabase } from './utils/testing';

// Create test data
const testUser = TestDataFactory.createUser({ username: 'testuser' });

// Setup test database
await TestDatabase.setup();

// API testing
const api = new ApiTestHelper();
const response = await api.get('/api/users');
```

### 11. Middleware (`middleware.js`)

**Purpose**: Comprehensive middleware utilities for API request/response processing.

**Key Features**:
- Request logging and context
- CORS handling
- Input validation and sanitization
- Authentication and authorization
- Error handling
- Request timeout and size limits
- Middleware composition

**Usage**:
```javascript
import { createDefaultMiddlewareStack, validationMiddleware, authenticationMiddleware } from './utils/middleware';

// Use default middleware stack
app.use(createDefaultMiddlewareStack());

// Custom validation middleware
app.use('/api/users', validationMiddleware(userSchema));

// Authentication middleware
app.use('/api/protected', authenticationMiddleware({ required: true }));
```

### 12. Configuration (`config.js`)

**Purpose**: Configuration management with environment-specific settings and feature flags.

**Key Features**:
- Environment detection
- Configuration schema validation
- Feature flags with rollout percentages
- Configuration watchers
- Environment-specific overrides
- Configuration health checks

**Usage**:
```javascript
import { getConfig, isFeatureEnabled, setFeatureRollout } from './utils/config';

// Get configuration values
const port = getConfig('PORT', 3000);
const dbUri = getConfig('MONGODB_URI');

// Check feature flags
if (isFeatureEnabled('ENHANCED_LOGGING')) {
  // Enhanced logging logic
}

// Set feature rollout percentage
setFeatureRollout('NEW_FEATURE', 50); // 50% rollout
```

### 13. Service Layer (`serviceLayer.js`)

**Purpose**: Business logic abstraction and data access patterns for better code organization.

**Key Features**:
- Base service class with common functionality
- Repository pattern implementation
- Service registry and factory
- Transaction helpers
- Service orchestration
- Event-driven service communication
- Service health monitoring

**Usage**:
```javascript
import { BaseService, BaseRepository, ServiceOrchestrator } from './utils/serviceLayer';

// Create service
class UserService extends BaseService {
  constructor() {
    super('UserService');
  }
  
  async createUser(userData) {
    return this.execute('createUser', async () => {
      // Business logic here
    });
  }
}

// Create repository
const userRepository = new BaseRepository(UserModel, 'User');

// Service orchestration
const orchestrator = new ServiceOrchestrator('UserRegistration')
  .addStep('validateUser', validateUserStep)
  .addStep('createUser', createUserStep)
  .addStep('sendWelcomeEmail', sendEmailStep);
```

## Integration Guide

### 1. Basic Setup

To integrate these utilities into your application:

```javascript
// app.js or your main application file
import { connectMongo } from './utils/dbConnection';
import { logger } from './utils/logger';
import { createDefaultMiddlewareStack } from './utils/middleware';
import { validateConfig } from './utils/config';

// Validate configuration on startup
const configValidation = validateConfig();
if (!configValidation.valid) {
  logger.error('Configuration validation failed', configValidation.errors);
  process.exit(1);
}

// Connect to database
await connectMongo();

// Apply middleware stack
app.use(createDefaultMiddlewareStack());

// Start server
const port = getConfig('PORT', 3000);
app.listen(port, () => {
  logger.info('Server started', { port });
});
```

### 2. API Route Enhancement

```javascript
// pages/api/users/index.js
import { wrapAsync, ValidationError } from '../../utils/errorHandler';
import { validateUserData } from '../../utils/validation';
import { logger } from '../../utils/logger';
import { isFeatureEnabled } from '../../utils/config';

export default wrapAsync(async (req, res) => {
  if (req.method === 'POST') {
    // Validate input
    const validation = validateUserData(req.body);
    if (!validation.isValid) {
      throw new ValidationError('Invalid user data', validation.errors);
    }
    
    // Enhanced logging if feature is enabled
    if (isFeatureEnabled('ENHANCED_LOGGING')) {
      logger.logApiRequest({
        method: req.method,
        url: req.url,
        body: req.body
      });
    }
    
    // Create user logic here
    const user = await createUser(validation.sanitizedData);
    
    res.status(201).json({ user });
  }
});
```

### 3. Database Operations

```javascript
// services/userService.js
import { BaseService } from '../utils/serviceLayer';
import { cleanupUserData } from '../utils/databaseCleanup';
import { withTransaction } from '../utils/dbConnection';

class UserService extends BaseService {
  constructor() {
    super('UserService', { enableCaching: true });
  }
  
  async deleteUser(userId) {
    return this.execute('deleteUser', async () => {
      return withTransaction(async (session) => {
        // Delete user and cleanup related data
        await User.findByIdAndDelete(userId, { session });
        await cleanupUserData(userId, { session });
        
        return { success: true };
      });
    });
  }
}
```

## Best Practices

### 1. Error Handling
- Always use the custom error classes for consistent error handling
- Wrap API routes with `wrapAsync` for automatic error catching
- Log errors with appropriate context information

### 2. Validation
- Validate all user inputs using the validation utilities
- Sanitize strings to prevent XSS attacks
- Use schema-based validation for complex data structures

### 3. Performance
- Use caching for frequently accessed data
- Monitor performance with the performance utilities
- Implement pagination for large data sets

### 4. Security
- Apply rate limiting to prevent abuse
- Use security headers for all responses
- Sanitize all user inputs
- Monitor for suspicious activities

### 5. Logging
- Use appropriate log levels (DEBUG for development, INFO for production)
- Include context information in log messages
- Use structured logging for better searchability

### 6. Configuration
- Use environment variables for configuration
- Validate configuration on application startup
- Use feature flags for gradual feature rollouts

### 7. Testing
- Use the testing utilities for consistent test setup
- Test both success and error scenarios
- Include performance tests for critical operations

## Monitoring and Maintenance

### Health Checks
The application provides several health check endpoints:

- `/health` - Overall application health
- `/health/database` - Database connectivity
- `/health/performance` - Performance metrics
- `/health/cache` - Cache status

### Metrics Collection
The utilities automatically collect various metrics:

- API response times
- Database query performance
- Cache hit/miss ratios
- Error rates
- Memory usage

### Cleanup Tasks
Regular maintenance tasks should be scheduled:

```javascript
// Cleanup script
import { cleanupOldDrafts, cleanupOrphanedWeeklySummaries } from './utils/databaseCleanup';
import { logger } from './utils/logger';

// Run daily cleanup
setInterval(async () => {
  try {
    await cleanupOldDrafts(30); // Clean drafts older than 30 days
    await cleanupOrphanedWeeklySummaries();
    logger.info('Daily cleanup completed');
  } catch (error) {
    logger.error('Daily cleanup failed', { error: error.message });
  }
}, 24 * 60 * 60 * 1000); // 24 hours
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check MongoDB URI configuration
   - Verify network connectivity
   - Check database health endpoint

2. **Performance Issues**
   - Monitor performance metrics
   - Check cache hit ratios
   - Review slow database queries

3. **Memory Issues**
   - Monitor memory usage metrics
   - Check for memory leaks in cache
   - Review large data operations

4. **Security Issues**
   - Check rate limiting logs
   - Review suspicious activity alerts
   - Verify input sanitization

### Debug Mode
Enable debug logging for detailed information:

```javascript
// Set LOG_LEVEL=debug in environment variables
process.env.LOG_LEVEL = 'debug';
```

## Contributing

When adding new utilities:

1. Follow the existing patterns and conventions
2. Include comprehensive error handling
3. Add appropriate logging
4. Include unit tests
5. Update this documentation
6. Consider performance implications
7. Ensure security best practices

## Dependencies

The utilities have minimal external dependencies:

- `mongoose` - Database operations
- `bcrypt` - Password hashing (security utilities)
- `jsonwebtoken` - JWT operations (if using JWT authentication)

Most utilities use only Node.js built-in modules for maximum compatibility and minimal overhead.