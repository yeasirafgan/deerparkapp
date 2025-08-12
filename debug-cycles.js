// Debug script to check cycle calculation
const REFERENCE_START_DATE = new Date('2025-03-03T00:00:00.000Z');

const findCycleForDate = (date) => {
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);
  
  const refDate = new Date(REFERENCE_START_DATE);
  refDate.setHours(0, 0, 0, 0);
  
  const daysSinceReference = Math.floor((current - refDate) / (1000 * 60 * 60 * 24));
  
  let cycleNumber = 0;
  let cycleStart = new Date(refDate);
  let cycleEnd;
  
  do {
    cycleStart = new Date(refDate);
    cycleStart.setDate(cycleStart.getDate() + (cycleNumber * 28));
    
    cycleEnd = new Date(cycleStart);
    cycleEnd.setDate(cycleEnd.getDate() + 27);
    
    if (current >= cycleStart && current <= cycleEnd) {
      return cycleNumber;
    }
    
    cycleNumber++;
  } while (cycleStart <= current);
  
  return Math.max(0, cycleNumber - 1);
};

const getFourWeekCycle = (currentDate) => {
  const current = new Date(currentDate);
  const cycleNumber = findCycleForDate(current);
  
  const refDate = new Date(REFERENCE_START_DATE);
  refDate.setHours(0, 0, 0, 0);
  
  const cycleStart = new Date(refDate);
  cycleStart.setDate(cycleStart.getDate() + (cycleNumber * 28));
  
  const cycles = [];
  let weekStart = new Date(cycleStart);
  
  for (let i = 0; i < 4; i++) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    cycles.push({
      start: new Date(weekStart),
      end: new Date(weekEnd)
    });
    
    weekStart = new Date(weekStart);
    weekStart.setDate(weekStart.getDate() + 7);
  }
  
  return cycles;
};

// Test with current date
const today = new Date();
console.log('Current date:', today.toLocaleDateString('en-GB'));
console.log('Reference date:', REFERENCE_START_DATE.toLocaleDateString('en-GB'));

const cycles = getFourWeekCycle(today);
console.log('\nCalculated cycles:');
cycles.forEach((cycle, index) => {
  console.log(`Week ${index + 1}: ${cycle.start.toLocaleDateString('en-GB')} - ${cycle.end.toLocaleDateString('en-GB')}`);
});

const cycleNumber = findCycleForDate(today);
console.log('\nCycle number:', cycleNumber);