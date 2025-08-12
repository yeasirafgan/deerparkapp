// utils/dbConnection.js

import mongoose from 'mongoose';
import { logger } from './logger';
import { DatabaseError } from './errorHandler';

/**
 * Enhanced database connection utility with connection pooling and monitoring
 */

// Connection state tracking
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY = 5000; // 5 seconds

// Connection options for optimal performance
const connectionOptions = {
  // Connection pool settings
  maxPoolSize: 10, // Maximum number of connections
  minPoolSize: 2,  // Minimum number of connections
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  serverSelectionTimeoutMS: 5000, // How long to try selecting a server
  socketTimeoutMS: 45000, // How long to wait for a response
  
  // Buffering settings
  bufferCommands: false, // Disable mongoose buffering
  bufferMaxEntries: 0, // Disable mongoose buffering
  
  // Other settings
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// Enhanced connection function with retry logic
export const connectToDatabase = async () => {
  if (isConnected) {
    logger.debug('Using existing database connection');
    return mongoose.connection;
  }
  
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    const error = new DatabaseError('MONGODB_URI environment variable is not defined');
    logger.error('Database connection failed', { error: error.message });
    throw error;
  }
  
  try {
    logger.info('Attempting to connect to database', { 
      attempt: connectionAttempts + 1,
      maxAttempts: MAX_RETRY_ATTEMPTS 
    });
    
    const startTime = Date.now();
    
    await mongoose.connect(mongoUri, connectionOptions);
    
    const connectionTime = Date.now() - startTime;
    isConnected = true;
    connectionAttempts = 0;
    
    logger.info('Database connected successfully', {
      connectionTime: `${connectionTime}ms`,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    });
    
    // Set up connection event listeners
    setupConnectionListeners();
    
    return mongoose.connection;
    
  } catch (error) {
    connectionAttempts++;
    isConnected = false;
    
    logger.error('Database connection failed', {
      attempt: connectionAttempts,
      maxAttempts: MAX_RETRY_ATTEMPTS,
      error: error.message,
      stack: error.stack
    });
    
    if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
      logger.info(`Retrying connection in ${RETRY_DELAY / 1000} seconds...`);
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectToDatabase(); // Recursive retry
    } else {
      const dbError = new DatabaseError(`Failed to connect to database after ${MAX_RETRY_ATTEMPTS} attempts`);
      logger.error('Max connection attempts reached', { error: dbError.message });
      throw dbError;
    }
  }
};

// Set up connection event listeners
const setupConnectionListeners = () => {
  const connection = mongoose.connection;
  
  // Remove existing listeners to prevent duplicates
  connection.removeAllListeners('connected');
  connection.removeAllListeners('error');
  connection.removeAllListeners('disconnected');
  connection.removeAllListeners('reconnected');
  
  connection.on('connected', () => {
    isConnected = true;
    logger.info('Database connected');
  });
  
  connection.on('error', (error) => {
    isConnected = false;
    logger.error('Database connection error', { error: error.message });
  });
  
  connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('Database disconnected');
  });
  
  connection.on('reconnected', () => {
    isConnected = true;
    logger.info('Database reconnected');
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    await gracefulShutdown('SIGINT');
  });
  
  process.on('SIGTERM', async () => {
    await gracefulShutdown('SIGTERM');
  });
};

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, closing database connection...`);
  
  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('Database connection closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during database shutdown', { error: error.message });
    process.exit(1);
  }
};

// Get connection status
export const getConnectionStatus = () => {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    connectionAttempts
  };
};

// Health check function
export const healthCheck = async () => {
  try {
    if (!isConnected) {
      throw new DatabaseError('Database not connected');
    }
    
    // Simple ping to check if database is responsive
    await mongoose.connection.db.admin().ping();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      ...getConnectionStatus()
    };
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      ...getConnectionStatus()
    };
  }
};

// Connection pool monitoring
export const getPoolStats = () => {
  const connection = mongoose.connection;
  
  if (!connection.db) {
    return null;
  }
  
  return {
    totalConnections: connection.db.serverConfig?.connections?.length || 0,
    availableConnections: connection.db.serverConfig?.availableConnections?.length || 0,
    checkedOutConnections: connection.db.serverConfig?.checkedOutConnections?.length || 0
  };
};

// Transaction helper with automatic retry
export const withTransaction = async (operations, options = {}) => {
  const session = await mongoose.startSession();
  
  try {
    const result = await session.withTransaction(async () => {
      logger.debug('Starting database transaction');
      const startTime = Date.now();
      
      try {
        const result = await operations(session);
        const duration = Date.now() - startTime;
        
        logger.debug('Transaction completed successfully', { 
          duration: `${duration}ms` 
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        logger.error('Transaction failed', {
          duration: `${duration}ms`,
          error: error.message
        });
        
        throw error;
      }
    }, {
      readPreference: 'primary',
      readConcern: { level: 'local' },
      writeConcern: { w: 'majority' },
      ...options
    });
    
    return result;
  } finally {
    await session.endSession();
  }
};

// Backward compatibility with existing connectMongo
export default connectToDatabase;

// Export for use in existing code
export const connectMongo = connectToDatabase;