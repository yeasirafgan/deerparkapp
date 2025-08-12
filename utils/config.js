// utils/config.js

import { logger } from './logger';

/**
 * Comprehensive configuration management utility
 */

// Configuration store
const configStore = new Map();
const featureFlags = new Map();
const configWatchers = new Map();

// Environment detection
export const getEnvironment = () => {
  return process.env.NODE_ENV || 'development';
};

export const isDevelopment = () => getEnvironment() === 'development';
export const isProduction = () => getEnvironment() === 'production';
export const isTest = () => getEnvironment() === 'test';

// Configuration schema validation
const validateConfigValue = (value, schema) => {
  if (!schema) return { valid: true, value };
  
  const { type, required, default: defaultValue, validator, transform } = schema;
  
  // Handle undefined/null values
  if (value === undefined || value === null) {
    if (required) {
      return { valid: false, error: 'Required configuration value is missing' };
    }
    return { valid: true, value: defaultValue };
  }
  
  // Transform value if transformer provided
  if (transform && typeof transform === 'function') {
    try {
      value = transform(value);
    } catch (error) {
      return { valid: false, error: `Transformation failed: ${error.message}` };
    }
  }
  
  // Type validation
  if (type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== type) {
      // Try to coerce common types
      if (type === 'number' && typeof value === 'string') {
        const num = Number(value);
        if (!isNaN(num)) {
          value = num;
        } else {
          return { valid: false, error: `Expected ${type}, got ${actualType}` };
        }
      } else if (type === 'boolean' && typeof value === 'string') {
        value = value.toLowerCase() === 'true';
      } else {
        return { valid: false, error: `Expected ${type}, got ${actualType}` };
      }
    }
  }
  
  // Custom validation
  if (validator && typeof validator === 'function') {
    try {
      const isValid = validator(value);
      if (!isValid) {
        return { valid: false, error: 'Custom validation failed' };
      }
    } catch (error) {
      return { valid: false, error: `Validation error: ${error.message}` };
    }
  }
  
  return { valid: true, value };
};

// Configuration class
class Config {
  constructor(namespace = 'default') {
    this.namespace = namespace;
    this.schema = new Map();
    this.cache = new Map();
    this.watchers = new Set();
  }
  
  // Define configuration schema
  defineSchema(key, schema) {
    this.schema.set(key, schema);
    
    // Clear cache for this key
    this.cache.delete(key);
    
    logger.debug('Configuration schema defined', {
      namespace: this.namespace,
      key,
      schema
    });
  }
  
  // Get configuration value
  get(key, defaultValue = undefined) {
    const cacheKey = `${this.namespace}.${key}`;
    
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    // Get value from environment or config store
    let value = process.env[key] || configStore.get(cacheKey);
    
    // Apply schema validation
    const schema = this.schema.get(key);
    if (schema || defaultValue !== undefined) {
      const validation = validateConfigValue(value, {
        ...schema,
        default: defaultValue
      });
      
      if (!validation.valid) {
        logger.error('Configuration validation failed', {
          namespace: this.namespace,
          key,
          error: validation.error
        });
        
        // Return default value or throw error
        if (defaultValue !== undefined) {
          value = defaultValue;
        } else {
          throw new Error(`Configuration error for ${key}: ${validation.error}`);
        }
      } else {
        value = validation.value;
      }
    }
    
    // Cache the value
    this.cache.set(key, value);
    
    return value;
  }
  
  // Set configuration value
  set(key, value) {
    const cacheKey = `${this.namespace}.${key}`;
    
    // Validate against schema
    const schema = this.schema.get(key);
    if (schema) {
      const validation = validateConfigValue(value, schema);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed for ${key}: ${validation.error}`);
      }
      value = validation.value;
    }
    
    // Store value
    configStore.set(cacheKey, value);
    this.cache.set(key, value);
    
    // Notify watchers
    this.notifyWatchers(key, value);
    
    logger.debug('Configuration value set', {
      namespace: this.namespace,
      key,
      value
    });
  }
  
  // Watch for configuration changes
  watch(key, callback) {
    const watcherKey = `${this.namespace}.${key}`;
    
    if (!configWatchers.has(watcherKey)) {
      configWatchers.set(watcherKey, new Set());
    }
    
    configWatchers.get(watcherKey).add(callback);
    this.watchers.add({ key, callback });
    
    logger.debug('Configuration watcher added', {
      namespace: this.namespace,
      key
    });
    
    // Return unwatch function
    return () => {
      configWatchers.get(watcherKey)?.delete(callback);
      this.watchers.delete({ key, callback });
    };
  }
  
  // Notify watchers of changes
  notifyWatchers(key, value) {
    const watcherKey = `${this.namespace}.${key}`;
    const watchers = configWatchers.get(watcherKey);
    
    if (watchers) {
      for (const callback of watchers) {
        try {
          callback(value, key);
        } catch (error) {
          logger.error('Configuration watcher error', {
            namespace: this.namespace,
            key,
            error: error.message
          });
        }
      }
    }
  }
  
  // Get all configuration values
  getAll() {
    const config = {};
    
    for (const [key] of this.schema) {
      config[key] = this.get(key);
    }
    
    return config;
  }
  
  // Clear cache
  clearCache() {
    this.cache.clear();
    logger.debug('Configuration cache cleared', {
      namespace: this.namespace
    });
  }
  
  // Validate all configuration
  validate() {
    const errors = [];
    
    for (const [key, schema] of this.schema) {
      try {
        this.get(key);
      } catch (error) {
        errors.push({ key, error: error.message });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Default application configuration
const appConfig = new Config('app');

// Define application configuration schema
appConfig.defineSchema('PORT', {
  type: 'number',
  default: 3000,
  validator: (value) => value > 0 && value < 65536
});

appConfig.defineSchema('NODE_ENV', {
  type: 'string',
  default: 'development',
  validator: (value) => ['development', 'production', 'test'].includes(value)
});

appConfig.defineSchema('MONGODB_URI', {
  type: 'string',
  required: true,
  validator: (value) => value.startsWith('mongodb')
});

appConfig.defineSchema('NEXTAUTH_SECRET', {
  type: 'string',
  required: true,
  validator: (value) => value.length >= 32
});

appConfig.defineSchema('NEXTAUTH_URL', {
  type: 'string',
  default: 'http://localhost:3000'
});

appConfig.defineSchema('LOG_LEVEL', {
  type: 'string',
  default: 'info',
  validator: (value) => ['error', 'warn', 'info', 'debug'].includes(value)
});

appConfig.defineSchema('RATE_LIMIT_WINDOW', {
  type: 'number',
  default: 900000, // 15 minutes
  transform: (value) => parseInt(value)
});

appConfig.defineSchema('RATE_LIMIT_MAX', {
  type: 'number',
  default: 100,
  transform: (value) => parseInt(value)
});

appConfig.defineSchema('CACHE_TTL', {
  type: 'number',
  default: 300000, // 5 minutes
  transform: (value) => parseInt(value)
});

appConfig.defineSchema('MAX_REQUEST_SIZE', {
  type: 'string',
  default: '10mb'
});

appConfig.defineSchema('REQUEST_TIMEOUT', {
  type: 'number',
  default: 30000, // 30 seconds
  transform: (value) => parseInt(value)
});

// Feature flags management
class FeatureFlags {
  constructor() {
    this.flags = new Map();
    this.watchers = new Map();
  }
  
  // Define a feature flag
  define(name, defaultValue = false, options = {}) {
    const flag = {
      name,
      defaultValue,
      enabled: this.getEnvironmentFlag(name, defaultValue),
      description: options.description,
      rolloutPercentage: options.rolloutPercentage || 100,
      conditions: options.conditions || [],
      createdAt: new Date()
    };
    
    this.flags.set(name, flag);
    
    logger.debug('Feature flag defined', {
      name,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage
    });
  }
  
  // Get environment-specific flag value
  getEnvironmentFlag(name, defaultValue) {
    const envKey = `FEATURE_${name.toUpperCase()}`;
    const envValue = process.env[envKey];
    
    if (envValue !== undefined) {
      return envValue.toLowerCase() === 'true';
    }
    
    return defaultValue;
  }
  
  // Check if feature is enabled
  isEnabled(name, context = {}) {
    const flag = this.flags.get(name);
    
    if (!flag) {
      logger.warn('Unknown feature flag', { name });
      return false;
    }
    
    // Check if flag is globally disabled
    if (!flag.enabled) {
      return false;
    }
    
    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const hash = this.hashString(context.userId || context.sessionId || 'anonymous');
      const percentage = (hash % 100) + 1;
      
      if (percentage > flag.rolloutPercentage) {
        return false;
      }
    }
    
    // Check conditions
    if (flag.conditions.length > 0) {
      for (const condition of flag.conditions) {
        if (!this.evaluateCondition(condition, context)) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  // Simple string hash function
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  // Evaluate condition
  evaluateCondition(condition, context) {
    try {
      if (typeof condition === 'function') {
        return condition(context);
      }
      
      if (typeof condition === 'object') {
        const { key, operator, value } = condition;
        const contextValue = context[key];
        
        switch (operator) {
          case 'equals':
            return contextValue === value;
          case 'not_equals':
            return contextValue !== value;
          case 'in':
            return Array.isArray(value) && value.includes(contextValue);
          case 'not_in':
            return Array.isArray(value) && !value.includes(contextValue);
          case 'greater_than':
            return contextValue > value;
          case 'less_than':
            return contextValue < value;
          default:
            return false;
        }
      }
      
      return Boolean(condition);
    } catch (error) {
      logger.error('Feature flag condition evaluation failed', {
        condition,
        context,
        error: error.message
      });
      return false;
    }
  }
  
  // Enable/disable feature flag
  setEnabled(name, enabled) {
    const flag = this.flags.get(name);
    
    if (!flag) {
      throw new Error(`Feature flag '${name}' not found`);
    }
    
    flag.enabled = enabled;
    
    logger.info('Feature flag updated', {
      name,
      enabled
    });
    
    // Notify watchers
    this.notifyWatchers(name, enabled);
  }
  
  // Set rollout percentage
  setRolloutPercentage(name, percentage) {
    const flag = this.flags.get(name);
    
    if (!flag) {
      throw new Error(`Feature flag '${name}' not found`);
    }
    
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }
    
    flag.rolloutPercentage = percentage;
    
    logger.info('Feature flag rollout updated', {
      name,
      rolloutPercentage: percentage
    });
  }
  
  // Watch for feature flag changes
  watch(name, callback) {
    if (!this.watchers.has(name)) {
      this.watchers.set(name, new Set());
    }
    
    this.watchers.get(name).add(callback);
    
    // Return unwatch function
    return () => {
      this.watchers.get(name)?.delete(callback);
    };
  }
  
  // Notify watchers
  notifyWatchers(name, enabled) {
    const watchers = this.watchers.get(name);
    
    if (watchers) {
      for (const callback of watchers) {
        try {
          callback(enabled, name);
        } catch (error) {
          logger.error('Feature flag watcher error', {
            name,
            error: error.message
          });
        }
      }
    }
  }
  
  // Get all feature flags
  getAll() {
    const flags = {};
    
    for (const [name, flag] of this.flags) {
      flags[name] = {
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage,
        description: flag.description
      };
    }
    
    return flags;
  }
  
  // Get feature flag info
  getInfo(name) {
    return this.flags.get(name);
  }
}

// Default feature flags instance
const featureFlagsInstance = new FeatureFlags();

// Define default feature flags
featureFlagsInstance.define('ENHANCED_LOGGING', false, {
  description: 'Enable enhanced logging with detailed request/response information'
});

featureFlagsInstance.define('PERFORMANCE_MONITORING', true, {
  description: 'Enable performance monitoring and metrics collection'
});

featureFlagsInstance.define('CACHE_ENABLED', true, {
  description: 'Enable caching for API responses'
});

featureFlagsInstance.define('RATE_LIMITING', true, {
  description: 'Enable rate limiting for API endpoints'
});

featureFlagsInstance.define('SECURITY_HEADERS', true, {
  description: 'Enable security headers in API responses'
});

featureFlagsInstance.define('DATABASE_QUERY_OPTIMIZATION', false, {
  description: 'Enable database query optimization features'
});

featureFlagsInstance.define('ADVANCED_VALIDATION', false, {
  description: 'Enable advanced input validation and sanitization'
});

// Configuration utilities
export const getConfig = (key, defaultValue) => {
  return appConfig.get(key, defaultValue);
};

export const setConfig = (key, value) => {
  return appConfig.set(key, value);
};

export const watchConfig = (key, callback) => {
  return appConfig.watch(key, callback);
};

export const validateConfig = () => {
  return appConfig.validate();
};

// Feature flag utilities
export const isFeatureEnabled = (name, context) => {
  return featureFlagsInstance.isEnabled(name, context);
};

export const enableFeature = (name) => {
  return featureFlagsInstance.setEnabled(name, true);
};

export const disableFeature = (name) => {
  return featureFlagsInstance.setEnabled(name, false);
};

export const setFeatureRollout = (name, percentage) => {
  return featureFlagsInstance.setRolloutPercentage(name, percentage);
};

export const watchFeature = (name, callback) => {
  return featureFlagsInstance.watch(name, callback);
};

export const getAllFeatures = () => {
  return featureFlagsInstance.getAll();
};

// Environment-specific configuration
export const getEnvironmentConfig = () => {
  const env = getEnvironment();
  
  const baseConfig = {
    environment: env,
    port: getConfig('PORT'),
    mongoUri: getConfig('MONGODB_URI'),
    logLevel: getConfig('LOG_LEVEL'),
    features: getAllFeatures()
  };
  
  // Environment-specific overrides
  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        debug: true,
        hotReload: true,
        strictValidation: false
      };
      
    case 'production':
      return {
        ...baseConfig,
        debug: false,
        hotReload: false,
        strictValidation: true,
        compression: true,
        securityHeaders: true
      };
      
    case 'test':
      return {
        ...baseConfig,
        debug: false,
        hotReload: false,
        strictValidation: true,
        testMode: true
      };
      
    default:
      return baseConfig;
  }
};

// Configuration health check
export const configHealthCheck = () => {
  const validation = validateConfig();
  const issues = [];
  
  if (!validation.valid) {
    issues.push(...validation.errors.map(e => `Configuration error: ${e.key} - ${e.error}`));
  }
  
  // Check critical environment variables
  const criticalVars = ['MONGODB_URI', 'NEXTAUTH_SECRET'];
  for (const varName of criticalVars) {
    if (!process.env[varName]) {
      issues.push(`Missing critical environment variable: ${varName}`);
    }
  }
  
  return {
    status: issues.length === 0 ? 'healthy' : 'unhealthy',
    issues,
    config: getEnvironmentConfig()
  };
};

// Export classes and instances
export { Config, FeatureFlags, appConfig, featureFlagsInstance };