// //app/api/export-timesheet/[username]/route.js


import connectMongo from '@/db/connectMongo';
import Timesheet from '@/models/Timesheet';
import { NextResponse } from 'next/server';
import { subWeeks, startOfDay, parseISO, format } from 'date-fns';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';

// Function to format time in "hours.minutes" style
const formatTimeDecimal = (hours, minutes) => {
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes; // Pad minutes if less than 10
  return `${hours}.${formattedMinutes}`;
};

function calculateHoursWorked(start, end) {
  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);

  let totalStartMinutes = startHours * 60 + startMinutes;
  let totalEndMinutes = endHours * 60 + endMinutes;

  if (totalEndMinutes < totalStartMinutes) {
    totalEndMinutes += 24 * 60;
  }

  const totalMinutesWorked = totalEndMinutes - totalStartMinutes;
  const hours = Math.floor(totalMinutesWorked / 60);
  const minutes = totalMinutesWorked % 60;

  return formatTimeDecimal(hours, minutes); // Return formatted time
}

const formatDate = (dateString) => {
  const date =
    typeof dateString === 'string' ? parseISO(dateString) : dateString;
  return format(date, 'dd MMM yy EE');
};

export async function GET(request, { params }) {
  const username = decodeURIComponent(params.username);

  await connectMongo();

  const today = new Date();
  const fourWeeksAgo = subWeeks(startOfDay(today), 4);

  const timesheets = await Timesheet.find({
    username,
    date: { $gte: fourWeeksAgo },
  }).sort({ date: 1 });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Timesheets');

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Start Time', key: 'start', width: 10 },
    { header: 'End Time', key: 'end', width: 10 },
    { header: 'Hours Worked', key: 'hoursWorked', width: 15 },
  ];

  timesheets.forEach((timesheet) => {
    const hoursWorked = calculateHoursWorked(timesheet.start, timesheet.end);
    worksheet.addRow({
      date: formatDate(timesheet.date),
      start: timesheet.start,
      end: timesheet.end,
      hoursWorked,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const headers = new Headers();
  headers.set(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  headers.set(
    'Content-Disposition',
    `attachment; filename="${username}_timesheets.xlsx"`
  );

  return new NextResponse(stream, {
    headers,
  });
}
