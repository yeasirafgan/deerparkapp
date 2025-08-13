//components/LeaveHoursForm.js

'use client';

import { enGB } from 'date-fns/locale';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const LeaveHoursForm = ({ onSubmit, username }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    leaveType: '',
    date: new Date(),
    hours: '',
    reason: '',
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
      if (!formData.leaveType || !formData.date || !formData.hours) {
        throw new Error('Please fill in all required fields');
      }

      // Validate hours as decimal number
      const hours = parseFloat(formData.hours);
      
      if (isNaN(hours) || hours < 0.5 || hours > 24) {
        throw new Error('Hours must be between 0.5 and 24');
      }

      const submitData = {
        ...formData,
        hours: hours,
        isDraft,
        username,
      };

      const response = await fetch('/api/leave-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit leave hours');
      }

      const result = await response.json();
      setSuccessMessage(
        isDraft
          ? 'Leave hours saved as draft successfully!'
          : 'Leave hours submitted successfully!'
      );

      // Reset form
      setFormData({
        leaveType: '',
        date: new Date(),
        hours: '',
        reason: '',
      });

      // Call onSubmit if provided
      if (onSubmit) {
        onSubmit(result);
      }

      // Refresh the page to update data
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-600 text-sm">{successMessage}</p>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Leave Type */}
        <div>
          <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 mb-2">
            Leave Type *
          </label>
          <select
            id="leaveType"
            name="leaveType"
            value={formData.leaveType}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select leave type</option>
            <option value="annual">Annual Leave</option>
            <option value="sick">Sick Leave</option>
            <option value="maternity">Maternity Leave</option>
          </select>
        </div>

        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            Date *
          </label>
          <DatePicker
            selected={formData.date}
            onChange={handleDateChange}
            dateFormat="dd/MM/yyyy"
            locale={enGB}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholderText="Select date"
            required
          />
        </div>

        {/* Hours */}
        <div>
          <label htmlFor="hours" className="block text-sm font-medium text-gray-700 mb-2">
            Hours *
          </label>
          <input
            type="number"
            id="hours"
            name="hours"
            value={formData.hours}
            onChange={handleChange}
            min="0.5"
            max="24"
            step="0.5"
            placeholder="e.g., 8 or 4.5"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Enter hours as decimal (e.g., 4.5 for 4 hours 30 minutes)</p>
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason (Optional)
          </label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows={3}
            placeholder="Brief description of the leave reason..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
          <button
            type="button"
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
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-white transition duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-slate-700 hover:bg-slate-800'
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeaveHoursForm;