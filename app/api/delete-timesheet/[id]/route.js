//app/api/delete-timesheet/[id]/route.js

import { NextResponse } from 'next/server';
import connectMongo from '../../../../db/connectMongo';
import Timesheet from '../../../../models/Timesheet';
import WeeklySummary from '../../../../models/WeeklySummary';

export async function DELETE(request, { params }) {
  try {
    await connectMongo();
    
    const { id } = params;
    
    // Find the timesheet to get user info before deletion
    const timesheet = await Timesheet.findById(id);
    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }
    
    const { username, weekStarting } = timesheet;
    
    // Delete the timesheet
    await Timesheet.findByIdAndDelete(id);
    
    // Check if there are any remaining timesheets for this user and week
    const remainingTimesheets = await Timesheet.find({
      username,
      weekStarting
    });
    
    if (remainingTimesheets.length > 0) {
      // Recalculate total hours for the week
      const totalHours = remainingTimesheets.reduce((sum, ts) => sum + ts.totalHours, 0);
      
      // Update the WeeklySummary
      await WeeklySummary.findOneAndUpdate(
        { username, weekStarting },
        { totalHours },
        { upsert: true }
      );
    } else {
      // No timesheets left for this week, delete the WeeklySummary
      await WeeklySummary.findOneAndDelete({
        username,
        weekStarting
      });
    }
    
    return NextResponse.json({ message: 'Timesheet deleted successfully' });
  } catch (error) {
    console.error('Error deleting timesheet:', error);
    return NextResponse.json({ error: 'Failed to delete timesheet' }, { status: 500 });
  }
}
