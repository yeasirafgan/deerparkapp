// utils/paymentCycleUtils.js

import { getFourWeekCycle } from './weekCycleUtils.js';

/**
 * Get the current payment cycle information including grace period logic
 * @param {Date} currentDate - The current date
 * @returns {Object} Payment cycle information
 */
export const getPaymentCycleInfo = (currentDate = new Date()) => {
  const current = new Date(currentDate);
  const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentHour = current.getHours();
  
  // Get current 4-week cycle
  const currentCycle = getFourWeekCycle(current);
  const cycleStart = currentCycle[0].start;
  const cycleEnd = currentCycle[3].end;
  
  // Calculate previous cycle (4 weeks before)
  const previousCycleStart = new Date(cycleStart);
  previousCycleStart.setDate(previousCycleStart.getDate() - 28);
  const previousCycle = getFourWeekCycle(previousCycleStart);
  
  // Determine if we're in the grace period (Monday to Saturday after cycle end)
  const isInGracePeriod = isWithinGracePeriod(current, cycleEnd);
  
  return {
    currentCycle: {
      start: cycleStart,
      end: cycleEnd,
      weeks: currentCycle
    },
    previousCycle: {
      start: previousCycle[0].start,
      end: previousCycle[3].end,
      weeks: previousCycle
    },
    isInGracePeriod,
    shouldShowPreviousCycle: isInGracePeriod,
    paymentCutoffDate: getNextPaymentCutoff(current)
  };
};

/**
 * Check if the current date is within the grace period
 * Grace period: Monday to Saturday (23:59) after the 4-week cycle ends
 * @param {Date} currentDate - The current date
 * @param {Date} cycleEndDate - The end date of the current cycle
 * @returns {boolean} True if within grace period
 */
export const isWithinGracePeriod = (currentDate, cycleEndDate) => {
  const current = new Date(currentDate);
  const cycleEnd = new Date(cycleEndDate);
  
  // Calculate the Monday after cycle end (start of grace period)
  const gracePeriodStart = new Date(cycleEnd);
  gracePeriodStart.setDate(gracePeriodStart.getDate() + 1); // Day after cycle end
  
  // Find the next Monday if cycle doesn't end on Sunday
  const cycleEndDay = cycleEnd.getDay();
  if (cycleEndDay !== 0) { // If cycle doesn't end on Sunday
    const daysToMonday = (8 - cycleEndDay) % 7;
    gracePeriodStart.setDate(gracePeriodStart.getDate() + daysToMonday);
  }
  
  // Calculate the Saturday night (23:59) that ends the grace period
  const gracePeriodEnd = new Date(gracePeriodStart);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 5); // Monday + 5 = Saturday
  gracePeriodEnd.setHours(23, 59, 59, 999);
  
  return current >= gracePeriodStart && current <= gracePeriodEnd;
};

/**
 * Get the next payment cutoff date (next Saturday 23:59)
 * @param {Date} currentDate - The current date
 * @returns {Date} Next payment cutoff date
 */
export const getNextPaymentCutoff = (currentDate = new Date()) => {
  const current = new Date(currentDate);
  const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Calculate days until next Saturday
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  
  const nextSaturday = new Date(current);
  nextSaturday.setDate(current.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
  nextSaturday.setHours(23, 59, 59, 999);
  
  return nextSaturday;
};

/**
 * Get the appropriate cycle data based on current date and grace period
 * @param {Date} currentDate - The current date
 * @returns {Object} Cycle data with appropriate period
 */
export const getDisplayCycleData = (currentDate = new Date()) => {
  const paymentInfo = getPaymentCycleInfo(currentDate);
  
  if (paymentInfo.isInGracePeriod) {
    return {
      displayCycle: paymentInfo.previousCycle,
      isGracePeriod: true,
      message: 'Showing previous payment period (grace period until Saturday)'
    };
  }
  
  return {
    displayCycle: paymentInfo.currentCycle,
    isGracePeriod: false,
    message: 'Showing current payment period'
  };
};

/**
 * Format a date range for display
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {string} Formatted date range
 */
export const formatDateRange = (startDate, endDate) => {
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const start = startDate.toLocaleDateString('en-US', options);
  const end = endDate.toLocaleDateString('en-US', options);
  return `${start} - ${end}`;
};

/**
 * Check if a date falls within a specific cycle
 * @param {Date} date - Date to check
 * @param {Object} cycle - Cycle object with start and end dates
 * @returns {boolean} True if date is within cycle
 */
export const isDateInCycle = (date, cycle) => {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  const cycleStart = new Date(cycle.start);
  cycleStart.setHours(0, 0, 0, 0);
  
  const cycleEnd = new Date(cycle.end);
  cycleEnd.setHours(23, 59, 59, 999);
  
  return checkDate >= cycleStart && checkDate <= cycleEnd;
};