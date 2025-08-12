// Test API call directly
process.env.MONGO_URI = 'mongodb+srv://deerparktimesheeets:deerparktimesheeets@deerparktimesheeetsclus.1ez72by.mongodb.net/deerpark?retryWrites=true&w=majority&appName=deerparktimesheeetsCluster';

const connectMongo = require('./db/connectMongo.js').default;
const Timesheet = require('./models/Timesheet.js').default;
const { getFourWeekCycle } = require('./utils/weekCycleUtils.js');

async function testAPI() {
  try {
    await connectMongo();
    
    const username = 'yeasir afgan';
    const page = 1;
    const limit = 10;
    const includeDrafts = false;
    
    // Get current cycle dates
    const today = new Date();
    const cycles = getFourWeekCycle(today);
    const startOfRange = cycles[0].start;
    const endOfWeek = cycles[3].end;
    
    console.log('API Test Parameters:');
    console.log('Username:', username);
    console.log('Start Date:', startOfRange.toLocaleDateString('en-GB'));
    console.log('End Date:', endOfWeek.toLocaleDateString('en-GB'));
    console.log('Include Drafts:', includeDrafts);
    console.log();
    
    // Build the same query as the API
    const query = {
      username,
      date: { $gte: startOfRange, $lte: endOfWeek },
    };
    
    if (!includeDrafts) {
      query.$or = [
        { isDraft: { $exists: false } },
        { isDraft: false },
        { isDraft: null }
      ];
    }
    
    console.log('MongoDB Query:', JSON.stringify(query, null, 2));
    console.log();
    
    const timesheets = await Timesheet.find(query)
      .sort({ date: -1 })
      .limit(limit)
      .lean();
    
    console.log(`Found ${timesheets.length} timesheets`);
    
    if (timesheets.length > 0) {
      console.log('\nTimesheets found:');
      timesheets.forEach((ts, index) => {
        console.log(`${index + 1}. Date: ${new Date(ts.date).toLocaleDateString('en-GB')}, Start: ${ts.start}, End: ${ts.end}, Draft: ${ts.isDraft}`);
      });
    } else {
      console.log('No timesheets found with the current query.');
      
      // Let's try without the draft filter
      console.log('\nTrying without draft filter...');
      const queryWithoutDraftFilter = {
        username,
        date: { $gte: startOfRange, $lte: endOfWeek },
      };
      
      const allTimesheets = await Timesheet.find(queryWithoutDraftFilter)
        .sort({ date: -1 })
        .limit(limit)
        .lean();
      
      console.log(`Found ${allTimesheets.length} timesheets without draft filter`);
      
      if (allTimesheets.length > 0) {
        console.log('\nAll timesheets in date range:');
        allTimesheets.forEach((ts, index) => {
          console.log(`${index + 1}. Date: ${new Date(ts.date).toLocaleDateString('en-GB')}, Start: ${ts.start}, End: ${ts.end}, Draft: ${ts.isDraft}`);
        });
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAPI();