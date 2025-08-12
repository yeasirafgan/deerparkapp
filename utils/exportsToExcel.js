// // mainfolder/utils/exportsToExcel.js

import ExcelJS from 'exceljs';
import { formatDate, calculateMinutesWorked } from './timesheetUtils';

export async function generateExcelFile(data, type) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(
    type === 'summary' ? 'Summary' : 'Detailed Report'
  );

  // Define columns based on the report type
  if (type === 'summary') {
    worksheet.columns = [
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Total Hours', key: 'totalHours', width: 15 },
      { header: 'Monday', key: 'Monday', width: 15 },
      { header: 'Tuesday', key: 'Tuesday', width: 15 },
      { header: 'Wednesday', key: 'Wednesday', width: 15 },
      { header: 'Thursday', key: 'Thursday', width: 15 },
      { header: 'Friday', key: 'Friday', width: 15 },
      { header: 'Saturday', key: 'Saturday', width: 15 },
      { header: 'Sunday', key: 'Sunday', width: 15 },
    ];
  } else {
    worksheet.columns = [
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Start (UTC)', key: 'start', width: 15 },
      { header: 'End (UTC)', key: 'end', width: 15 },
      { header: 'Hours Worked', key: 'hoursWorked', width: 15 },
    ];
  }

  // Add formatted data rows
  data.forEach((item) => {
    if (type === 'summary') {
      // Ensure that the data for summary is correctly formatted
      worksheet.addRow({
        username: item.username || 'N/A',
        totalHours: item.totalHours
          ? Number(item.totalHours).toFixed(2)
          : '0.00',
        Monday: item.Monday || 0,
        Tuesday: item.Tuesday || 0,
        Wednesday: item.Wednesday || 0,
        Thursday: item.Thursday || 0,
        Friday: item.Friday || 0,
        Saturday: item.Saturday || 0,
        Sunday: item.Sunday || 0,
      });
    } else {
      if (!item.start || !item.end) {
        console.warn('Missing start or end time:', item);
        return;
      }

      const formattedDate = formatDate(item.date); // Format the date using UTC
      const hoursWorked = calculateMinutesWorked(item.start, item.end) / 60; // Calculate hours

      worksheet.addRow({
        username: item.username || 'N/A',
        date: formattedDate,
        start: item.start || 'N/A',
        end: item.end || 'N/A',
        hoursWorked: hoursWorked.toFixed(2), // Ensure 2 decimal points for hours worked
      });
    }
  });

  // Return buffer instead of writing to file
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
