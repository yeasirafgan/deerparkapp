//components/DateRangeFilter.js

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const DateRangeFilter = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Fetch the current query parameters (if any) and set initial values
  useEffect(() => {
    const currentStartDate = searchParams.get('startDate');
    const currentEndDate = searchParams.get('endDate');
    if (currentStartDate) setStartDate(currentStartDate);
    if (currentEndDate) setEndDate(currentEndDate);
  }, [searchParams]);

  const handleFilter = () => {
    const currentTab = searchParams.get('tab') || 'work-hours';
    let query = `/admin?tab=${currentTab}`;
    if (startDate) query += `&startDate=${startDate}`;
    if (endDate) query += `&endDate=${endDate}`;
    router.push(query);
  };

  return (
    <div className='flex flex-col gap-2 w-full px-2 md:flex-row md:px-0 md:w-auto mb-3'>
      <input
        type='date'
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className='w-full sm:w-full md:w-auto border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-slate-700'
        placeholder='Start Date'
      />
      <input
        type='date'
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className='w-full sm:w-full md:w-auto border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-slate-700'
        placeholder='End Date'
      />
      <button
        onClick={handleFilter}
        className='w-full sm:w-full md:w-auto px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-800'
      >
        Search
      </button>
    </div>
  );
};

export default DateRangeFilter;
