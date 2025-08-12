import React from 'react';

export default function Loading() {
  return (
    <div className='flex items-center justify-center h-screen bg-gray-100'>
      <div className='text-center'>
        <div className='w-16 h-16 border-4 border-slate-700 border-dashed rounded-t-3xl animate-spin'></div>
        <div className='flex justify-center'>
          <p className='mt-4 text-sm  font-medium text-gray-700'>Please wait</p>
        </div>
      </div>
    </div>
  );
}
