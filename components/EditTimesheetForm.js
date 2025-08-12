// //mainfolder/components/EditTimesheetForm.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const EditTimesheetForm = ({ timesheet }) => {
  const router = useRouter();
  const [start, setStart] = useState(timesheet.start || '');
  const [end, setEnd] = useState(timesheet.end || '');

  const handleSave = async () => {
    const response = await fetch(`/api/update-timesheet/${timesheet._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ start, end }),
    });

    if (response.ok) {
      router.push(`/admin/${timesheet.username}`);
    } else {
      console.error('Failed to update timesheet');
    }
  };

  return (
    <main className='p-10'>
      <h1 className='text-xl font-bold mb-5'>Edit Timesheet</h1>
      <div className='mb-5'>
        <label className='block mb-2'>Start Time</label>
        <input
          type='text'
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className='border border-gray-300 px-4 py-2 w-full'
        />
      </div>
      <div className='mb-5'>
        <label className='block mb-2'>End Time</label>
        <input
          type='text'
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className='border border-gray-300 px-4 py-2 w-full'
        />
      </div>
      <button
        onClick={handleSave}
        className='px-4 py-2 bg-slate-700 text-white rounded hover:bg-green-900'
      >
        Save
      </button>
    </main>
  );
};

export default EditTimesheetForm;
