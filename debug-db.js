// Debug script to check database contents
process.env.MONGO_URI = 'mongodb+srv://deerparktimesheeets:deerparktimesheeets@deerparktimesheeetsclus.1ez72by.mongodb.net/deerpark?retryWrites=true&w=majority&appName=deerparktimesheeetsCluster';

const connectMongo = require('./db/connectMongo.js').default;
const Timesheet = require('./models/Timesheet.js').default;

async function checkDatabase() {
  try {
    await connectMongo();
    
    console.log('Connected to database');
    
    // Get all timesheets for the user
    const allTimesheets = await Timesheet.find({ username: 'yeasir afgan' }).sort({ date: -1 });
    console.log(`\nTotal timesheets found for 'yeasir afgan': ${allTimesheets.length}`);
    
    if (allTimesheets.length > 0) {
      console.log('\nAll timesheets:');
      allTimesheets.forEach((ts, index) => {
        console.log(`${index + 1}. Date: ${ts.date.toLocaleDateString('en-GB')}, Start: ${ts.start}, End: ${ts.end}, Draft: ${ts.isDraft}`);
      });
      
      // Check timesheets in current cycle
      const today = new Date();
      const cycleStart = new Date('2025-07-21');
      const cycleEnd = new Date('2025-08-17');
      cycleEnd.setHours(23, 59, 59, 999);
      
      const cycleTimesheets = allTimesheets.filter(ts => {
        const tsDate = new Date(ts.date);
        return tsDate >= cycleStart && tsDate <= cycleEnd;
      });
      
      console.log(`\nTimesheets in current cycle (${cycleStart.toLocaleDateString('en-GB')} - ${cycleEnd.toLocaleDateString('en-GB')}): ${cycleTimesheets.length}`);
      
      if (cycleTimesheets.length > 0) {
        console.log('Current cycle timesheets:');
        cycleTimesheets.forEach((ts, index) => {
          console.log(`${index + 1}. Date: ${ts.date.toLocaleDateString('en-GB')}, Start: ${ts.start}, End: ${ts.end}, Draft: ${ts.isDraft}`);
        });
      }
      
      // Check non-draft timesheets
      const nonDraftTimesheets = allTimesheets.filter(ts => !ts.isDraft);
      console.log(`\nNon-draft timesheets: ${nonDraftTimesheets.length}`);
      
      if (nonDraftTimesheets.length > 0) {
        console.log('Non-draft timesheets:');
        nonDraftTimesheets.forEach((ts, index) => {
          console.log(`${index + 1}. Date: ${ts.date.toLocaleDateString('en-GB')}, Start: ${ts.start}, End: ${ts.end}, Draft: ${ts.isDraft}`);
        });
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDatabase();