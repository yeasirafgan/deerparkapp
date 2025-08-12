// utils/serviceLayer.js

import { logger } from './logger';
import { ValidationError, DatabaseError, NotFoundError } from './errorHandler';
import { validateInput } from './validation';
import { performanceTimer } from './performance';
import { isFeatureEnabled } from './config';

/**
 * Comprehensive service layer utilities for business logic abstraction
 */

// Base service class
export class BaseService {
  constructor(name, options = {}) {
    this.name = name;
    this.options = {
      enableLogging: true,
      enablePerformanceTracking: true,
      enableValidation: true,
      enableCaching: false,
      cacheTimeout: 300000, // 5 minutes
      ...options
    };
    this.cache = new Map();
    this.metrics = {
      calls: 0,
      errors: 0,
      totalDuration: 0,
      avgDuration: 0
    };
  }
  
  // Execute service method with common functionality
  async execute(methodName, operation, context = {}) {
    const timer = this.options.enablePerformanceTracking ? performanceTimer() : null;
    const operationId = `${this.name}.${methodName}_${Date.now()}`;
    
    try {
      this.metrics.calls++;
      
      if (this.options.enableLogging) {
        logger.debug('Service method called', {
          service: this.name,
          method: methodName,
          operationId,
          context
        });
      }
      
      // Check cache if enabled
      if (this.options.enableCaching && context.cacheKey) {
        const cached = this.getFromCache(context.cacheKey);
        if (cached) {
          if (this.options.enableLogging) {
            logger.debug('Service cache hit', {
              service: this.name,
              method: methodName,
              cacheKey: context.cacheKey
            });
          }
          return cached;
        }
      }
      
      // Execute operation
      const result = await operation();
      
      // Cache result if enabled
      if (this.options.enableCaching && context.cacheKey && result) {
        this.setCache(context.cacheKey, result);
      }
      
      // Update metrics
      if (timer) {
        const duration = timer.end();
        this.metrics.totalDuration += duration;
        this.metrics.avgDuration = this.metrics.totalDuration / this.metrics.calls;
      }
      
      if (this.options.enableLogging) {
        logger.debug('Service method completed', {
          service: this.name,
          method: methodName,
          operationId,
          duration: timer?.getDuration()
        });
      }
      
      return result;
      
    } catch (error) {
      this.metrics.errors++;
      
      logger.error('Service method failed', {
        service: this.name,
        method: methodName,
        operationId,
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }
  
  // Cache management
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.options.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }
  
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  clearCache() {
    this.cache.clear();
  }
  
  // Get service metrics
  getMetrics() {
    return { ...this.metrics };
  }
  
  // Validate input data
  validateInput(data, schema) {
    if (!this.options.enableValidation) {
      return data;
    }
    
    const validation = validateInput(data, schema);
    if (!validation.isValid) {
      throw new ValidationError('Input validation failed', validation.errors);
    }
    
    return validation.sanitizedData || data;
  }
}

// Repository pattern base class
export class BaseRepository {
  constructor(model, name) {
    this.model = model;
    this.name = name;
    this.cache = new Map();
  }
  
  // Create a new document
  async create(data, options = {}) {
    try {
      const document = new this.model(data);
      const saved = await document.save(options);
      
      logger.debug('Document created', {
        repository: this.name,
        id: saved._id,
        data: options.logData ? data : '[hidden]'
      });
      
      return saved;
    } catch (error) {
      logger.error('Document creation failed', {
        repository: this.name,
        error: error.message,
        data: options.logData ? data : '[hidden]'
      });
      
      throw new DatabaseError(`Failed to create ${this.name}`, error);
    }
  }
  
  // Find document by ID
  async findById(id, options = {}) {
    try {
      const cacheKey = `${this.name}_${id}`;
      
      // Check cache
      if (options.useCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < (options.cacheTimeout || 300000)) {
          return cached.data;
        }
        this.cache.delete(cacheKey);
      }
      
      let query = this.model.findById(id);
      
      if (options.populate) {
        query = query.populate(options.populate);
      }
      
      if (options.select) {
        query = query.select(options.select);
      }
      
      const document = await query.exec();
      
      if (!document) {
        throw new NotFoundError(`${this.name} not found with id: ${id}`);
      }
      
      // Cache result
      if (options.useCache) {
        this.cache.set(cacheKey, {
          data: document,
          timestamp: Date.now()
        });
      }
      
      return document;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Document find by ID failed', {
        repository: this.name,
        id,
        error: error.message
      });
      
      throw new DatabaseError(`Failed to find ${this.name} by ID`, error);
    }
  }
  
  // Find documents with query
  async find(query = {}, options = {}) {
    try {
      let mongoQuery = this.model.find(query);
      
      if (options.populate) {
        mongoQuery = mongoQuery.populate(options.populate);
      }
      
      if (options.select) {
        mongoQuery = mongoQuery.select(options.select);
      }
      
      if (options.sort) {
        mongoQuery = mongoQuery.sort(options.sort);
      }
      
      if (options.limit) {
        mongoQuery = mongoQuery.limit(options.limit);
      }
      
      if (options.skip) {
        mongoQuery = mongoQuery.skip(options.skip);
      }
      
      const documents = await mongoQuery.exec();
      
      logger.debug('Documents found', {
        repository: this.name,
        count: documents.length,
        query: options.logQuery ? query : '[hidden]'
      });
      
      return documents;
    } catch (error) {
      logger.error('Document find failed', {
        repository: this.name,
        query: options.logQuery ? query : '[hidden]',
        error: error.message
      });
      
      throw new DatabaseError(`Failed to find ${this.name} documents`, error);
    }
  }
  
  // Update document by ID
  async updateById(id, update, options = {}) {
    try {
      const document = await this.model.findByIdAndUpdate(
        id,
        update,
        { new: true, runValidators: true, ...options }
      );
      
      if (!document) {
        throw new NotFoundError(`${this.name} not found with id: ${id}`);
      }
      
      // Clear cache
      const cacheKey = `${this.name}_${id}`;
      this.cache.delete(cacheKey);
      
      logger.debug('Document updated', {
        repository: this.name,
        id,
        update: options.logData ? update : '[hidden]'
      });
      
      return document;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Document update failed', {
        repository: this.name,
        id,
        error: error.message
      });
      
      throw new DatabaseError(`Failed to update ${this.name}`, error);
    }
  }
  
  // Delete document by ID
  async deleteById(id, options = {}) {
    try {
      const document = await this.model.findByIdAndDelete(id);
      
      if (!document) {
        throw new NotFoundError(`${this.name} not found with id: ${id}`);
      }
      
      // Clear cache
      const cacheKey = `${this.name}_${id}`;
      this.cache.delete(cacheKey);
      
      logger.debug('Document deleted', {
        repository: this.name,
        id
      });
      
      return document;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Document deletion failed', {
        repository: this.name,
        id,
        error: error.message
      });
      
      throw new DatabaseError(`Failed to delete ${this.name}`, error);
    }
  }
  
  // Count documents
  async count(query = {}) {
    try {
      const count = await this.model.countDocuments(query);
      
      logger.debug('Document count', {
        repository: this.name,
        count,
        query
      });
      
      return count;
    } catch (error) {
      logger.error('Document count failed', {
        repository: this.name,
        error: error.message
      });
      
      throw new DatabaseError(`Failed to count ${this.name} documents`, error);
    }
  }
  
  // Paginated find
  async paginate(query = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: -1 },
      populate,
      select
    } = options;
    
    try {
      const skip = (page - 1) * limit;
      
      const [documents, total] = await Promise.all([
        this.find(query, { ...options, skip, limit, sort, populate, select }),
        this.count(query)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        documents,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Document pagination failed', {
        repository: this.name,
        error: error.message
      });
      
      throw new DatabaseError(`Failed to paginate ${this.name} documents`, error);
    }
  }
  
  // Bulk operations
  async bulkCreate(documents, options = {}) {
    try {
      const result = await this.model.insertMany(documents, options);
      
      logger.debug('Bulk create completed', {
        repository: this.name,
        count: result.length
      });
      
      return result;
    } catch (error) {
      logger.error('Bulk create failed', {
        repository: this.name,
        error: error.message
      });
      
      throw new DatabaseError(`Failed to bulk create ${this.name} documents`, error);
    }
  }
  
  async bulkUpdate(filter, update, options = {}) {
    try {
      const result = await this.model.updateMany(filter, update, options);
      
      logger.debug('Bulk update completed', {
        repository: this.name,
        matched: result.matchedCount,
        modified: result.modifiedCount
      });
      
      return result;
    } catch (error) {
      logger.error('Bulk update failed', {
        repository: this.name,
        error: error.message
      });
      
      throw new DatabaseError(`Failed to bulk update ${this.name} documents`, error);
    }
  }
  
  async bulkDelete(filter, options = {}) {
    try {
      const result = await this.model.deleteMany(filter, options);
      
      logger.debug('Bulk delete completed', {
        repository: this.name,
        deleted: result.deletedCount
      });
      
      return result;
    } catch (error) {
      logger.error('Bulk delete failed', {
        repository: this.name,
        error: error.message
      });
      
      throw new DatabaseError(`Failed to bulk delete ${this.name} documents`, error);
    }
  }
}

// Service registry
const serviceRegistry = new Map();

// Register service
export const registerService = (name, service) => {
  serviceRegistry.set(name, service);
  logger.debug('Service registered', { name });
};

// Get service
export const getService = (name) => {
  const service = serviceRegistry.get(name);
  if (!service) {
    throw new Error(`Service '${name}' not found`);
  }
  return service;
};

// Service factory
export const createService = (name, dependencies = {}) => {
  return new BaseService(name, dependencies);
};

// Repository factory
export const createRepository = (model, name) => {
  return new BaseRepository(model, name);
};

// Transaction helper
export const withTransaction = async (operation, options = {}) => {
  const mongoose = await import('mongoose');
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction(options);
    
    const result = await operation(session);
    
    await session.commitTransaction();
    
    logger.debug('Transaction committed successfully');
    
    return result;
  } catch (error) {
    await session.abortTransaction();
    
    logger.error('Transaction aborted', {
      error: error.message
    });
    
    throw error;
  } finally {
    session.endSession();
  }
};

// Service orchestrator for complex operations
export class ServiceOrchestrator {
  constructor(name) {
    this.name = name;
    this.steps = [];
    this.rollbackSteps = [];
  }
  
  // Add step to orchestration
  addStep(name, operation, rollback = null) {
    this.steps.push({ name, operation });
    if (rollback) {
      this.rollbackSteps.unshift({ name, rollback });
    }
    return this;
  }
  
  // Execute orchestration
  async execute(context = {}) {
    const results = [];
    const executedSteps = [];
    
    try {
      logger.debug('Service orchestration started', {
        orchestrator: this.name,
        steps: this.steps.length
      });
      
      for (const step of this.steps) {
        logger.debug('Executing orchestration step', {
          orchestrator: this.name,
          step: step.name
        });
        
        const result = await step.operation(context, results);
        results.push({ step: step.name, result });
        executedSteps.push(step);
        
        // Update context with result
        context[step.name] = result;
      }
      
      logger.debug('Service orchestration completed', {
        orchestrator: this.name,
        steps: executedSteps.length
      });
      
      return results;
      
    } catch (error) {
      logger.error('Service orchestration failed', {
        orchestrator: this.name,
        failedStep: executedSteps.length,
        error: error.message
      });
      
      // Execute rollback steps
      await this.rollback(executedSteps, context);
      
      throw error;
    }
  }
  
  // Execute rollback
  async rollback(executedSteps, context) {
    logger.debug('Starting orchestration rollback', {
      orchestrator: this.name,
      steps: executedSteps.length
    });
    
    for (const rollbackStep of this.rollbackSteps) {
      const wasExecuted = executedSteps.some(step => step.name === rollbackStep.name);
      
      if (wasExecuted) {
        try {
          logger.debug('Executing rollback step', {
            orchestrator: this.name,
            step: rollbackStep.name
          });
          
          await rollbackStep.rollback(context);
        } catch (rollbackError) {
          logger.error('Rollback step failed', {
            orchestrator: this.name,
            step: rollbackStep.name,
            error: rollbackError.message
          });
        }
      }
    }
    
    logger.debug('Orchestration rollback completed', {
      orchestrator: this.name
    });
  }
}

// Event-driven service communication
export class ServiceEventBus {
  constructor() {
    this.listeners = new Map();
    this.middleware = [];
  }
  
  // Add middleware
  use(middleware) {
    this.middleware.push(middleware);
  }
  
  // Subscribe to events
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event).add(listener);
    
    logger.debug('Event listener registered', { event });
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }
  
  // Emit event
  async emit(event, data, context = {}) {
    const listeners = this.listeners.get(event);
    
    if (!listeners || listeners.size === 0) {
      logger.debug('No listeners for event', { event });
      return;
    }
    
    logger.debug('Emitting event', {
      event,
      listeners: listeners.size
    });
    
    // Apply middleware
    let processedData = data;
    for (const middleware of this.middleware) {
      processedData = await middleware(event, processedData, context);
    }
    
    // Notify listeners
    const promises = [];
    for (const listener of listeners) {
      promises.push(
        Promise.resolve(listener(processedData, context)).catch(error => {
          logger.error('Event listener failed', {
            event,
            error: error.message
          });
        })
      );
    }
    
    await Promise.all(promises);
  }
  
  // Remove all listeners for an event
  removeAllListeners(event) {
    this.listeners.delete(event);
    logger.debug('All listeners removed for event', { event });
  }
  
  // Get listener count
  listenerCount(event) {
    return this.listeners.get(event)?.size || 0;
  }
}

// Global service event bus
export const serviceEventBus = new ServiceEventBus();

// Service health monitoring
export const getServiceHealth = () => {
  const services = [];
  
  for (const [name, service] of serviceRegistry) {
    if (service instanceof BaseService) {
      const metrics = service.getMetrics();
      services.push({
        name,
        metrics,
        status: metrics.errors / metrics.calls > 0.1 ? 'degraded' : 'healthy'
      });
    }
  }
  
  return {
    totalServices: services.length,
    healthyServices: services.filter(s => s.status === 'healthy').length,
    degradedServices: services.filter(s => s.status === 'degraded').length,
    services
  };
};