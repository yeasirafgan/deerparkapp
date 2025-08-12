//components/UserTimesheetData.js

'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import React from 'react';
import Pagination from 'rc-pagination';
import { getFourWeekCycle } from '@/utils/weekCycleUtils';
import { getDisplayCycleData } from '@/utils/paymentCycleUtils';
import { calculateMinutesWorked, convertMinutesToHours } from '@/utils/dateUtils';
import DraftManager from './DraftManager';

const UserTimesheetData = ({ username }) => {
  // Use refs for cleanup tracking
  const intervalRef = useRef(null);
  const lastUpdateTimeRef = useRef(null);
  const isMountedRef = useRef(true);

  const [timesheets, setTimesheets] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leaveHours, setLeaveHours] = useState([]);
  const [training, setTraining] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [totalHours, setTotalHours] = useState(0);
  const [remainingMinutes, setRemainingMinutes] = useState(0);
  const [cycleInfo, setCycleInfo] = useState(null);
  const [selectedDrafts, setSelectedDrafts] = useState({
    leaves: [],
    leaveHours: [],
    training: []
  });
  const [isSubmittingDrafts, setIsSubmittingDrafts] = useState(false);
  const [draftMessage, setDraftMessage] = useState(null);
  const limit = 10;

  // Function to reset data if the cycle has changed
  const resetDataForNewCycle = () => {
    try {
      const today = new Date();
      const cycles = getFourWeekCycle(today); // Get the current 4-week cycle

      const lastCycleEndWithoutTime = new Date(
        cycles[cycles.length - 1].end.toDateString()
      );

      // Check if today is past the last day of the cycle
      if (new Date(today.toDateString()) > lastCycleEndWithoutTime) {
        setTimesheets([]); // Reset timesheets for the new cycle
      }
    } catch (error) {
      console.error('Error in resetDataForNewCycle:', error);
    }
  };

  // Fetch timesheets based on the current page
  const fetchTimesheets = useCallback(async (page) => {
    setIsLoading(true);
    try {
      // Get display cycle data (handles grace period logic)
      const displayData = getDisplayCycleData(new Date());
      setCycleInfo(displayData);
      
      const cycles = displayData.displayCycle.weeks;
      const today = new Date().setHours(0, 0, 0, 0); // Strip time

      // Ensure cycles is an array before calling find
      if (!Array.isArray(cycles)) {
        console.error('cycles is not an array:', cycles);
        setIsLoading(false);
        return;
      }

      const cycle = cycles.find((cycle) => {
        const cycleStart = new Date(cycle.start).setHours(0, 0, 0, 0);
        const cycleEnd = new Date(cycle.end).setHours(23, 59, 59, 999); // Include entire day
        return today >= cycleStart && today <= cycleEnd;
      });

      // For grace period, we want to show the previous cycle data
      const targetCycles = displayData.isGracePeriod ? displayData.displayCycle.weeks : getFourWeekCycle(new Date());
      
      if (!targetCycles || targetCycles.length === 0) {
        console.error('Could not find the target cycle.');
        return;
      }

      resetDataForNewCycle();

      // Build API URL with cycle date range for grace period handling
      const startDate = targetCycles[0].start.toISOString().split('T')[0];
      const endDate = targetCycles[targetCycles.length - 1].end.toISOString().split('T')[0];
      
      const apiUrl = `/api/timesheets?username=${username}&page=${page}&limit=${limit}&includeDrafts=false&startDate=${startDate}&endDate=${endDate}`;
      
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('Failed to fetch timesheets');
      const data = await res.json();

      setTimesheets(data.timesheets || []);
      setTotalPages(Math.ceil(data.totalCount / limit));
      setTotalHours(data.totalHours);
      setRemainingMinutes(data.remainingMinutes);
      
      // Fetch user's all leaves for the same period (pending, approved, rejected)
      const leavesRes = await fetch(
        `/api/leaves?includeDrafts=true&username=${username}&startDate=${startDate}&endDate=${endDate}`
      );
      if (leavesRes.ok) {
        const leavesData = await leavesRes.json();
        setLeaves(leavesData.leaves || []);
      }
      
      // Fetch user's all leave hours for the same period (pending, approved, rejected)
      const leaveHoursRes = await fetch(
        `/api/leave-hours?includeDrafts=true&username=${username}&startDate=${startDate}&endDate=${endDate}`
      );
      if (leaveHoursRes.ok) {
        const leaveHoursData = await leaveHoursRes.json();
        setLeaveHours(leaveHoursData.leaveHours || []);
      }
      
      // Fetch user's all training for the same period (pending, approved, rejected)
      const trainingRes = await fetch(
        `/api/training?includeDrafts=true&username=${username}&startDate=${startDate}&endDate=${endDate}`
      );
      if (trainingRes.ok) {
        const trainingData = await trainingRes.json();
        setTraining(trainingData.training || []);
      }
    } catch (error) {
      console.error('Failed to fetch timesheets:', error);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  // Removed useImperativeHandle since we're using router.refresh() now

  useEffect(() => {
    resetDataForNewCycle();
    fetchTimesheets(page);
    
    // Add a daily check for cycle changes
    const cycleCheckInterval = setInterval(() => {
      resetDataForNewCycle();
      fetchTimesheets(page);
    }, 86400000); // Check once per day (24 hours)
    
    // Clean up the interval when the component unmounts
    return () => {
      clearInterval(cycleCheckInterval);
    };
  }, [page, username]);
  
  // Add a function to manually refresh data
  const refreshData = useCallback(() => {
    if (isMountedRef.current) {
      fetchTimesheets(page);
    }
  }, [fetchTimesheets, page]);

  // Event handlers with useCallback
  const handleVisibilityChange = useCallback(() => {
    if (!document.hidden && isMountedRef.current) {
      fetchTimesheets(page);
    }
  }, [fetchTimesheets, page]);

  const handleFocus = useCallback(() => {
    if (isMountedRef.current) {
      fetchTimesheets(page);
    }
  }, [fetchTimesheets, page]);

  const handleStorageChange = useCallback((e) => {
    if (e.key === 'timesheetDataUpdated' && isMountedRef.current) {
      fetchTimesheets(page);
    }
  }, [fetchTimesheets, page]);

  // Check for updates function with ref
  const checkForUpdates = useCallback(() => {
    if (!isMountedRef.current) return;
    
    const currentUpdateTime = localStorage.getItem('timesheetDataUpdated');
    if (currentUpdateTime && currentUpdateTime !== lastUpdateTimeRef.current) {
      lastUpdateTimeRef.current = currentUpdateTime;
      fetchTimesheets(page);
    }
  }, [fetchTimesheets, page]);
  
  // Add focus event listener to refresh data when window gains focus
   useEffect(() => {
     window.addEventListener('focus', handleFocus);
     
     return () => {
       window.removeEventListener('focus', handleFocus);
     };
   }, [handleFocus]);
   
   // Add visibility change event listener to refresh data when tab becomes visible
   useEffect(() => {
     document.addEventListener('visibilitychange', handleVisibilityChange);

     return () => {
       document.removeEventListener('visibilitychange', handleVisibilityChange);
     };
   }, [handleVisibilityChange]);

   // Cleanup on unmount
   useEffect(() => {
     return () => {
       isMountedRef.current = false;
       if (intervalRef.current) {
         clearInterval(intervalRef.current);
       }
     };
   }, []);
   
   // Listen for localStorage changes to refresh data when approvals happen
   useEffect(() => {
     window.addEventListener('storage', handleStorageChange);
     
     return () => {
       window.removeEventListener('storage', handleStorageChange);
     };
   }, [handleStorageChange]);
   
   // Also check for localStorage changes on the same tab
   useEffect(() => {
     lastUpdateTimeRef.current = localStorage.getItem('timesheetDataUpdated');
     
     intervalRef.current = setInterval(checkForUpdates, 1000); // Check every second
     
     return () => {
       if (intervalRef.current) {
         clearInterval(intervalRef.current);
       }
     };
   }, [checkForUpdates]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    }).format(date);
  };
  
  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatTime = (hours, minutes) => {
    return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} m`;
  };

  // Format hours from start and end time strings
  const formatHours = (start, end) => {
    if (!start || !end) return '0 h';
    
    const minutesWorked = calculateMinutesWorked(start, end);
    const { hours, minutes } = convertMinutesToHours(minutesWorked);
    
    return formatTime(hours, minutes);
  };

  // Delete functions - Only allow deletion of draft/pending records
  const handleDeleteLeave = async (id) => {
    const leave = leaves.find(l => l._id === id);
    if (leave && leave.status === 'approved') {
      alert('Cannot delete approved leave requests. Approved requests are preserved for payroll records.');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this leave request?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/leaves', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      
      if (response.ok) {
        setLeaves(leaves.filter(leave => leave._id !== id));
      } else {
        alert('Failed to delete leave request');
      }
    } catch (error) {
      console.error('Error deleting leave:', error);
      alert('Failed to delete leave request');
    }
  };
  
  const handleDeleteLeaveHours = async (id) => {
    const leaveHour = leaveHours.find(lh => lh._id === id);
    if (leaveHour && leaveHour.status === 'approved') {
      alert('Cannot delete approved leave hours. Approved hours are preserved for payroll records.');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this leave hours entry?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/leave-hours', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      
      if (response.ok) {
        setLeaveHours(leaveHours.filter(lh => lh._id !== id));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete leave hours entry');
      }
    } catch (error) {
      console.error('Error deleting leave hours:', error);
      alert('Failed to delete leave hours entry');
    }
  };
  
  const handleDeleteTraining = async (id) => {
    const trainingRecord = training.find(t => t._id === id);
    if (trainingRecord && trainingRecord.status === 'approved') {
      alert('Cannot delete approved training records. Approved records are preserved for payroll records.');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this training record?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/training', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      
      if (response.ok) {
        setTraining(training.filter(t => t._id !== id));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete training record');
      }
    } catch (error) {
      console.error('Error deleting training:', error);
      alert('Failed to delete training record');
    }
  };



  // Handle individual draft selection
  const handleDraftSelection = (type, draftId, isSelected) => {
    setSelectedDrafts(prev => ({
      ...prev,
      [type]: isSelected 
        ? [...prev[type], draftId]
        : prev[type].filter(id => id !== draftId)
    }));
  };

  // Handle select all for a type
  const handleSelectAll = useCallback((type, items, selectAll) => {
    setSelectedDrafts(prev => ({
      ...prev,
      [type]: selectAll ? items.filter(item => item.isDraft).map(item => item._id) : []
    }));
  }, []);

  // Memoize expensive calculations
  const draftCounts = useMemo(() => {
    return {
      leaves: leaves.filter(item => item.isDraft).length,
      leaveHours: leaveHours.filter(item => item.isDraft).length,
      training: training.filter(item => item.isDraft).length
    };
  }, [leaves, leaveHours, training]);

  const totalDrafts = useMemo(() => {
    return draftCounts.leaves + draftCounts.leaveHours + draftCounts.training;
  }, [draftCounts]);

  const formattedTimesheets = useMemo(() => {
    return timesheets.map(timesheet => ({
      ...timesheet,
      formattedDate: formatDate(timesheet.date),
      formattedHours: formatHours(timesheet.start, timesheet.end)
    }));
  }, [timesheets]);

  // Submit selected drafts
  const handleBulkSubmitDrafts = async (type) => {
    setIsSubmittingDrafts(true);
    setDraftMessage(null);
    
    try {
      const promises = [];
      const apiEndpoint = type === 'leaves' ? '/api/leaves' : type === 'leaveHours' ? '/api/leave-hours' : '/api/training';
      
      selectedDrafts[type].forEach(id => {
        promises.push(
          fetch(apiEndpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, isDraft: false })
          })
        );
      });
      
      await Promise.all(promises);
      
      setDraftMessage('Selected drafts submitted successfully!');
      setSelectedDrafts(prev => ({ ...prev, [type]: [] }));
      
      // Refresh data
      await refreshData();
      
      setTimeout(() => setDraftMessage(null), 3000);
    } catch (err) {
      setDraftMessage('Failed to submit drafts');
    } finally {
      setIsSubmittingDrafts(false);
    }
  };

  // Get draft entries for a specific type
  const getDraftEntries = (items) => items.filter(item => item.isDraft);
  const getNonDraftEntries = (items) => items.filter(item => !item.isDraft);

  return (
    <div className='space-y-6'>
      {/* Work Hours Box */}
      <div className='p-4 sm:p-5 bg-white shadow-md rounded-lg'>
        <h2 className='text-xl md:text-lg font-semibold mb-3 sm:mb-4 text-center sm:text-left text-slate-700'>
          {`${username}'s work for latest 4 weeks`}
        </h2>
        
        {/* Grace Period Notice */}
        {cycleInfo?.isGracePeriod && (
          <div className='mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
            <div className='flex items-center'>
              <svg className='w-5 h-5 text-yellow-600 mr-2' fill='currentColor' viewBox='0 0 20 20'>
                <path fillRule='evenodd' d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
              </svg>
              <div>
                <p className='text-sm font-medium text-yellow-800'>Grace Period Active</p>
                <p className='text-xs text-yellow-700'>{cycleInfo.message}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
           <div className='text-center'>Loading data...</div>
         ) : (
           <div>
             <h3 className='text-lg font-medium text-gray-900 mb-3'>Work Hours</h3>
             <div className='overflow-x-auto rounded-md'>
               <table className='min-w-full bg-white border text-xs sm:text-sm'>
                 <thead>
                   <tr className='bg-gray-100'>
                     <th className='border px-2 sm:px-4 py-2 text-left'>Date</th>
                     <th className='border px-2 sm:px-4 py-2 text-left'>Start</th>
                     <th className='border px-2 sm:px-4 py-2 text-left'>End</th>
                     <th className='border px-2 sm:px-4 py-2 text-left'>Hours Worked</th>
                   </tr>
                 </thead>
                 <tbody>
                   {timesheets.map((ts) => (
                     <tr key={ts._id} className='hover:bg-gray-50'>
                       <td className='border px-2 sm:px-4 py-1 sm:py-2'>
                         {formatDate(ts.date)}
                       </td>
                       <td className='border px-2 sm:px-4 py-1 sm:py-2'>
                         {ts.start}
                       </td>
                       <td className='border px-2 sm:px-4 py-1 sm:py-2'>{ts.end}</td>
                       <td className='border px-2 sm:px-4 py-1 sm:py-2 font-medium'>
                         {formatTime(ts.hours, ts.minutes)}
                       </td>
                     </tr>
                   ))}
                 </tbody>
                 <tfoot>
                   <tr className='bg-gray-100'>
                     <td colSpan='3' className='border px-2 sm:px-4 py-2 font-bold text-left'>
                       Total Hours
                     </td>
                     <td className='border px-2 sm:px-4 py-2 font-bold'>
                       {formatTime(totalHours, remainingMinutes)}
                     </td>
                   </tr>
                 </tfoot>
               </table>
             </div>
           </div>
         )}
         
         {timesheets.length > 0 && (
           <div className='mt-4 flex justify-center'>
             <Pagination
               current={page}
               total={totalPages * limit}
               pageSize={limit}
               onChange={(page) => {
                 setPage(page);
               }}
               className='pagination'
             />
           </div>
         )}
       </div>
       
       {/* Other Records Box */}
       <div className='p-4 sm:p-5 bg-white shadow-md rounded-lg'>
         <div className='flex justify-between items-center mb-3 sm:mb-4'>
           <h2 className='text-xl md:text-lg font-semibold text-slate-700'>
             My Requests
           </h2>
           <button
             onClick={refreshData}
             disabled={isLoading}
             className='px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
             title='Refresh pending requests'
           >
             {isLoading ? '⟳' : '↻'} Refresh
           </button>
         </div>
         
         {isLoading ? (
           <div className='text-center'>Loading data...</div>
         ) : (
           <div className='space-y-6'>

              {/* Leave Requests Section */}
              {leaves.length > 0 && (
                <div>
                  <h3 className='text-lg font-medium text-gray-900 mb-3'>Leave Requests</h3>
                  
                  {/* Draft Leave Requests */}
                  {getDraftEntries(leaves).length > 0 && (
                    <div className='mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
                      <div className='flex items-center justify-between mb-2'>
                        <h4 className='font-medium text-yellow-800'>Draft Leave Requests ({getDraftEntries(leaves).length})</h4>
                        <div className='flex items-center space-x-2'>
                          <button
                            onClick={() => handleSelectAll('leaves', leaves, selectedDrafts.leaves.length !== getDraftEntries(leaves).length)}
                            className='text-xs text-blue-600 hover:text-blue-800'
                          >
                            {selectedDrafts.leaves.length === getDraftEntries(leaves).length ? 'Deselect All' : 'Select All'}
                          </button>
                          {selectedDrafts.leaves.length > 0 && (
                            <button
                              onClick={() => handleBulkSubmitDrafts('leaves')}
                              disabled={isSubmittingDrafts}
                              className='px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-400'
                            >
                              {isSubmittingDrafts ? 'Submitting...' : `Submit Selected (${selectedDrafts.leaves.length})`}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className='space-y-2'>
                        {getDraftEntries(leaves).map((leave) => (
                          <div key={leave._id} className='flex items-center space-x-3 p-2 bg-white border rounded'>
                            <input
                              type='checkbox'
                              checked={selectedDrafts.leaves.includes(leave._id)}
                              onChange={(e) => handleDraftSelection('leaves', leave._id, e.target.checked)}
                              className='rounded border-gray-300 text-slate-600 focus:ring-slate-500'
                            />
                            <div className='flex-1 text-sm'>
                              <span>{leave.leaveType} - {formatDate(leave.startDate)} to {formatDate(leave.endDate)} ({leave.totalDays} days)</span>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Non-Draft Leave Requests */}
                  {getNonDraftEntries(leaves).length > 0 && (
                    <div className='overflow-x-auto rounded-md'>
                      <table className='min-w-full bg-white border text-xs sm:text-sm'>
                        <thead>
                          <tr className='bg-green-50'>
                            <th className='border px-2 sm:px-4 py-2 text-left'>Leave Type</th>
                            <th className='border px-2 sm:px-4 py-2 text-left'>Start Date</th>
                            <th className='border px-2 sm:px-4 py-2 text-left'>End Date</th>
                            <th className='border px-2 sm:px-4 py-2 text-left'>Days</th>
                            <th className='border px-2 sm:px-4 py-2 text-left'>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getNonDraftEntries(leaves).map((leave) => (
                            <tr key={leave._id} className='hover:bg-green-25'>
                              <td className='border px-2 sm:px-4 py-1 sm:py-2 capitalize'>
                                {leave.leaveType}
                              </td>
                              <td className='border px-2 sm:px-4 py-1 sm:py-2'>
                                {formatDate(leave.startDate)}
                              </td>
                              <td className='border px-2 sm:px-4 py-1 sm:py-2'>
                                {formatDate(leave.endDate)}
                              </td>
                              <td className='border px-2 sm:px-4 py-1 sm:py-2 font-medium'>
                                {leave.totalDays}
                              </td>
                              <td className='border px-2 sm:px-4 py-1 sm:py-2'>
                                {getStatusBadge(leave.status)}
                              </td>

                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Leave Hours Section */}
              {leaveHours.length > 0 && (
                <div>
                  <h3 className='text-lg font-medium text-gray-900 mb-3'>Leave Hours</h3>
                  
                  {/* Draft Leave Hours */}
                  {getDraftEntries(leaveHours).length > 0 && (
                    <div className='mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
                      <div className='flex items-center justify-between mb-2'>
                        <h4 className='font-medium text-yellow-800'>Draft Leave Hours ({getDraftEntries(leaveHours).length})</h4>
                        <div className='flex items-center space-x-2'>
                          <button
                            onClick={() => handleSelectAll('leaveHours', leaveHours, selectedDrafts.leaveHours.length !== getDraftEntries(leaveHours).length)}
                            className='text-xs text-blue-600 hover:text-blue-800'
                          >
                            {selectedDrafts.leaveHours.length === getDraftEntries(leaveHours).length ? 'Deselect All' : 'Select All'}
                          </button>
                          {selectedDrafts.leaveHours.length > 0 && (
                            <button
                              onClick={() => handleBulkSubmitDrafts('leaveHours')}
                              disabled={isSubmittingDrafts}
                              className='px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-400'
                            >
                              {isSubmittingDrafts ? 'Submitting...' : `Submit Selected (${selectedDrafts.leaveHours.length})`}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className='space-y-2'>
                        {getDraftEntries(leaveHours).map((leaveHour) => (
                          <div key={leaveHour._id} className='flex items-center space-x-3 p-2 bg-white border rounded'>
                            <input
                              type='checkbox'
                              checked={selectedDrafts.leaveHours.includes(leaveHour._id)}
                              onChange={(e) => handleDraftSelection('leaveHours', leaveHour._id, e.target.checked)}
                              className='rounded border-gray-300 text-slate-600 focus:ring-slate-500'
                            />
                            <div className='flex-1 text-sm'>
                              <span>{leaveHour.leaveType} - {formatDate(leaveHour.date)} ({leaveHour.hours} hours)</span>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Non-Draft Leave Hours */}
                  {getNonDraftEntries(leaveHours).length > 0 && (
                    <div className='overflow-x-auto rounded-md'>
                      <table className='min-w-full bg-white border text-xs sm:text-sm'>
                        <thead>
                          <tr className='bg-orange-50'>
                            <th className='border px-2 sm:px-4 py-2 text-left'>Leave Type</th>
                            <th className='border px-2 sm:px-4 py-2 text-left'>Date</th>
                            <th className='border px-2 sm:px-4 py-2 text-left'>Hours</th>
                            <th className='border px-2 sm:px-4 py-2 text-left'>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getNonDraftEntries(leaveHours).map((leaveHour) => (
                            <tr key={leaveHour._id} className='hover:bg-orange-25'>
                              <td className='border px-2 sm:px-4 py-1 sm:py-2 capitalize'>
                                {leaveHour.leaveType}
                              </td>
                              <td className='border px-2 sm:px-4 py-1 sm:py-2'>
                                {formatDate(leaveHour.date)}
                              </td>
                              <td className='border px-2 sm:px-4 py-1 sm:py-2 font-medium'>
                                {leaveHour.hours}
                              </td>
                              <td className='border px-2 sm:px-4 py-1 sm:py-2'>
                                {getStatusBadge(leaveHour.status)}
                              </td>

                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Training Records Section */}
              {training.length > 0 && (
                <div>
                  <h3 className='text-lg font-medium text-gray-900 mb-3'>Training Records</h3>
                  
                  {/* Draft Training Records */}
                  {getDraftEntries(training).length > 0 && (
                    <div className='mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
                      <div className='flex items-center justify-between mb-2'>
                        <h4 className='font-medium text-yellow-800'>Draft Training Records ({getDraftEntries(training).length})</h4>
                        <div className='flex items-center space-x-2'>
                          <button
                            onClick={() => handleSelectAll('training', training, selectedDrafts.training.length !== getDraftEntries(training).length)}
                            className='text-xs text-blue-600 hover:text-blue-800'
                          >
                            {selectedDrafts.training.length === getDraftEntries(training).length ? 'Deselect All' : 'Select All'}
                          </button>
                          {selectedDrafts.training.length > 0 && (
                            <button
                              onClick={() => handleBulkSubmitDrafts('training')}
                              disabled={isSubmittingDrafts}
                              className='px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-400'
                            >
                              {isSubmittingDrafts ? 'Submitting...' : `Submit Selected (${selectedDrafts.training.length})`}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className='space-y-2'>
                        {getDraftEntries(training).map((train) => (
                          <div key={train._id} className='flex items-center space-x-3 p-2 bg-white border rounded'>
                            <input
                              type='checkbox'
                              checked={selectedDrafts.training.includes(train._id)}
                              onChange={(e) => handleDraftSelection('training', train._id, e.target.checked)}
                              className='rounded border-gray-300 text-slate-600 focus:ring-slate-500'
                            />
                            <div className='flex-1 text-sm'>
                              <span>{train.title} - {formatDate(train.date)} ({train.duration} hrs)</span>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Non-Draft Training Records */}
                  {getNonDraftEntries(training).length > 0 && (
                    <div className='overflow-x-auto rounded-md'>
                      <table className='min-w-full bg-white border text-xs sm:text-sm'>
                        <thead>
                          <tr className='bg-purple-50'>
                            <th className='border px-2 sm:px-4 py-2 text-left'>Title</th>
                            <th className='border px-2 sm:px-4 py-2 text-left'>Date</th>
                            <th className='border px-2 sm:px-4 py-2 text-left'>Duration (hrs)</th>
                            <th className='border px-2 sm:px-4 py-2 text-left'>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getNonDraftEntries(training).map((train) => (
                            <tr key={train._id} className='hover:bg-purple-25'>
                              <td className='border px-2 sm:px-4 py-1 sm:py-2'>
                                {train.title}
                              </td>
                              <td className='border px-2 sm:px-4 py-1 sm:py-2'>
                                {formatDate(train.date)}
                              </td>
                              <td className='border px-2 sm:px-4 py-1 sm:py-2 font-medium'>
                                {train.duration}
                              </td>
                              <td className='border px-2 sm:px-4 py-1 sm:py-2'>
                                {getStatusBadge(train.status)}
                              </td>

                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Draft submission message */}
            {draftMessage && (
              <div className={`mb-4 p-3 rounded-lg ${draftMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                {draftMessage.text}
              </div>
            )}
        
        <DraftManager username={username} onBulkSubmit={() => fetchTimesheets(page)} />
      </div>
  );
};

export default React.memo(UserTimesheetData);
