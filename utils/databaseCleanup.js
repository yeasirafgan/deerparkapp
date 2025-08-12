// utils/databaseCleanup.js

import connectMongo from '../db/connectMongo';
import Timesheet from '../models/Timesheet';
import LeaveHours from '../models/LeaveHours';
import Leave from '../models/Leave';
import Training from '../models/Training';
import WeeklySummary from '../models/WeeklySummary';
import User from '../models/User';
import Rota from '../models/Rota';

/**
 * Comprehensive database cleanup utilities
 */

// Clean up all data for a specific user
export const cleanupUserData = async (userId) => {
  try {
    await connectMongo();
    
    const results = await Promise.allSettled([
      Timesheet.deleteMany({ userId }),
      LeaveHours.deleteMany({ userId }),
      Leave.deleteMany({ userId }),
      Training.deleteMany({ userId }),
      WeeklySummary.deleteMany({ userId })
    ]);
    
    const deletedCounts = {
      timesheets: results[0].status === 'fulfilled' ? results[0].value.deletedCount : 0,
      leaveHours: results[1].status === 'fulfilled' ? results[1].value.deletedCount : 0,
      leaves: results[2].status === 'fulfilled' ? results[2].value.deletedCount : 0,
      training: results[3].status === 'fulfilled' ? results[3].value.deletedCount : 0,
      weeklySummaries: results[4].status === 'fulfilled' ? results[4].value.deletedCount : 0
    };
    
    console.log(`🧹 Cleaned up user data for ${userId}:`, deletedCounts);
    return deletedCounts;
  } catch (error) {
    console.error('❌ Error cleaning up user data:', error);
    throw error;
  }
};

// Clean up orphaned weekly summaries (summaries without corresponding timesheets)
export const cleanupOrphanedWeeklySummaries = async () => {
  try {
    await connectMongo();
    
    // Get all weekly summaries
    const summaries = await WeeklySummary.find({});
    const orphanedSummaries = [];
    
    for (const summary of summaries) {
      // Check if there are any timesheets for this user in the date range
      const timesheetExists = await Timesheet.findOne({
        userId: summary.userId,
        date: {
          $gte: summary.startDate,
          $lte: summary.endDate
        }
      });
      
      if (!timesheetExists) {
        orphanedSummaries.push(summary._id);
      }
    }
    
    if (orphanedSummaries.length > 0) {
      const result = await WeeklySummary.deleteMany({
        _id: { $in: orphanedSummaries }
      });
      
      console.log(`🧹 Cleaned up ${result.deletedCount} orphaned weekly summaries`);
      return result.deletedCount;
    }
    
    return 0;
  } catch (error) {
    console.error('❌ Error cleaning up orphaned summaries:', error);
    throw error;
  }
};

// Clean up draft records older than specified days
export const cleanupOldDrafts = async (daysOld = 30) => {
  try {
    await connectMongo();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const results = await Promise.allSettled([
      Timesheet.deleteMany({ 
        isDraft: true, 
        createdAt: { $lt: cutoffDate } 
      }),
      LeaveHours.deleteMany({ 
        isDraft: true, 
        createdAt: { $lt: cutoffDate } 
      }),
      Leave.deleteMany({ 
        isDraft: true, 
        createdAt: { $lt: cutoffDate } 
      }),
      Training.deleteMany({ 
        isDraft: true, 
        createdAt: { $lt: cutoffDate } 
      })
    ]);
    
    const deletedCounts = {
      timesheets: results[0].status === 'fulfilled' ? results[0].value.deletedCount : 0,
      leaveHours: results[1].status === 'fulfilled' ? results[1].value.deletedCount : 0,
      leaves: results[2].status === 'fulfilled' ? results[2].value.deletedCount : 0,
      training: results[3].status === 'fulfilled' ? results[3].value.deletedCount : 0
    };
    
    console.log(`🧹 Cleaned up old drafts (${daysOld}+ days):`, deletedCounts);
    return deletedCounts;
  } catch (error) {
    console.error('❌ Error cleaning up old drafts:', error);
    throw error;
  }
};

// Get database storage statistics
export const getDatabaseStats = async () => {
  try {
    await connectMongo();
    
    const stats = await Promise.allSettled([
      Timesheet.countDocuments(),
      LeaveHours.countDocuments(),
      Leave.countDocuments(),
      Training.countDocuments(),
      WeeklySummary.countDocuments(),
      User.countDocuments(),
      Rota.countDocuments()
    ]);
    
    return {
      timesheets: stats[0].status === 'fulfilled' ? stats[0].value : 0,
      leaveHours: stats[1].status === 'fulfilled' ? stats[1].value : 0,
      leaves: stats[2].status === 'fulfilled' ? stats[2].value : 0,
      training: stats[3].status === 'fulfilled' ? stats[3].value : 0,
      weeklySummaries: stats[4].status === 'fulfilled' ? stats[4].value : 0,
      users: stats[5].status === 'fulfilled' ? stats[5].value : 0,
      rotas: stats[6].status === 'fulfilled' ? stats[6].value : 0
    };
  } catch (error) {
    console.error('❌ Error getting database stats:', error);
    throw error;
  }
};

// Complete database cleanup (use with caution)
export const completeCleanup = async () => {
  try {
    await connectMongo();
    
    const results = await Promise.allSettled([
      Timesheet.deleteMany({}),
      LeaveHours.deleteMany({}),
      Leave.deleteMany({}),
      Training.deleteMany({}),
      WeeklySummary.deleteMany({}),
      // Note: Not deleting Users and Rotas as they might be needed
    ]);
    
    const deletedCounts = {
      timesheets: results[0].status === 'fulfilled' ? results[0].value.deletedCount : 0,
      leaveHours: results[1].status === 'fulfilled' ? results[1].value.deletedCount : 0,
      leaves: results[2].status === 'fulfilled' ? results[2].value.deletedCount : 0,
      training: results[3].status === 'fulfilled' ? results[3].value.deletedCount : 0,
      weeklySummaries: results[4].status === 'fulfilled' ? results[4].value.deletedCount : 0
    };
    
    console.log('🧹 Complete database cleanup completed:', deletedCounts);
    return deletedCounts;
  } catch (error) {
    console.error('❌ Error during complete cleanup:', error);
    throw error;
  }
};