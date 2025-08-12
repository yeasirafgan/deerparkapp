// //components / RotaUploadForm.js;

'use client';

import { useState } from 'react';

export default function RotaUploadForm({ onSubmit, isSubmitting }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [weekStart, setWeekStart] = useState('');

  function handleFileChange(event) {
    setFile(event.target.files[0]);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!file || !name || !weekStart) {
      alert('Please fill out all fields before submitting.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('weekStart', weekStart);

    onSubmit(formData);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='bg-white shadow-lg rounded-lg p-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto'
    >
      {/* <input type='hidden' name='uploadedBy' value='{USER_ID}' /> */}

      <div className='flex flex-col'>
        <label
          htmlFor='rotaName'
          className='text-sm font-medium text-gray-600 mb-1'
        >
          Rota Name
        </label>
        <input
          id='rotaName'
          type='text'
          placeholder='Rota Name'
          value={name}
          onChange={(e) => setName(e.target.value)}
          className='border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
      </div>

      <div className='flex flex-col'>
        <label
          htmlFor='weekStart'
          className='text-sm font-medium text-gray-600 mb-1'
        >
          Week Start Date
        </label>
        <input
          id='weekStart'
          type='date'
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          className='border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
      </div>

      <div className='flex flex-col'>
        <label
          htmlFor='fileUpload'
          className='text-sm font-medium text-gray-600 mb-1'
        >
          Upload File
        </label>
        <input
          id='fileUpload'
          type='file'
          accept='.xls,.xlsx'
          onChange={handleFileChange}
          className='border border-gray-300 rounded-lg p-3 text-gray-800 file:py-2 file:px-3 file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium file:rounded-lg hover:file:bg-blue-100'
        />
      </div>

      <button
        type='submit'
        disabled={isSubmitting}
        className={`col-span-full bg-slate-700 text-white p-3 rounded-lg hover:bg-lime-900 transition-colors duration-300 ${
          isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isSubmitting ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  );
}
