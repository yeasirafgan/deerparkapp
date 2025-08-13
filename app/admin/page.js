
// app/admin/page.js

import DateRangeFilter from '@/components/DateRangeFilter';
import AdminTabNavigation from '@/components/AdminTabNavigation';
import LeaveRequestsTable from '@/components/LeaveRequestsTable';
import LeaveHoursTable from '@/components/LeaveHoursTable';
import TrainingHoursTable from '@/components/TrainingHoursTable';
import connectMongo from '@/db/connectMongo';
import Timesheet from '@/models/Timesheet';
import Training from '@/models/Training';
import LeaveHours from '@/models/LeaveHours';
import {
  calculateMinutesWorked,
  convertMinutesToHours,
  formatDate,
  getFixedFourWeekRanges,
} from '@/utils/dateUtils';
import { getFourWeekCycle } from '@/utils/weekCycleUtils';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { revalidatePath } from 'next/cache';

export const metadata = {
  title: 'Phoenix carehome | Admin',
  description: 'Simple timesheet app for Deerpark staffs',
};

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const getWeeklyIntervals = (startDate, endDate) => {
  const intervals = [];
  let start = new Date(startDate);
  const end = new Date(endDate);

  while (start <= end) {
    const weekEnd = new Date(start);
    weekEnd.setDate(weekEnd.getDate() + 6); // Add 6 days to get the week's end
    intervals.push({
      start: new Date(start),
      end: weekEnd > end ? new Date(end) : weekEnd,
    });
    start.setDate(start.getDate() + 7); // Move to the next week
  }

  return intervals;
};

const AdminPage = async ({ searchParams }) => {
  const { isAuthenticated, getUser, getPermission } = getKindeServerSession();

  if (!(await isAuthenticated())) {
    redirect('/timesheet');
  }

  const requiredPermission = await getPermission('delete:timesheet');
  if (!requiredPermission?.isGranted) {
    redirect('/timesheet');
  }

  await getUser();

  // Get active tab from search params
  const activeTab = searchParams.tab || 'work-hours';
  await connectMongo();

  const { startDate, endDate } = searchParams;

  const queryFilter = {};
  if (startDate) {
    queryFilter.date = { $gte: new Date(startDate) };
  }
  if (endDate) {
    queryFilter.date = { ...queryFilter.date, $lte: new Date(endDate) };
  }

  // Only include submitted timesheets (exclude drafts) for admin view
  const timesheetFilter = { ...queryFilter, isDraft: false };
  const timesheets = await Timesheet.find(timesheetFilter).sort({ date: 1 });

  // Fetch training and leave hours data for 'all-entries' tab
  let trainings = [];
  let leaveHours = [];
  
  if (activeTab === 'all-entries') {
    // Only include approved training and leave hours in totals
    // Exclude soft-deleted records from UI display
    const trainingFilter = { 
      ...queryFilter, 
      status: 'approved',
      $or: [
        { deleted: { $exists: false } },
        { deleted: false }
      ]
    };
    const leaveHoursFilter = { 
      ...queryFilter, 
      status: 'approved',
      $or: [
        { deleted: { $exists: false } },
        { deleted: false }
      ]
    };
    
    trainings = await Training.find(trainingFilter).sort({ date: 1 });
    leaveHours = await LeaveHours.find(leaveHoursFilter).sort({ date: 1 });
  }

  // Get the current 4-week cycle
  const currentCycle = getFourWeekCycle(new Date());
  
  // Use either the filtered date range or the current 4-week cycle
  const weeklyIntervals = startDate && endDate 
    ? getWeeklyIntervals(startDate, endDate) 
    : currentCycle;

  const usersTimesheets = timesheets.reduce((acc, timesheet) => {
    const { username, date, start, end } = timesheet;
    const timesheetDate = new Date(date);
    const minutesWorked = calculateMinutesWorked(start, end);

    if (!acc[username]) {
      acc[username] = { username, periods: {}, totalMinutes: 0 };
    }

    weeklyIntervals.forEach((interval) => {
      const intervalStart = new Date(interval.start);
      const intervalEnd = new Date(interval.end);

      if (
        timesheetDate >= intervalStart &&
        timesheetDate <= intervalEnd
      ) {
        const periodKey = `${formatDate(intervalStart)} - ${formatDate(intervalEnd)}`;
        acc[username].periods[periodKey] = (acc[username].periods[periodKey] || 0) + minutesWorked;
        acc[username].totalMinutes += minutesWorked;
      }
    });

    return acc;
  }, {});

  // Add training hours to the totals for 'all-entries' tab
  if (activeTab === 'all-entries') {
    trainings.forEach((training) => {
      const { username, date, duration } = training;
      const trainingDate = new Date(date);
      const durationMinutes = duration * 60; // Convert hours to minutes

      if (!usersTimesheets[username]) {
        usersTimesheets[username] = { username, periods: {}, totalMinutes: 0 };
      }

      weeklyIntervals.forEach((interval) => {
        const intervalStart = new Date(interval.start);
        const intervalEnd = new Date(interval.end);

        if (
          trainingDate >= intervalStart &&
          trainingDate <= intervalEnd
        ) {
          const periodKey = `${formatDate(intervalStart)} - ${formatDate(intervalEnd)}`;
          usersTimesheets[username].periods[periodKey] = (usersTimesheets[username].periods[periodKey] || 0) + durationMinutes;
          usersTimesheets[username].totalMinutes += durationMinutes;
        }
      });
    });

    // Add leave hours to the totals for 'all-entries' tab
    leaveHours.forEach((leave) => {
      const { userName, date, hours } = leave;
      const leaveDate = new Date(date);
      const leaveMinutes = hours * 60; // Convert hours to minutes

      if (!usersTimesheets[userName]) {
        usersTimesheets[userName] = { username: userName, periods: {}, totalMinutes: 0 };
      }

      weeklyIntervals.forEach((interval) => {
        const intervalStart = new Date(interval.start);
        const intervalEnd = new Date(interval.end);

        if (
          leaveDate >= intervalStart &&
          leaveDate <= intervalEnd
        ) {
          const periodKey = `${formatDate(intervalStart)} - ${formatDate(intervalEnd)}`;
          usersTimesheets[userName].periods[periodKey] = (usersTimesheets[userName].periods[periodKey] || 0) + leaveMinutes;
          usersTimesheets[userName].totalMinutes += leaveMinutes;
        }
      });
    });
  }

  Object.values(usersTimesheets).forEach((user) => {
    const { hours, minutes } = convertMinutesToHours(user.totalMinutes);
    user.totalHours = Math.floor(hours);
    user.totalMinutes = Math.round(minutes);
  });

  const formatTime = (hours, minutes) => {
    if (hours === 0 && minutes === 0) {
      return '0 m';
    } else if (minutes === 0) {
      return `${hours} h`;
    } else if (hours === 0) {
      return `${minutes} m`;
    } else {
      return `${hours} h ${minutes} m`;
    }
  };

  // UK National Minimum Wage
  const nationalMinimumWage = 12.21; // Updated minimum wage
  const timestamp = Date.now(); // Add this line to force revalidation

  // Calculate the payment for each user
  const calculatePayment = (totalHours, totalMinutes) => {
    // Convert hours and minutes to decimal hours for accurate payment calculation
    const decimalHours = totalHours + (totalMinutes / 60);
    return decimalHours * nationalMinimumWage;
  };

  revalidatePath('/admin');

  return (
    <main className='p-4 sm:p-8 bg-slate-50'>
      <div className='pb-5 md:pb-0'>
        <h1 className='text-lime-900 text-md md:text-lg hover:text-yellow-600 font-bold'>
          Hi {(await getUser()).given_name} {(await getUser()).family_name},
        </h1>
        <p className='text-lime-900 text-sm md:text-md hover:text-yellow-700'>
          You are admin user...
        </p>
      </div>
      <div className='flex justify-end gap-3 mb-4'>
        <Link
          href='../rota'
          className='px-4 py-2 bg-slate-700 hover:bg-slate-900 text-white rounded text-xs sm:text-sm'
        >
          Go to Rota page
        </Link>
        <Link
          href={`api/generate-timesheet/list?startDate=${
            searchParams.startDate || ''
          }&endDate=${searchParams.endDate || ''}`}
          className='px-4 py-2 bg-slate-700 hover:bg-slate-900 text-white rounded text-xs sm:text-sm'
          download
        >
          Export to Excel
        </Link>
      </div>
      <h1 className='text-md sm:text-lg font-semibold mb-4 text-lime-800 hover:text-emerald-950 text-center sm:text-left'>
        Admin Area
      </h1>

      <AdminTabNavigation activeTab={activeTab} />
      
      <DateRangeFilter />

      {activeTab === 'work-hours' && (
        <div className='overflow-x-auto'>
        <table className='min-w-full bg-white border border-gray-200'>
          <thead className='bg-gray-100'>
            <tr>
              <th className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'>
                Name
              </th>
              {weeklyIntervals.map((interval, index) => (
                <th
                  key={index}
                  className='border border-gray-300 px-1 py-0.5 text-center text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'
                >
                  {`${formatDate(new Date(interval.start))} - ${formatDate(
                    new Date(interval.end)
                  )}`}
                </th>
              ))}
              <th className='border border-gray-300 px-2 py-1 text-center text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'>
                Total
              </th>
              {/* New Column for Estimated Payment */}
              <th className='border border-gray-300 px-2 py-1 text-center text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'>
                £ Estimated Pay
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.values(usersTimesheets)
              .sort((a, b) => a.username.localeCompare(b.username))
              .map((user) => (
                <tr key={user.username} className='hover:bg-gray-50'>
                  <td className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-900'>
                    <Link
                      href={`/admin/${encodeURIComponent(user.username)}`}
                      className='text-emerald-700 hover:text-green-500 font-bold'
                    >
                      {user.username || 'Unknown'}
                    </Link>
                  </td>
                  {weeklyIntervals.map((interval, index) => {
                    const periodKey = `${formatDate(
                      new Date(interval.start)
                    )} - ${formatDate(new Date(interval.end))}`;
                    const periodMinutes = user.periods[periodKey] || 0;
                    const { hours, minutes } =
                      convertMinutesToHours(periodMinutes);

                    return (
                      <td
                        key={index}
                        className='border border-gray-300 px-2 py-1 text-center text-xs sm:text-sm font-semibold text-slate-700 hover:text-emerald-900'
                      >
                        {formatTime(hours, minutes)}
                      </td>
                    );
                  })}
                  <td className='border border-gray-300 px-2 py-1 text-center text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-900'>
                    {formatTime(user.totalHours, user.totalMinutes)}
                  </td>
                  {/* New Column for Estimated Payment */}
                  <td className='border border-gray-300 px-2 py-1 text-center text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-900'>
                    £{calculatePayment(user.totalHours, user.totalMinutes).toFixed(2)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        </div>
      )}

      {activeTab === 'leave-requests' && (
        <LeaveRequestsTable searchParams={searchParams} />
      )}

      {activeTab === 'leave-hours' && (
        <LeaveHoursTable searchParams={searchParams} />
      )}

      {activeTab === 'training-hours' && (
        <TrainingHoursTable searchParams={searchParams} />
      )}

      {activeTab === 'all-entries' && (
        <div className='overflow-x-auto'>
          <div className='mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
            <p className='text-sm text-blue-800 font-medium'>
              📊 <strong>All Entries Summary:</strong> This table shows combined totals including work hours, training hours, and leave hours for each user.
            </p>
          </div>
          <table className='min-w-full bg-white border border-gray-200'>
            <thead className='bg-gray-100'>
              <tr>
                <th className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'>
                  Name
                </th>
                {weeklyIntervals.map((interval, index) => (
                  <th
                    key={index}
                    className='border border-gray-300 px-1 py-0.5 text-center text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'
                  >
                    {`${formatDate(new Date(interval.start))} - ${formatDate(
                      new Date(interval.end)
                    )}`}
                  </th>
                ))}
                <th className='border border-gray-300 px-2 py-1 text-center text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'>
                  Total Hours
                </th>
                <th className='border border-gray-300 px-2 py-1 text-center text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'>
                  £ Estimated Pay
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.values(usersTimesheets)
                .sort((a, b) => a.username.localeCompare(b.username))
                .map((user) => (
                  <tr key={user.username} className='hover:bg-gray-50'>
                    <td className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-900'>
                      <Link
                        href={`/admin/${encodeURIComponent(user.username)}`}
                        className='text-emerald-700 hover:text-green-500 font-bold'
                      >
                        {user.username || 'Unknown'}
                      </Link>
                    </td>
                    {weeklyIntervals.map((interval, index) => {
                      const periodKey = `${formatDate(
                        new Date(interval.start)
                      )} - ${formatDate(new Date(interval.end))}`;
                      const periodMinutes = user.periods[periodKey] || 0;
                      const { hours, minutes } =
                        convertMinutesToHours(periodMinutes);

                      return (
                        <td
                          key={index}
                          className='border border-gray-300 px-2 py-1 text-center text-xs sm:text-sm font-semibold text-slate-700 hover:text-emerald-900'
                        >
                          {formatTime(hours, minutes)}
                        </td>
                      );
                    })}
                    <td className='border border-gray-300 px-2 py-1 text-center text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-900'>
                      {formatTime(user.totalHours, user.totalMinutes)}
                    </td>
                    <td className='border border-gray-300 px-2 py-1 text-center text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-900'>
                      £{calculatePayment(user.totalHours, user.totalMinutes).toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
};

export default AdminPage;
