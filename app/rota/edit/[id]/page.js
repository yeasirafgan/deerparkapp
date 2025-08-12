'use client';

import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { redirect, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditRota({ params }) {
  const [rota, setRota] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getPermission, isLoading } = useKindeBrowserClient();
  const [error, setError] = useState(null);
  const router = useRouter();
  const rotaId = params.id;

  useEffect(() => {
    (async function () {
      try {
        const response = await fetch(`/api/rota/${rotaId}`, {
          cache: 'no-cache',
        });
        if (!response.ok) throw new Error('Failed to fetch rota');
        const data = await response.json();
        setRota(data);
      } catch (error) {
        console.error('Failed to fetch rota', error);
        setError('Failed to load rota data.');
      }
    })();
  }, [rotaId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/rota/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rotaId, updates: rota }),
      });

      if (response.ok) {
        router.push('/rota'); // Redirect to the rota list page
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update rota');
      }
    } catch (error) {
      setError('Failed to update rota');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleChange(event, rowIndex, field) {
    const { value } = event.target;
    setRota((prevRota) => {
      const updatedParsedData = [...prevRota.parsedData];
      updatedParsedData[rowIndex] = {
        ...updatedParsedData[rowIndex],
        [field]: value,
      };
      return {
        ...prevRota,
        parsedData: updatedParsedData,
      };
    });
  }

  useEffect(() => {
    if (!isLoading) {
      const havePermission = getPermission('delete:timesheet');
      if (!havePermission?.isGranted) {
        redirect(`/api/auth/login?post_login_redirect_url=/rota/${rotaId}`);
      }
    }
  }, [getPermission, isLoading, rotaId]);

  if (!rota || isLoading) return <div>Loading...</div>;

  return (
    <div className='p-6 bg-white shadow-lg rounded-lg'>
      <h1 className='text-2xl mb-4'>Edit Rota: {rota.name}</h1>
      {error && <p className='text-red-500 mb-4'>{error}</p>}
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label
            htmlFor='name'
            className='block text-sm font-medium text-gray-700'
          >
            Rota Name
          </label>
          <input
            type='text'
            id='name'
            name='name'
            value={rota.name}
            onChange={(e) => setRota({ ...rota, name: e.target.value })}
            className='border border-gray-300 rounded-lg p-2 w-full'
          />
        </div>
        {/* Display other rota fields */}
        {rota.parsedData.map((row, index) => (
          <div key={index} className='flex flex-wrap items-center gap-4 mb-2'>
            <input
              type='text'
              value={row.staff || ''}
              onChange={(e) => handleChange(e, index, 'staff')}
              className='border border-gray-300 p-2 rounded-lg flex-1 min-w-0'
            />
            <input
              type='text'
              value={row.post || ''}
              onChange={(e) => handleChange(e, index, 'post')}
              className='border border-gray-300 p-2 rounded-lg flex-1 min-w-0'
            />
            <input
              type='text'
              value={row.monday || ''}
              onChange={(e) => handleChange(e, index, 'monday')}
              className='border border-gray-300 p-2 rounded-lg flex-1 min-w-0'
            />
            <input
              type='text'
              value={row.tuesday || ''}
              onChange={(e) => handleChange(e, index, 'tuesday')}
              className='border border-gray-300 p-2 rounded-lg flex-1 min-w-0'
            />
            <input
              type='text'
              value={row.wednesday || ''}
              onChange={(e) => handleChange(e, index, 'wednesday')}
              className='border border-gray-300 p-2 rounded-lg flex-1 min-w-0'
            />
            <input
              type='text'
              value={row.thursday || ''}
              onChange={(e) => handleChange(e, index, 'thursday')}
              className='border border-gray-300 p-2 rounded-lg flex-1 min-w-0'
            />
            <input
              type='text'
              value={row.friday || ''}
              onChange={(e) => handleChange(e, index, 'friday')}
              className='border border-gray-300 p-2 rounded-lg flex-1 min-w-0'
            />
            <input
              type='text'
              value={row.saturday || ''}
              onChange={(e) => handleChange(e, index, 'saturday')}
              className='border border-gray-300 p-2 rounded-lg flex-1 min-w-0'
            />
            <input
              type='text'
              value={row.sunday || ''}
              onChange={(e) => handleChange(e, index, 'sunday')}
              className='border border-gray-300 p-2 rounded-lg flex-1 min-w-0'
            />
          </div>
        ))}
        <button
          type='submit'
          disabled={isSubmitting}
          className={`bg-blue-500 text-white px-4 py-2 rounded-lg ${
            isSubmitting ? 'opacity-50' : ''
          }`}
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
