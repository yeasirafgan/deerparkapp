//app/api/generate-timesheet/route.js

import { NextResponse } from 'next/server';
import { generateExcelFile } from '@/utils/exportsToExcel';
import {
  fetchTimesheetData,
  fetchTimesheetSummary,
} from '@/utils/createExcelFile';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'detailed';

  try {
    let data;
    if (type === 'summary') {
      data = await fetchTimesheetSummary(); // Fetch summary data
    } else {
      data = await fetchTimesheetData(); // Fetch detailed timesheet data
    }

    const buffer = await generateExcelFile(data, type);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=timesheet_${type}.xlsx`,
      },
    });
  } catch (error) {
    console.error('Error generating Excel file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
