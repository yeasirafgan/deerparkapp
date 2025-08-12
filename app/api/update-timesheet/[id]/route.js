//app/api/update-timesheet/[id]/route.js

import { NextResponse } from 'next/server';
import connectMongo from '@/db/connectMongo';
import Timesheet from '@/models/Timesheet';
import WeeklySummary from '@/models/WeeklySummary';
import { calculateHoursWorked, getWeeklyPeriod } from '@/utils/dateUtils';
import { revalidatePath } from 'next/cache';

export async function POST(req, { params }) {
  try {
    await connectMongo();

    const { id } = params;
    const { start, end } = await req.json();

    if (!id) {
      return new NextResponse('Timesheet ID is required', { status: 400 });
    }

    const timesheet = await Timesheet.findByIdAndUpdate(
      id,
      { start, end },
      { new: true }
    );

    if (!timesheet) {
      return new NextResponse('Timesheet not found', { status: 404 });
    }

    const { startDate, endDate } = getWeeklyPeriod(timesheet.date);
    const timesheets = await Timesheet.find({
      userId: timesheet.userId,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    const totalHours = timesheets.reduce(
      (sum, ts) => sum + calculateHoursWorked(ts.start, ts.end),
      0
    );

    // Update or create WeeklySummary ensuring unique identification by userId, startDate, and endDate
    await WeeklySummary.findOneAndUpdate(
      { userId: timesheet.userId, startDate, endDate },
      { totalHours },
      { upsert: true }
    );

    await revalidatePath(`/admin/${timesheet.userId}`);
    return new NextResponse('Timesheet updated successfully', { status: 200 });
  } catch (error) {
    console.error('Error updating timesheet:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
