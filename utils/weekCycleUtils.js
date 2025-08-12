// utils/weekCycleUtils.js

const REFERENCE_START_DATE = new Date('2025-03-03T00:00:00.000Z'); // Company's 4-week cycle start date (Monday)

// Helper function to find the correct cycle for a given date
const findCycleForDate = (date) => {
  // Ensure we're working with a consistent date representation
  const current = new Date(date);
  current.setHours(0, 0, 0, 0); // Normalize time to start of day
  
  // Create a normalized reference date (time set to 00:00:00)
  const refDate = new Date(REFERENCE_START_DATE);
  refDate.setHours(0, 0, 0, 0);
  
  // Calculate days since reference
  const daysSinceReference = Math.floor((current - refDate) / (1000 * 60 * 60 * 24));
  
  // Start with the first cycle
  let cycleNumber = 0;
  let cycleStart = new Date(refDate);
  let cycleEnd;
  
  // Find the cycle that contains the current date
  do {
    cycleStart = new Date(refDate);
    cycleStart.setDate(cycleStart.getDate() + (cycleNumber * 28));
    
    cycleEnd = new Date(cycleStart);
    cycleEnd.setDate(cycleEnd.getDate() + 27); // 28 days total (0-27)
    
    // If current date is within this cycle, we found it
    if (current >= cycleStart && current <= cycleEnd) {
      return cycleNumber;
    }
    
    cycleNumber++;
  } while (cycleStart <= current);
  
  // If we get here, use the previous cycle
  return Math.max(0, cycleNumber - 1);
};

export const getFourWeekCycle = (currentDate) => {
  const current = new Date(currentDate);
  
  // Find the correct cycle number for this date
  const cycleNumber = findCycleForDate(current);
  
  // Calculate the start of the current cycle
  const refDate = new Date(REFERENCE_START_DATE);
  refDate.setHours(0, 0, 0, 0);
  
  const cycleStart = new Date(refDate);
  cycleStart.setDate(cycleStart.getDate() + (cycleNumber * 28));
  
  const cycles = [];
  let weekStart = new Date(cycleStart);
  
  // Create the 4 weeks in the cycle
  for (let i = 0; i < 4; i++) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // End of week is 6 days after start
    
    cycles.push({
      start: new Date(weekStart),
      end: new Date(weekEnd)
    });
    
    // Move to next week
    weekStart = new Date(weekStart);
    weekStart.setDate(weekStart.getDate() + 7);
  }
  
  return cycles;
};
