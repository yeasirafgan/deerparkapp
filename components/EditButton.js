// // app/components/EditButton.js

'use client';

import { useRouter } from 'next/navigation';

const EditButton = ({ id }) => {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`/admin/edit-timesheet/${id}`);

    router.refresh();
  };

  return (
    <button
      onClick={handleEdit}
      className='px-2 py-0.5 bg-slate-700 text-xs text-white rounded hover:bg-blue-800 mr-2'
    >
      Edit
    </button>
  );
};

export default EditButton;
