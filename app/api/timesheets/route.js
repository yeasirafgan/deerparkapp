import connectMongo from '@/db/connectMongo';
import Timesheet from '@/models/Timesheet';
import { NextResponse } from 'next/server';
import {
  calculateTotalMinutes,
  convertMinutesToHours,
} from '@/utils/dateUtils';
import { getFourWeekCycle } from '@/utils/weekCycleUtils';


export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Helper function to parse time strings
const parseTimeToDate = (timeString) => {
  const today = new Date();
  const [hours, minutes] = timeString.split(':');
  today.setHours(hours, minutes, 0, 0); // Set hours and minutes, leave the rest as default
  return today;
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const includeDrafts = searchParams.get('includeDrafts') === 'true';
    const draftsOnly = searchParams.get('draftsOnly') === 'true';
    const customStartDate = searchParams.get('startDate');
    const customEndDate = searchParams.get('endDate');
    const weeks = 4;

    await connectMongo();

    let startOfRange, endOfWeek, cycles;
    
    // Use custom date range if provided (for grace period), otherwise use current cycle
    if (customStartDate && customEndDate) {
      startOfRange = new Date(customStartDate);
      endOfWeek = new Date(customEndDate);
      // Set end of day for endDate
      endOfWeek.setHours(23, 59, 59, 999);
      cycles = [{ start: startOfRange, end: endOfWeek }]; // Simplified for logging
    } else {
      const today = new Date();
      cycles = getFourWeekCycle(today);
      const startOfCycle = cycles[0].start.toISOString();
      const endOfCycle = cycles[3].end.toISOString();
      startOfRange = new Date(startOfCycle);
      endOfWeek = new Date(endOfCycle);
    }

    console.log('\n=== Timesheet Query Range ===');
    console.log(`Range Start: ${startOfRange.toLocaleDateString('en-GB')}`);
    console.log(`Range End: ${endOfWeek.toLocaleDateString('en-GB')}`);
    if (customStartDate && customEndDate) {
      console.log('Using custom date range (Grace Period)');
    } else {
      console.log('\nWeekly Breakdown:');
      cycles.forEach((cycle, index) => {
        console.log(`Week ${index + 1}: ${new Date(cycle.start).toLocaleDateString('en-GB')} - ${new Date(cycle.end).toLocaleDateString('en-GB')}`);
      });
    }
    console.log('===============================\n');

    const skip = (page - 1) * limit;

    // Build query with draft filtering
    const query = {
      username,
      date: { $gte: startOfRange, $lte: endOfWeek },
    };
    
    if (draftsOnly) {
      query.isDraft = true;
    } else if (!includeDrafts) {
      // Exclude drafts - handle records where isDraft is true, undefined, or null
      // Only include records where isDraft is explicitly false or doesn't exist
      query.$or = [
        { isDraft: { $exists: false } },
        { isDraft: false },
        { isDraft: null }
      ];
    }
    
    // Ensure timesheets are within the correct cycle
    const timesheets = await Timesheet.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean for faster reads

    // Add hours and minutes calculation for each timesheet
    const enrichedTimesheets = timesheets.map((ts) => {
      // Parse start and end times with helper function
      const startDate = parseTimeToDate(ts.start);
      const endDate = parseTimeToDate(ts.end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return { ...ts, hours: 'Invalid', minutes: 'Invalid' };
      }

      // Calculate the duration in minutes
      const durationInMinutes = (endDate - startDate) / (1000 * 60); // Convert milliseconds to minutes

      const { hours, minutes } =
        durationInMinutes >= 0
          ? convertMinutesToHours(durationInMinutes)
          : { hours: 0, minutes: 0 };

      return { ...ts, hours, minutes };
    });

    // Fetch all timesheets for total calculation (excluding drafts unless specifically requested)
    const totalQuery = {
      username,
      date: { $gte: startOfRange, $lte: endOfWeek },
    };
    
    if (!includeDrafts) {
      // Exclude drafts - same logic as main query
      totalQuery.$or = [
        { isDraft: { $exists: false } },
        { isDraft: false },
        { isDraft: null }
      ];
    }
    
    const allTimesheets = await Timesheet.find(totalQuery);

    const totalMinutes = calculateTotalMinutes(allTimesheets);
    const { hours: totalHours, minutes: remainingMinutes } =
      convertMinutesToHours(totalMinutes);

    const totalCount = await Timesheet.countDocuments(query);

    return NextResponse.json({
      timesheets: enrichedTimesheets,
      totalCount,
      totalHours,
      remainingMinutes,
    });
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timesheets' },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    await connectMongo();
    const { id, isDraft } = await req.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Timesheet ID is required' },
        { status: 400 }
      );
    }
    
    const timesheet = await Timesheet.findById(id);
    if (!timesheet) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }
    
    // Update the draft status
    timesheet.isDraft = isDraft;
    timesheet.updatedAt = new Date();
    await timesheet.save();
    
    return NextResponse.json({
      message: isDraft ? 'Timesheet saved as draft' : 'Timesheet submitted successfully',
      timesheet
    });
  } catch (error) {
    console.error('Error updating timesheet:', error);
    return NextResponse.json(
      { error: 'Failed to update timesheet' },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Timesheet ID is required' },
        { status: 400 }
      );
    }
    
    const timesheet = await Timesheet.findById(id);
    if (!timesheet) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }
    
    // Only allow deletion of drafts
    if (!timesheet.isDraft) {
      return NextResponse.json(
        { error: 'Only draft timesheets can be deleted' },
        { status: 403 }
      );
    }
    
    await Timesheet.findByIdAndDelete(id);
    
    return NextResponse.json({
      message: 'Draft timesheet deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting timesheet:', error);
    return NextResponse.json(
      { error: 'Failed to delete timesheet' },
      { status: 500 }
    );
  }
}
