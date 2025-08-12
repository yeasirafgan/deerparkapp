//app/timesheet/page.js

import createTimesheet from '@/actions/actions';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { redirect } from 'next/navigation';
import UserTimesheetData from '@/components/UserTimesheetData';
import TabbedInterface from '@/components/TabbedInterface';
import RotaList from '@/components/RotaList';
import VapiAssistantDynamic from '@/components/VapiAssistantDynamic';

export const metadata = {
  title: 'Phoenix carehome | Timesheet',
  description: 'Simple timesheet app for Deerpark staffs',
};

const TimesheetPage = async ({ searchParams }) => {
  const { isAuthenticated, getUser } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    redirect('/api/auth/login?post_login_redirect_url=/timesheet');
  }

  const user = await getUser();
  const username = user
    ? `${user.given_name || ''} ${user.family_name || ''}`.trim() || user.email
    : 'Unknown';

  const handleSubmit = async (formData) => {
    'use server';
    return await createTimesheet(formData);
  };

  return (
    <main className='bg-gray-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8'>
      <VapiAssistantDynamic/>
      <div className='container mx-auto'>
        {/* Hero Section with Username */}
        <div className='flex-1 bg-gradient-to-r from-slate-200 to-slate-100 shadow-md rounded-lg p-6 mb-8 h-[60vh] md:h-auto flex flex-col justify-center items-start'>
          {/* Welcome and Username */}
          <div className='flex flex-col items-start w-full space-y-1 md:space-y-0 md:flex-col md:items-start'>
            <h1 className='text-start w-full text-lg font-extrabold text-gray-800 md:w-auto md:text-lg hover:text-yellow-600'>
              Welcome,
            </h1>
            <p className='text-green-600 font-bold text-xl text-start md:text-left hover:text-yellow-600'>
              {username}
            </p>
          </div>

          {/* Submit timesheets and other info */}
          <div className='w-full flex flex-col items-start mt-4 md:w-auto md:items-start md:mt-auto'>
            <h2 className='text-md font-semibold text-lime-900 text-left md:text-left hover:text-yellow-600'>
              Submit your work hours, leave requests, and training records here.
            </h2>
            <p className='text-sm font-semibold text-lime-900 text-left mt-1 md:text-left hover:text-yellow-600'>
              Manage your entries and view rotas...
            </p>
            <p className='text-sm font-semibold text-lime-900 text-left mt-1 md:text-left hover:text-yellow-600'>
              HI,I am Grace,your virtual assistant...<br/>
              You can ask me about your upcoming shifts...<br/>
              or any other information about your shifts...
            </p>
          </div>
        </div>

        <div className='flex flex-col md:flex-row gap-6'>
          <div className='flex-1 bg-white shadow-md rounded-lg p-6'>
            <h1 className='text-2xl font-semibold text-slate-800 mb-4'>
              Submit Entry
            </h1>
            <TabbedInterface
              onTimesheetSubmit={handleSubmit}
              username={username}
            />
          </div>

          <div className='flex-1 bg-white shadow-md rounded-lg p-6'>
            <h1 className='text-2xl font-semibold text-slate-800 mb-4'>
              Your Timesheet Data
            </h1>
            <UserTimesheetData 
              username={username} 
            />
          </div>
        </div>

        <div className='mt-8 bg-white shadow-md rounded-lg p-6'>
          <h1 className='text-2xl font-semibold text-slate-800 mb-4'>
            Rota List
          </h1>
          <RotaList userRole='basic' />
        </div>
      </div>
    </main>
  );
};

export default TimesheetPage;
