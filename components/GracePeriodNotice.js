// components/GracePeriodNotice.js

'use client';
import { useState, useEffect } from 'react';
import { getPaymentCycleInfo } from '@/utils/paymentCycleUtils';
import { calculateMinutesWorked, convertMinutesToHours } from '@/utils/dateUtils';

const GracePeriodNotice = ({ username }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [previousCycleTotalHours, setPreviousCycleTotalHours] = useState({
    workHours: 0,
    leaveHours: 0,
    trainingHours: 0,
    totalHours: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkGracePeriodAndFetchData = async () => {
      try {
        const paymentInfo = getPaymentCycleInfo(new Date());
        
        // Check if we're in grace period (after cycle ends until Friday night)
        if (paymentInfo.isInGracePeriod) {
          setIsVisible(true);
          
          // Fetch previous cycle data
          const previousCycle = paymentInfo.previousCycle;
          const startDate = previousCycle.start.toISOString().split('T')[0];
          const endDate = previousCycle.end.toISOString().split('T')[0];
          
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
          
          // Calculate all hours
          const workHours = convertMinutesToHours(workMinutes).hours;
          const leaveHours = convertMinutesToHours(leaveMinutes).hours;
          const trainingHours = convertMinutesToHours(trainingMinutes).hours;
          const totalHours = workHours + leaveHours + trainingHours;
          
          setPreviousCycleTotalHours({
            workHours,
            leaveHours,
            trainingHours,
            totalHours
          });
        } else {
          setIsVisible(false);
        }
      } catch (error) {
        console.error('Error checking grace period:', error);
        setIsVisible(false);
      } finally {
        setLoading(false);
      }
    };

    checkGracePeriodAndFetchData();
    
    // Check every hour to update visibility
    const interval = setInterval(checkGracePeriodAndFetchData, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [username]);

  if (loading || !isVisible) {
    return null;
  }

  return (
    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-blue-800">
          Previous 4-Week Cycle Total
        </h3>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
          Grace Period
        </span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{previousCycleTotalHours.workHours}</div>
          <div className="text-xs text-gray-600">Work</div>
        </div>
        
        {previousCycleTotalHours.leaveHours > 0 && (
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{previousCycleTotalHours.leaveHours}</div>
            <div className="text-xs text-gray-600">Leave</div>
          </div>
        )}
        
        {previousCycleTotalHours.trainingHours > 0 && (
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{previousCycleTotalHours.trainingHours}</div>
            <div className="text-xs text-gray-600">Training</div>
          </div>
        )}
        
        <div className="text-center">
          <div className="text-xl font-bold text-purple-600">{previousCycleTotalHours.totalHours}</div>
          <div className="text-xs text-gray-600">Total Hours</div>
        </div>
      </div>
    </div>
  );
};

export default GracePeriodNotice;