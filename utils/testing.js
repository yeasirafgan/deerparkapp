// utils/testing.js

import { logger } from './logger';
import { connectMongo, disconnectMongo } from './dbConnection';
import mongoose from 'mongoose';

/**
 * Comprehensive testing utilities and helpers
 */

// Test environment configuration
export const TEST_CONFIG = {
  database: {
    testDbName: 'timesheet_test',
    cleanupAfterTests: true,
    useInMemoryDb: process.env.NODE_ENV === 'test'
  },
  api: {
    baseUrl: process.env.TEST_API_BASE_URL || 'http://localhost:3000',
    timeout: 10000
  },
  performance: {
    maxResponseTime: 1000,
    maxMemoryUsage: 100 * 1024 * 1024 // 100MB
  }
};

// Test data factories
export const TestDataFactory = {
  // User factory
  createUser: (overrides = {}) => ({
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    name: 'Test User',
    role: 'employee',
    department: 'IT',
    isActive: true,
    createdAt: new Date(),
    ...overrides
  }),
  
  // Timesheet factory
  createTimesheet: (overrides = {}) => ({
    username: `testuser_${Date.now()}`,
    weekStarting: new Date(),
    status: 'draft',
    totalHours: 40,
    entries: [
      {
        date: new Date(),
        startTime: '09:00',
        endTime: '17:00',
        breakTime: 60,
        hoursWorked: 8,
        description: 'Test work'
      }
    ],
    createdAt: new Date(),
    ...overrides
  }),
  
  // Leave request factory
  createLeaveRequest: (overrides = {}) => ({
    username: `testuser_${Date.now()}`,
    leaveType: 'annual',
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    reason: 'Test leave request',
    status: 'pending',
    totalDays: 1,
    createdAt: new Date(),
    ...overrides
  }),
  
  // Training record factory
  createTrainingRecord: (overrides = {}) => ({
    username: `testuser_${Date.now()}`,
    trainingType: 'safety',
    title: 'Test Training',
    description: 'Test training description',
    date: new Date(),
    duration: 2,
    status: 'completed',
    createdAt: new Date(),
    ...overrides
  }),
  
  // Rota factory
  createRota: (overrides = {}) => ({
    username: `testuser_${Date.now()}`,
    date: new Date(),
    shift: 'day',
    startTime: '09:00',
    endTime: '17:00',
    location: 'Main Office',
    status: 'scheduled',
    createdAt: new Date(),
    ...overrides
  })
};

// Database test utilities
export class TestDatabase {
  static async setup() {
    try {
      if (TEST_CONFIG.database.useInMemoryDb) {
        // Use MongoDB Memory Server for testing
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        process.env.MONGODB_URI = uri;
        this.mongod = mongod;
      }
      
      await connectMongo();
      logger.info('Test database connected');
    } catch (error) {
      logger.error('Test database setup failed', { error: error.message });
      throw error;
    }
  }
  
  static async teardown() {
    try {
      if (TEST_CONFIG.database.cleanupAfterTests) {
        await this.cleanup();
      }
      
      await disconnectMongo();
      
      if (this.mongod) {
        await this.mongod.stop();
      }
      
      logger.info('Test database disconnected');
    } catch (error) {
      logger.error('Test database teardown failed', { error: error.message });
      throw error;
    }
  }
  
  static async cleanup() {
    try {
      const collections = await mongoose.connection.db.collections();
      
      for (const collection of collections) {
        await collection.deleteMany({});
      }
      
      logger.info('Test database cleaned up');
    } catch (error) {
      logger.error('Test database cleanup failed', { error: error.message });
      throw error;
    }
  }
  
  static async seed(data = {}) {
    try {
      const { User, Timesheet, Leave, Training, Rota } = await import('../models');
      
      // Seed users
      if (data.users) {
        await User.insertMany(data.users);
      }
      
      // Seed timesheets
      if (data.timesheets) {
        await Timesheet.insertMany(data.timesheets);
      }
      
      // Seed leave requests
      if (data.leaves) {
        await Leave.insertMany(data.leaves);
      }
      
      // Seed training records
      if (data.trainings) {
        await Training.insertMany(data.trainings);
      }
      
      // Seed rotas
      if (data.rotas) {
        await Rota.insertMany(data.rotas);
      }
      
      logger.info('Test database seeded', {
        users: data.users?.length || 0,
        timesheets: data.timesheets?.length || 0,
        leaves: data.leaves?.length || 0,
        trainings: data.trainings?.length || 0,
        rotas: data.rotas?.length || 0
      });
    } catch (error) {
      logger.error('Test database seeding failed', { error: error.message });
      throw error;
    }
  }
}

// API test utilities
export class ApiTestHelper {
  constructor(baseUrl = TEST_CONFIG.api.baseUrl) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }
  
  async request(method, endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      method,
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options
    };
    
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, config);
      const duration = Date.now() - startTime;
      
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
        duration,
        ok: response.ok
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('API test request failed', {
        method,
        url,
        error: error.message,
        duration
      });
      
      throw error;
    }
  }
  
  async get(endpoint, options = {}) {
    return this.request('GET', endpoint, options);
  }
  
  async post(endpoint, body, options = {}) {
    return this.request('POST', endpoint, { ...options, body });
  }
  
  async put(endpoint, body, options = {}) {
    return this.request('PUT', endpoint, { ...options, body });
  }
  
  async patch(endpoint, body, options = {}) {
    return this.request('PATCH', endpoint, { ...options, body });
  }
  
  async delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, options);
  }
  
  setAuthToken(token) {
    this.defaultHeaders.Authorization = `Bearer ${token}`;
  }
  
  clearAuthToken() {
    delete this.defaultHeaders.Authorization;
  }
}

// Test assertions and matchers
export const TestAssertions = {
  // Response assertions
  assertResponseOk: (response) => {
    if (!response.ok) {
      throw new Error(`Expected response to be ok, got ${response.status}: ${response.statusText}`);
    }
  },
  
  assertResponseStatus: (response, expectedStatus) => {
    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
    }
  },
  
  assertResponseTime: (response, maxTime = TEST_CONFIG.performance.maxResponseTime) => {
    if (response.duration > maxTime) {
      throw new Error(`Response time ${response.duration}ms exceeded maximum ${maxTime}ms`);
    }
  },
  
  // Data assertions
  assertValidUser: (user) => {
    const required = ['username', 'email', 'name'];
    for (const field of required) {
      if (!user[field]) {
        throw new Error(`User missing required field: ${field}`);
      }
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      throw new Error(`Invalid email format: ${user.email}`);
    }
  },
  
  assertValidTimesheet: (timesheet) => {
    const required = ['username', 'weekStarting', 'entries'];
    for (const field of required) {
      if (!timesheet[field]) {
        throw new Error(`Timesheet missing required field: ${field}`);
      }
    }
    
    if (!Array.isArray(timesheet.entries)) {
      throw new Error('Timesheet entries must be an array');
    }
  },
  
  assertValidLeaveRequest: (leave) => {
    const required = ['username', 'leaveType', 'startDate', 'endDate'];
    for (const field of required) {
      if (!leave[field]) {
        throw new Error(`Leave request missing required field: ${field}`);
      }
    }
    
    if (new Date(leave.startDate) > new Date(leave.endDate)) {
      throw new Error('Leave start date must be before end date');
    }
  }
};

// Performance testing utilities
export class PerformanceTestHelper {
  static async measureFunction(fn, iterations = 1) {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = process.hrtime.bigint();
      const startMemory = process.memoryUsage();
      
      try {
        const result = await fn();
        
        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
        
        results.push({
          iteration: i + 1,
          duration,
          memoryDelta,
          result,
          success: true
        });
      } catch (error) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        
        results.push({
          iteration: i + 1,
          duration,
          error: error.message,
          success: false
        });
      }
    }
    
    // Calculate statistics
    const successfulResults = results.filter(r => r.success);
    const durations = successfulResults.map(r => r.duration);
    const memoryDeltas = successfulResults.map(r => r.memoryDelta);
    
    return {
      iterations,
      successful: successfulResults.length,
      failed: results.length - successfulResults.length,
      duration: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        median: durations.sort()[Math.floor(durations.length / 2)]
      },
      memory: {
        min: Math.min(...memoryDeltas),
        max: Math.max(...memoryDeltas),
        avg: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length
      },
      results
    };
  }
  
  static async loadTest(fn, options = {}) {
    const {
      concurrent = 10,
      duration = 10000, // 10 seconds
      rampUp = 1000 // 1 second
    } = options;
    
    const results = [];
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    // Ramp up concurrent executions
    const promises = [];
    for (let i = 0; i < concurrent; i++) {
      setTimeout(() => {
        const runTest = async () => {
          while (Date.now() < endTime) {
            try {
              const testStart = Date.now();
              await fn();
              const testDuration = Date.now() - testStart;
              
              results.push({
                timestamp: testStart,
                duration: testDuration,
                success: true
              });
            } catch (error) {
              results.push({
                timestamp: Date.now(),
                error: error.message,
                success: false
              });
            }
          }
        };
        
        promises.push(runTest());
      }, (i * rampUp) / concurrent);
    }
    
    await Promise.all(promises);
    
    // Calculate statistics
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const durations = successful.map(r => r.duration);
    
    return {
      totalRequests: results.length,
      successful: successful.length,
      failed: failed.length,
      successRate: (successful.length / results.length) * 100,
      duration: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        p95: durations.sort()[Math.floor(durations.length * 0.95)],
        p99: durations.sort()[Math.floor(durations.length * 0.99)]
      },
      throughput: successful.length / (duration / 1000), // requests per second
      errors: failed.map(r => r.error)
    };
  }
}

// Mock utilities
export class MockHelper {
  static mockConsole() {
    const originalConsole = { ...console };
    const logs = [];
    
    console.log = (...args) => logs.push({ level: 'log', args });
    console.error = (...args) => logs.push({ level: 'error', args });
    console.warn = (...args) => logs.push({ level: 'warn', args });
    console.info = (...args) => logs.push({ level: 'info', args });
    
    return {
      logs,
      restore: () => {
        Object.assign(console, originalConsole);
      }
    };
  }
  
  static mockDate(fixedDate) {
    const originalDate = Date;
    const fixedTime = new Date(fixedDate).getTime();
    
    global.Date = class extends Date {
      constructor(...args) {
        if (args.length === 0) {
          super(fixedTime);
        } else {
          super(...args);
        }
      }
      
      static now() {
        return fixedTime;
      }
    };
    
    return {
      restore: () => {
        global.Date = originalDate;
      }
    };
  }
  
  static mockEnvironment(envVars) {
    const originalEnv = { ...process.env };
    
    Object.assign(process.env, envVars);
    
    return {
      restore: () => {
        process.env = originalEnv;
      }
    };
  }
}

// Test suite utilities
export class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
    this.beforeAllHooks = [];
    this.afterAllHooks = [];
  }
  
  beforeAll(fn) {
    this.beforeAllHooks.push(fn);
  }
  
  afterAll(fn) {
    this.afterAllHooks.push(fn);
  }
  
  beforeEach(fn) {
    this.beforeEachHooks.push(fn);
  }
  
  afterEach(fn) {
    this.afterEachHooks.push(fn);
  }
  
  test(name, fn) {
    this.tests.push({ name, fn });
  }
  
  async run() {
    const results = {
      suite: this.name,
      total: this.tests.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      tests: []
    };
    
    const suiteStartTime = Date.now();
    
    try {
      // Run beforeAll hooks
      for (const hook of this.beforeAllHooks) {
        await hook();
      }
      
      // Run tests
      for (const test of this.tests) {
        const testStartTime = Date.now();
        const testResult = {
          name: test.name,
          status: 'passed',
          duration: 0,
          error: null
        };
        
        try {
          // Run beforeEach hooks
          for (const hook of this.beforeEachHooks) {
            await hook();
          }
          
          // Run test
          await test.fn();
          
          testResult.status = 'passed';
          results.passed++;
        } catch (error) {
          testResult.status = 'failed';
          testResult.error = error.message;
          results.failed++;
          
          logger.error('Test failed', {
            suite: this.name,
            test: test.name,
            error: error.message
          });
        } finally {
          // Run afterEach hooks
          for (const hook of this.afterEachHooks) {
            try {
              await hook();
            } catch (error) {
              logger.error('AfterEach hook failed', {
                suite: this.name,
                test: test.name,
                error: error.message
              });
            }
          }
          
          testResult.duration = Date.now() - testStartTime;
          results.tests.push(testResult);
        }
      }
      
      // Run afterAll hooks
      for (const hook of this.afterAllHooks) {
        await hook();
      }
    } catch (error) {
      logger.error('Test suite setup/teardown failed', {
        suite: this.name,
        error: error.message
      });
    }
    
    results.duration = Date.now() - suiteStartTime;
    
    logger.info('Test suite completed', results);
    
    return results;
  }
}