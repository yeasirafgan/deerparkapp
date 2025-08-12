//components/LeaveForm.js

'use client';

import { enGB } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const LeaveForm = ({ onSubmit, username }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: new Date(),
    endDate: new Date(),
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [totalDays, setTotalDays] = useState(0);

  // Calculate total days when dates change
  useEffect(() => {
    if (formData.startDate && formData.endDate && formData.endDate >= formData.startDate) {
      const timeDiff = formData.endDate.getTime() - formData.startDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
      setTotalDays(daysDiff);
    } else {
      setTotalDays(0);
    }
  }, [formData.startDate, formData.endDate]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleStartDateChange = (date) => {
    setFormData((prevData) => ({
      ...prevData,
      startDate: date,
      // Auto-adjust end date if it's before start date
      endDate: prevData.endDate < date ? date : prevData.endDate,
    }));
  };

  const handleEndDateChange = (date) => {
    setFormData((prevData) => ({
      ...prevData,
      endDate: date,
    }));
  };

  // Form submit handler
  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.leaveType || !formData.startDate || !formData.endDate) {
        setError('Please fill in all required fields.');
        setIsSubmitting(false);
        return;
      }

      if (formData.endDate < formData.startDate) {
        setError('End date must be after start date.');
        setIsSubmitting(false);
        return;
      }

      const submitData = {
        leaveType: formData.leaveType,
        startDate: formData.startDate.toISOString().split('T')[0],
        endDate: formData.endDate.toISOString().split('T')[0],
        totalDays: totalDays,
        reason: formData.reason,
        isDraft: isDraft,
      };

      const response = await fetch('/api/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to submit leave request');
      } else {
        setFormData({
          leaveType: '',
          startDate: new Date(),
          endDate: new Date(),
          reason: '',
        });
        setSuccessMessage(
          isDraft 
            ? 'Leave request saved as draft successfully!' 
            : 'Leave request submitted successfully!'
        );
        // Call router.refresh() to refresh the UI
        router.refresh();
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }
    } catch (err) {
      setError('An error occurred while submitting the form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const leaveTypes = [
    { value: 'annual', label: 'Annual Leave' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'maternity', label: 'Maternity Leave' },
  ];

  return (
    <form
      onSubmit={(e) => handleSubmit(e, false)}
      className='space-y-6 w-full p-4 bg-white rounded-lg shadow-lg border border-gray-200'
    >
      <div className='flex flex-col'>
        <label className='text-sm font-medium text-gray-700' htmlFor='leaveType'>
          Leave Type *
        </label>
        <select
          name='leaveType'
          id='leaveType'
          value={formData.leaveType}
          onChange={handleChange}
          className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-700 sm:text-sm'
          required
        >
          <option value=''>Select leave type</option>
          {leaveTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className='flex flex-col sm:flex-row sm:space-x-4'>
        <div className='flex flex-col flex-1'>
          <label className='text-sm font-medium text-gray-700' htmlFor='start-date'>
            Start Date *
          </label>
          <DatePicker
            selected={formData.startDate}
            onChange={handleStartDateChange}
            dateFormat='dd MMMM yyyy'
            id='start-date'
            className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-700 sm:text-sm'
            required
            minDate={new Date()}
            popperClassName='react-datepicker-popper'
            calendarClassName='react-datepicker-custom'
            locale={enGB}
          />
        </div>

        <div className='flex flex-col flex-1 mt-4 sm:mt-0'>
          <label className='text-sm font-medium text-gray-700' htmlFor='end-date'>
            End Date *
          </label>
          <DatePicker
            selected={formData.endDate}
            onChange={handleEndDateChange}
            dateFormat='dd MMMM yyyy'
            id='end-date'
            className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-700 sm:text-sm'
            required
            minDate={formData.startDate}
            popperClassName='react-datepicker-popper'
            calendarClassName='react-datepicker-custom'
            locale={enGB}
          />
        </div>
      </div>

      {totalDays > 0 && (
        <div className='text-sm text-gray-600 bg-gray-50 p-3 rounded-lg'>
          <strong>Total Days:</strong> {totalDays} day{totalDays !== 1 ? 's' : ''}
        </div>
      )}

      <div className='flex flex-col'>
        <label className='text-sm font-medium text-gray-700' htmlFor='reason'>
          Reason (Optional)
        </label>
        <textarea
          name='reason'
          id='reason'
          value={formData.reason}
          onChange={handleChange}
          rows={3}
          className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-700 sm:text-sm'
          placeholder='Enter reason for leave (optional)'
        />
      </div>

      {error && <div className='text-red-500 text-sm'>{error}</div>}

      {successMessage && (
        <div className='text-green-500 text-sm'>{successMessage}</div>
      )}

      <div className='flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0'>
        <button
          type='button'
          onClick={(e) => handleSubmit(e, true)}
          disabled={isSubmitting}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-gray-600 hover:bg-gray-700 text-white'
          }`}
        >
          {isSubmitting ? 'Saving...' : 'Save as Draft'}
        </button>
        
        <button
          type='submit'
          disabled={isSubmitting}
          className={`flex-1 py-3 px-4 rounded-lg font-medium text-white transition duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-slate-700 hover:bg-slate-800'
          }`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </form>
  );
};

export default LeaveForm;