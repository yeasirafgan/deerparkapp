//components/TrainingForm.js

'use client';

import { enGB } from 'date-fns/locale';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const TrainingForm = ({ onSubmit, username }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    trainingType: '',
    title: '',
    description: '',
    date: new Date(),
    duration: '',
    provider: '',
    location: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleDateChange = (date) => {
    setFormData((prevData) => ({
      ...prevData,
      date: date,
    }));
  };

  // Form submit handler
  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.trainingType || !formData.title || !formData.date || !formData.duration) {
        setError('Please fill in all required fields.');
        setIsSubmitting(false);
        return;
      }

      // Validate and convert duration from HH:MM format
      const timePattern = /^([0-9]{1,2}):([0-5][0-9])$/;
      const timeMatch = formData.duration.match(timePattern);
      
      if (!timeMatch) {
        setError('Duration must be in HH:MM format (e.g., 2:30).');
        setIsSubmitting(false);
        return;
      }
      
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      
      if (hours < 0 || hours > 24 || (hours === 24 && minutes > 0)) {
        setError('Duration cannot exceed 24 hours.');
        setIsSubmitting(false);
        return;
      }
      
      // Convert to decimal hours for storage
      const duration = hours + (minutes / 60);

      const submitData = {
        trainingType: formData.trainingType,
        title: formData.title,
        description: formData.description,
        date: formData.date.toISOString().split('T')[0],
        duration: duration,
        provider: formData.provider,
        location: formData.location,
        isDraft: isDraft,
      };

      const response = await fetch('/api/training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to submit training record');
      } else {
        setFormData({
          trainingType: '',
          title: '',
          description: '',
          date: new Date(),
          duration: '',
          provider: '',
          location: '',
        });
        setSuccessMessage(
          isDraft 
            ? 'Training record saved as draft successfully!' 
            : 'Training record submitted successfully!'
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

  const trainingTypes = [
    { value: 'mandatory', label: 'Mandatory Training' },
    { value: 'professional', label: 'Professional Development' },
    { value: 'skills', label: 'Skills Training' },
    { value: 'safety', label: 'Safety Training' },
  ];

  return (
    <form
      onSubmit={(e) => handleSubmit(e, false)}
      className='space-y-6 w-full p-4 bg-white rounded-lg shadow-lg border border-gray-200'
    >
      <div className='flex flex-col sm:flex-row sm:space-x-4'>
        <div className='flex flex-col flex-1'>
          <label className='text-sm font-medium text-gray-700' htmlFor='trainingType'>
            Training Type *
          </label>
          <select
            name='trainingType'
            id='trainingType'
            value={formData.trainingType}
            onChange={handleChange}
            className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-700 sm:text-sm'
            required
          >
            <option value=''>Select training type</option>
            {trainingTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className='flex flex-col flex-1 mt-4 sm:mt-0'>
          <label className='text-sm font-medium text-gray-700' htmlFor='title'>
            Training Title *
          </label>
          <input
            type='text'
            name='title'
            id='title'
            value={formData.title}
            onChange={handleChange}
            className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-700 sm:text-sm'
            placeholder='Enter training title'
            required
          />
        </div>
      </div>

      <div className='flex flex-col'>
        <label className='text-sm font-medium text-gray-700' htmlFor='description'>
          Description (Optional)
        </label>
        <textarea
          name='description'
          id='description'
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-700 sm:text-sm'
          placeholder='Enter training description (optional)'
        />
      </div>

      <div className='flex flex-col sm:flex-row sm:space-x-4'>
        <div className='flex flex-col flex-1'>
          <label className='text-sm font-medium text-gray-700' htmlFor='training-date'>
            Training Date *
          </label>
          <DatePicker
            selected={formData.date}
            onChange={handleDateChange}
            dateFormat='dd MMMM yyyy'
            id='training-date'
            className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-700 sm:text-sm'
            required
            popperClassName='react-datepicker-popper'
            calendarClassName='react-datepicker-custom'
            locale={enGB}
          />
        </div>

        <div className='flex flex-col flex-1 mt-4 sm:mt-0'>
          <label className='text-sm font-medium text-gray-700' htmlFor='duration'>
            Duration (Hours:Minutes) *
          </label>
          <input
            type='text'
            name='duration'
            id='duration'
            value={formData.duration}
            onChange={handleChange}
            pattern='[0-9]{1,2}:[0-5][0-9]'
            className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-700 sm:text-sm'
            placeholder='e.g., 2:30'
            required
          />
          <p className='text-xs text-gray-500 mt-1'>Format: HH:MM (e.g., 2:30 for 2 hours 30 minutes)</p>
        </div>
      </div>

      <div className='flex flex-col sm:flex-row sm:space-x-4'>
        <div className='flex flex-col flex-1'>
          <label className='text-sm font-medium text-gray-700' htmlFor='provider'>
            Training Provider (Optional)
          </label>
          <input
            type='text'
            name='provider'
            id='provider'
            value={formData.provider}
            onChange={handleChange}
            className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-700 sm:text-sm'
            placeholder='Enter training provider'
          />
        </div>

        <div className='flex flex-col flex-1 mt-4 sm:mt-0'>
          <label className='text-sm font-medium text-gray-700' htmlFor='location'>
            Location (Optional)
          </label>
          <input
            type='text'
            name='location'
            id='location'
            value={formData.location}
            onChange={handleChange}
            className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-700 sm:text-sm'
            placeholder='Enter training location'
          />
        </div>
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
          {isSubmitting ? 'Submitting...' : 'Submit Training'}
        </button>
      </div>
    </form>
  );
};

export default TrainingForm;