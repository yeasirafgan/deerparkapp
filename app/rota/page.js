//app/rota/page.js
'use client';




import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import RotaUploadForm from '/components/RotaUploadForm';
import dynamic from 'next/dynamic';

const RotaList = dynamic(() => import('@/components/RotaList'), { ssr: false });

export default function RotaPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  const { getPermission, isLoading } = useKindeBrowserClient();

  async function handleUpload(formData) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/rota/create', {
        method: 'POST',
        body: formData,
        cache: 'no-cache',
      });

      const result = await response.json();
      if (response.ok) {
        setShouldRefresh((prev) => !prev);
      } else {
        console.error('Error response:', result);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!isLoading) {
      const havePermission = getPermission('delete:timesheet');
      if (!havePermission?.isGranted) {
        // redirect('/api/auth/login?post_login_redirect_url=/rota');
        redirect('/');
      }
    }
  }, [getPermission, isLoading]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className='min-h-screen bg-gray-100 p-6'>
      <div className='container mx-auto'>
        <h1 className='text-2xl font-bold text-lime-900 mb-6'>Manage Rota</h1>

        <div className='w-full mb-6'>
          <RotaUploadForm
            onSubmit={handleUpload}
            isSubmitting={isSubmitting}
            className='w-full'
          />
        </div>

        <div className='w-full'>
          <RotaList shouldRefresh={shouldRefresh} userRole='admin' />
        </div>
      </div>
    </div>
  );
}
