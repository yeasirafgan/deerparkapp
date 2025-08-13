// components/TotalCompensatedHours.js

'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateMinutesWorked, convertMinutesToHours } from '@/utils/dateUtils';

const TotalCompensatedHours = ({ username }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [compensatedHours, setCompensatedHours] = useState({
    workHours: { hours: 0, minutes: 0 },
    leaveHours: { hours: 0, minutes: 0 },
    trainingHours: { hours: 0, minutes: 0 },
    totalHours: { hours: 0, minutes: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [cycleInfo, setCycleInfo] = useState(null);
  const isMountedRef = useRef(true);
  const lastUpdateTimeRef = useRef(null);
  const intervalRef = useRef(null);

  // Format time display function
  const formatTime = (hours, minutes) => {
    if (hours === 0 && minutes === 0) {
      return '0 m';
    } else if (minutes === 0) {
      return `${hours} h`;
    } else if (hours === 0) {
      return `${minutes} m`;
    } else {
      return `${hours} h ${minutes} m`;
    }
  };

  const fetchCompensatedHours = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setLoading(true);
      
      // Use the same 4-week cycle logic as admin page (no grace period)
      const { getFourWeekCycle } = await import('@/utils/weekCycleUtils');
      const currentCycle = getFourWeekCycle(new Date());
      
      const displayData = {
        displayCycle: {
          weeks: currentCycle
        },
        isGracePeriod: false,
        message: 'Showing current payment period'
      };
      setCycleInfo(displayData);
      
      const startDate = currentCycle[0].start.toISOString().split('T')[0];
      const endDate = currentCycle[currentCycle.length - 1].end.toISOString().split('T')[0];
      
      // Fetch work hours (timesheets)
      const timesheetsRes = await fetch(
        `/api/timesheets?username=${username}&includeDrafts=false&startDate=${startDate}&endDate=${endDate}&limit=1000`
      );
      
      let workMinutes = 0;
      if (timesheetsRes.ok) {
        const timesheetsData = await timesheetsRes.json();
        const timesheets = timesheetsData.timesheets || [];
        workMinutes = timesheets.reduce((total, timesheet) => {
          return total + calculateMinutesWorked(timesheet.start, timesheet.end);
        }, 0);
      }
      
      // Fetch approved leave hours
      const leaveHoursRes = await fetch(
        `/api/leave-hours?includeDrafts=false&username=${username}&startDate=${startDate}&endDate=${endDate}`
      );
      
      let leaveMinutes = 0;
      if (leaveHoursRes.ok) {
        const leaveHoursData = await leaveHoursRes.json();
        const approvedLeaveHours = (leaveHoursData.leaveHours || []).filter(
          lh => lh.status === 'approved' && !lh.deleted
        );
        leaveMinutes = approvedLeaveHours.reduce((total, lh) => {
          return total + (lh.hours * 60); // Convert hours to minutes
        }, 0);
      }
      
      // Fetch approved training hours
      const trainingRes = await fetch(
        `/api/training?includeDrafts=false&username=${username}&startDate=${startDate}&endDate=${endDate}`
      );
      
      let trainingMinutes = 0;
      if (trainingRes.ok) {
        const trainingData = await trainingRes.json();
        const approvedTraining = (trainingData.training || []).filter(
          t => t.status === 'approved' && !t.deleted
        );
        trainingMinutes = approvedTraining.reduce((total, t) => {
          return total + (t.duration * 60); // Convert hours to minutes
        }, 0);
      }
      
      // Check if user has any submitted leave or training hours (to determine visibility)
      const hasSubmittedData = await checkForSubmittedData(startDate, endDate);
      
      if (hasSubmittedData) {
        // Convert minutes to hours and minutes format
        const workTime = convertMinutesToHours(workMinutes);
        const leaveTime = convertMinutesToHours(leaveMinutes);
        const trainingTime = convertMinutesToHours(trainingMinutes);
        const totalTime = convertMinutesToHours(workMinutes + leaveMinutes + trainingMinutes);
        
        setCompensatedHours({
          workHours: workTime,
          leaveHours: leaveTime,
          trainingHours: trainingTime,
          totalHours: totalTime
        });
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Error fetching compensated hours:', error);
      setIsVisible(false);
    } finally {
      setLoading(false);
    }
  }, [username]);
  
  const checkForSubmittedData = async (startDate, endDate) => {
    try {
      // Check for any submitted (non-draft) leave hours
      const leaveHoursRes = await fetch(
        `/api/leave-hours?includeDrafts=true&username=${username}&startDate=${startDate}&endDate=${endDate}`
      );
      
      if (leaveHoursRes.ok) {
        const leaveHoursData = await leaveHoursRes.json();
        const submittedLeaveHours = (leaveHoursData.leaveHours || []).filter(
          lh => !lh.isDraft
        );
        if (submittedLeaveHours.length > 0) return true;
      }
      
      // Check for any submitted (non-draft) training hours
      const trainingRes = await fetch(
        `/api/training?includeDrafts=true&username=${username}&startDate=${startDate}&endDate=${endDate}`
      );
      
      if (trainingRes.ok) {
        const trainingData = await trainingRes.json();
        const submittedTraining = (trainingData.training || []).filter(
          t => !t.isDraft
        );
        if (submittedTraining.length > 0) return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for submitted data:', error);
      return false;
    }
  };
  
  // Check for updates function
  const checkForUpdates = useCallback(() => {
    if (!isMountedRef.current) return;
    
    const currentUpdateTime = localStorage.getItem('timesheetDataUpdated');
    if (currentUpdateTime && currentUpdateTime !== lastUpdateTimeRef.current) {
      lastUpdateTimeRef.current = currentUpdateTime;
      fetchCompensatedHours();
    }
  }, [fetchCompensatedHours]);
  
  // Event handlers
  const handleVisibilityChange = useCallback(() => {
    if (!document.hidden && isMountedRef.current) {
      fetchCompensatedHours();
    }
  }, [fetchCompensatedHours]);

  const handleFocus = useCallback(() => {
    if (isMountedRef.current) {
      fetchCompensatedHours();
    }
  }, [fetchCompensatedHours]);

  const handleStorageChange = useCallback((e) => {
    if (e.key === 'timesheetDataUpdated' && isMountedRef.current) {
      fetchCompensatedHours();
    }
  }, [fetchCompensatedHours]);
  
  useEffect(() => {
    fetchCompensatedHours();
    
    // Add a daily check for cycle changes
    const cycleCheckInterval = setInterval(() => {
      fetchCompensatedHours();
    }, 86400000); // Check once per day (24 hours)
    
    return () => {
      clearInterval(cycleCheckInterval);
    };
  }, [fetchCompensatedHours]);
  
  // Add focus event listener
  useEffect(() => {
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [handleFocus]);
  
  // Add visibility change event listener
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);
  
  // Listen for localStorage changes
  useEffect(() => {
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleStorageChange]);
  
  // Check for localStorage changes on the same tab
  useEffect(() => {
    lastUpdateTimeRef.current = localStorage.getItem('timesheetDataUpdated');
    
    intervalRef.current = setInterval(checkForUpdates, 1000); // Check every second
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkForUpdates]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (loading || !isVisible) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Total Compensated Hours
        </h3>
        {cycleInfo?.isGracePeriod && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            Grace Period
          </span>
        )}
      </div>
      
      {/* Full width responsive grid layout */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-lg sm:text-xl font-bold text-blue-600 leading-tight">{formatTime(compensatedHours.workHours.hours, compensatedHours.workHours.minutes)}</div>
          <div className="text-xs text-gray-600 mt-1">Work Hours</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg sm:text-xl font-bold text-green-600 leading-tight">{formatTime(compensatedHours.leaveHours.hours, compensatedHours.leaveHours.minutes)}</div>
          <div className="text-xs text-gray-600 mt-1">Leave Hours</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg sm:text-xl font-bold text-orange-600 leading-tight">{formatTime(compensatedHours.trainingHours.hours, compensatedHours.trainingHours.minutes)}</div>
          <div className="text-xs text-gray-600 mt-1">Training Hours</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg sm:text-xl font-bold text-purple-600 leading-tight">{formatTime(compensatedHours.totalHours.hours, compensatedHours.totalHours.minutes)}</div>
          <div className="text-xs text-gray-600 mt-1">Total Hours</div>
        </div>
      </div>
      
      {cycleInfo?.message && (
        <p className="text-xs text-gray-500 text-center mt-3">
          {cycleInfo.message}
        </p>
      )}
    </div>
  );
};

export default TotalCompensatedHours;