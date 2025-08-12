//utils/timesheetUtils.js

import {
  getLastFourWeeks,
  formatDate as formatDateFromDateUtils,
} from './dateUtils'; // Ensure correct import
import Timesheet from '@/models/Timesheet';
import connectMongo from '@/db/connectMongo';

// Fetch and process timesheet data
export async function fetchTimesheetData() {
  await connectMongo();

  // Exclude draft entries from export
  const query = {
    $or: [
      { isDraft: { $exists: false } },
      { isDraft: false },
      { isDraft: null }
    ]
  };

  const timesheets = await Timesheet.find(query).sort({ date: 1 });

  return timesheets.map((ts) => {
    // Calculate hours worked and format the result
    const hoursWorked = calculateMinutesWorked(ts.start, ts.end) / 60; // Convert minutes to hours
    return {
      username: ts.username || 'N/A',
      date: formatDateFromDateUtils(ts.date), // Use the imported formatDate function
      start: ts.start || 'N/A',
      end: ts.end || 'N/A',
      hoursWorked: hoursWorked.toFixed(2), // Format hours to 2 decimal points
    };
  });
}

// Fetch timesheet summary for the last four weeks
export async function fetchTimesheetSummary() {
  await connectMongo();

  const weeks = getLastFourWeeks();
  const summary = {};

  const timesheets = await Timesheet.find({
    date: {
      $gte: new Date(weeks[0].start),
      $lte: new Date(weeks[3].end),
    },
  });

  timesheets.forEach((ts) => {
    const username = ts.username;
    if (!summary[username]) {
      summary[username] = { weeklyMinutes: Array(4).fill(0), totalMinutes: 0 };
    }

    for (let i = 0; i < weeks.length; i++) {
      const week = weeks[i];
      const entryDate = new Date(ts.date);
      if (
        entryDate >= new Date(week.start) &&
        entryDate <= new Date(week.end)
      ) {
        const minutesWorked = calculateMinutesWorked(ts.start, ts.end);
        summary[username].weeklyMinutes[i] += minutesWorked;
        summary[username].totalMinutes += minutesWorked;
        break;
      }
    }
  });

  return Object.entries(summary).map(([username, data]) => {
    // Format weekly summaries
    const formattedWeeks = weeks.map((week, i) => {
      const formattedWeek = `${new Date(week.start).getDate()} ${new Date(
        week.start
      ).toLocaleString('en-GB', { month: 'short' })} - ${new Date(
        week.end
      ).getDate()} ${new Date(week.end).toLocaleString('en-GB', {
        month: 'short',
      })}`;
      const weeklyHoursAndMinutes = convertMinutesToHours(
        data.weeklyMinutes[i]
      );
      return { week: formattedWeek, hoursWorked: weeklyHoursAndMinutes };
    });

    // Format total worked hours
    const totalHoursAndMinutes = convertMinutesToHours(data.totalMinutes);

    return {
      username,
      weeklySummary: formattedWeeks,
      totalWorked: totalHoursAndMinutes,
    };
  });
}

// Helper function to convert minutes into hours and minutes format
function convertMinutesToHours(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

// Function to format a date to a specific string format
export function formatDate(date) {
  if (!date) return 'N/A'; // Handle undefined or null date
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // Return date in YYYY-MM-DD format
}

// Function to calculate minutes worked between start and end times
export function calculateMinutesWorked(startTimeUTC, endTimeUTC) {
  if (!startTimeUTC || !endTimeUTC) return 0; // Handle missing times

  const start = new Date(startTimeUTC);
  const end = new Date(endTimeUTC);

  // Ensure valid date objects
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  const minutes = (end - start) / (1000 * 60); // Calculate difference in minutes
  return minutes >= 0 ? minutes : 0; // Ensure non-negative result
}
