// //app/api/generate-timesheet/list/route.js

import connectMongo from '@/db/connectMongo';
import Timesheet from '@/models/Timesheet';
import {
  getLastFourWeeks,
  calculateMinutesWorked,
  convertMinutesToHours,
  formatDate,
  getPreviousWeek,
} from '@/utils/dateUtils';
import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Connect to MongoDB
    await connectMongo();

    // Build query filter based on date parameters
    const queryFilter = {};
    if (startDate) {
      queryFilter.date = { $gte: new Date(startDate) };
    }
    if (endDate) {
      queryFilter.date = { ...queryFilter.date, $lte: new Date(endDate) };
    }

    // Fetch timesheets with filter and optimization
    const timesheets = await Timesheet.find(queryFilter)
      .sort({ date: 1 })
      .lean() // Use lean() for better performance
      .select('username date start end'); // Only select needed fields

  // Revert to the original code for date ranges
  const lastFourWeeks = getLastFourWeeks();
  const previousWeek = getPreviousWeek(new Date());

  const dateRanges = [previousWeek, ...lastFourWeeks];
  const uniqueDateRanges = Array.from(
    new Set(dateRanges.map((range) => JSON.stringify(range)))
  ).map((range) => JSON.parse(range));

  uniqueDateRanges.sort((a, b) => new Date(b.start) - new Date(a.start));

  // Group timesheets by users
  const usersTimesheets = timesheets.reduce((acc, timesheet) => {
    const { username, date, start, end } = timesheet;
    const timesheetDate = new Date(date).toISOString().split('T')[0];
    const minutesWorked = calculateMinutesWorked(start, end);

    if (!acc[username]) {
      acc[username] = { username, periods: {}, totalMinutes: 0 };
    }

    uniqueDateRanges.forEach((range) => {
      const rangeStart = new Date(range.start).toISOString().split('T')[0];
      const rangeEnd = new Date(range.end).toISOString().split('T')[0];

      if (
        new Date(timesheetDate) >= new Date(rangeStart) &&
        new Date(timesheetDate) <= new Date(rangeEnd)
      ) {
        const periodKey = `${formatDate(new Date(range.start))} - ${formatDate(
          new Date(range.end)
        )}`;
        acc[username].periods[periodKey] =
          (acc[username].periods[periodKey] || 0) + minutesWorked;
        acc[username].totalMinutes += minutesWorked;
      }
    });

    return acc;
  }, {});

  // Create Excel file using ExcelJS
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Timesheets Summary');

  // Add headers in the specified order
  const headers = [
    'Username',
    ...lastFourWeeks.map(
      (range) =>
        `${formatDate(new Date(range.start))} - ${formatDate(
          new Date(range.end)
        )}`
    ),
    'Total (4 Weeks)',
  ];
  sheet.addRow(headers);

  // Set column widths
  sheet.columns = [
    { header: 'Username', width: 20 }, // Adjust width for 'Username' column
    ...lastFourWeeks.map(() => ({ width: 18 })), // Set width for each week column
    { header: 'Total (4 Weeks)', width: 20 }, // Set width for 'Total' column
  ];

  // Sort users alphabetically by username
  const sortedUsers = Object.values(usersTimesheets).sort((a, b) => 
    a.username.localeCompare(b.username)
  );

  // Add timesheet data for each user in the specified order
  sortedUsers.forEach((user) => {
    const row = [user.username];
    let totalMinutes = 0;

    // Reverse the order of the periods for data rows
    lastFourWeeks.forEach((range) => {
      const periodKey = `${formatDate(new Date(range.start))} - ${formatDate(
        new Date(range.end)
      )}`;
      const periodMinutes = user.periods[periodKey] || 0;
      const { hours, minutes } = convertMinutesToHours(periodMinutes);
      row.push(formatTimeDecimal(hours, minutes)); // Use the new formatTimeDecimal
      totalMinutes += periodMinutes;
    });

    const { hours: totalHours, minutes: totalRemainingMinutes } =
      convertMinutesToHours(totalMinutes);
    row.push(formatTimeDecimal(totalHours, totalRemainingMinutes)); // Use the new formatTimeDecimal for total time
    sheet.addRow(row);
  });

  // Prepare the file as a buffer
  const buffer = await workbook.xlsx.writeBuffer();

    // Return the file as a downloadable response
    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': 'attachment; filename=timesheet_summary.xlsx',
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error) {
    console.error('Error generating timesheet:', error);
    return NextResponse.json(
      { error: 'Failed to generate timesheet', message: error.message },
      { status: 500 }
    );
  }
}

// Function to format time in "11.35" style
const formatTimeDecimal = (hours, minutes) => {
  // Concatenate hours and minutes manually to display as "hours.minutes" (e.g., 11.35)
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes; // Pad minutes if less than 10
  return `${hours}.${formattedMinutes}`;
};
