//components/TabbedInterface.js

'use client';

import { useState } from 'react';
import TimesheetForm from '../app/timesheet/TimesheetForm';
import LeaveHoursForm from './LeaveHoursForm';
import LeaveForm from './LeaveForm';
import TrainingForm from './TrainingForm';

const TabbedInterface = ({ onTimesheetSubmit, username }) => {
  const [activeTab, setActiveTab] = useState('timesheet');

  const tabs = [
    {
      id: 'timesheet',
      label: 'Work Hours',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'leaveHours',
      label: 'Leave Form',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'training',
      label: 'Training Hours',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      id: 'leave',
      label: 'Leave Request',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" />
        </svg>
      ),
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'timesheet':
        return (
          <TimesheetForm
                onSubmit={onTimesheetSubmit}
                username={username}
              />
        );
      case 'leaveHours':
        return (
          <LeaveHoursForm
            username={username}
          />
        );
      case 'training':
        return (
          <TrainingForm
            username={username}
          />
        );
      case 'leave':
        return (
          <LeaveForm
            username={username}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group inline-flex items-center py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'border-slate-500 text-slate-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className={`mr-1 sm:mr-2 transition-colors duration-200 ${
                activeTab === tab.id ? 'text-slate-500' : 'text-gray-400 group-hover:text-gray-500'
              }`}>
                {tab.icon}
              </span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-xs">
                {tab.id === 'leave' ? 'Leave R' : tab.label.split(' ')[0]}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300 ease-in-out">
        {renderTabContent()}
      </div>

      {/* Mobile Tab Indicator */}
      <div className="sm:hidden mt-4">
        <div className="flex justify-center space-x-2">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                activeTab === tab.id ? 'bg-slate-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TabbedInterface;