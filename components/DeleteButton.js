// // app/components/DeleteButton.js

'use client';

import { useRouter } from 'next/navigation';

const DeleteButton = ({ id }) => {
  const router = useRouter();

  const handleDelete = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(`/api/delete-timesheet/${id}`, {
        method: 'DELETE', // Change method to DELETE
      });

      if (response.ok) {
        router.refresh(); // Refreshes the current page to update the UI
      } else {
        console.error('Failed to delete timesheet');
      }
    } catch (error) {
      console.error('Error deleting timesheet:', error);
    }
  };

  return (
    <button
      onClick={handleDelete}
      className='px-2 py-0.5 bg-red-700 text-xs text-white rounded hover:bg-red-600'
    >
      Delete
    </button>
  );
};

export default DeleteButton;
