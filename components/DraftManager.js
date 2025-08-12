//components/DraftManager.js

'use client';

import { useState, useEffect } from 'react';

const DraftManager = ({ username, onBulkSubmit }) => {
  const [drafts, setDrafts] = useState({
    timesheets: [],
    leaves: [],
    training: []
  });
  const [selectedDrafts, setSelectedDrafts] = useState({
    timesheets: [],
    leaves: [],
    training: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch all draft entries
  const fetchDrafts = async () => {
    setIsLoading(true);
    try {
      const [timesheetsRes, leavesRes, trainingRes] = await Promise.all([
        fetch(`/api/timesheets?username=${encodeURIComponent(username)}&includeDrafts=true&draftsOnly=true`),
        fetch(`/api/leaves?username=${encodeURIComponent(username)}&includeDrafts=true&status=draft`),
        fetch(`/api/training?username=${encodeURIComponent(username)}&includeDrafts=true&status=draft`)
      ]);

      const [timesheetsData, leavesData, trainingData] = await Promise.all([
        timesheetsRes.json(),
        leavesRes.json(),
        trainingRes.json()
      ]);

      setDrafts({
        timesheets: timesheetsData.timesheets?.filter(t => t.isDraft) || [],
        leaves: leavesData.leaves?.filter(l => l.isDraft) || [],
        training: trainingData.training?.filter(t => t.isDraft) || []
      });
    } catch (err) {
      setError('Failed to fetch draft entries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

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
  const handleSelectAll = (type, selectAll) => {
    setSelectedDrafts(prev => ({
      ...prev,
      [type]: selectAll ? drafts[type].map(item => item._id) : []
    }));
  };

  // Submit selected drafts
  const handleBulkSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const promises = [];
      
      // Submit timesheet drafts
      selectedDrafts.timesheets.forEach(id => {
        const draft = drafts.timesheets.find(t => t._id === id);
        if (draft) {
          promises.push(
            fetch('/api/timesheets', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, isDraft: false })
            })
          );
        }
      });
      
      // Submit leave drafts
      selectedDrafts.leaves.forEach(id => {
        promises.push(
          fetch('/api/leaves', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, isDraft: false })
          })
        );
      });
      
      // Submit training drafts
      selectedDrafts.training.forEach(id => {
        promises.push(
          fetch('/api/training', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, isDraft: false })
          })
        );
      });
      
      await Promise.all(promises);
      
      setSuccessMessage('Selected drafts submitted successfully!');
      setSelectedDrafts({ timesheets: [], leaves: [], training: [] });
      
      // Refresh drafts and notify parent
      await fetchDrafts();
      if (onBulkSubmit) onBulkSubmit();
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to submit drafts');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete selected drafts
  const handleBulkDelete = async () => {
    if (!confirm('Are you sure you want to delete the selected drafts?')) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const promises = [];
      
      // Delete timesheet drafts
      selectedDrafts.timesheets.forEach(id => {
        promises.push(
          fetch(`/api/timesheets?id=${id}`, { method: 'DELETE' })
        );
      });
      
      // Delete leave drafts
      selectedDrafts.leaves.forEach(id => {
        promises.push(
          fetch(`/api/leaves?id=${id}`, { method: 'DELETE' })
        );
      });
      
      // Delete training drafts
      selectedDrafts.training.forEach(id => {
        promises.push(
          fetch(`/api/training?id=${id}`, { method: 'DELETE' })
        );
      });
      
      await Promise.all(promises);
      
      setSuccessMessage('Selected drafts deleted successfully!');
      setSelectedDrafts({ timesheets: [], leaves: [], training: [] });
      
      // Refresh drafts
      await fetchDrafts();
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to delete drafts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalDrafts = drafts.timesheets.length + drafts.leaves.length + drafts.training.length;
  const totalSelected = selectedDrafts.timesheets.length + selectedDrafts.leaves.length + selectedDrafts.training.length;

  if (isLoading) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="animate-pulse">Loading drafts...</div>
      </div>
    );
  }

  if (totalDrafts === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
        No draft entries found.
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const DraftSection = ({ title, type, items, icon }) => {
    if (items.length === 0) return null;
    
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-700 flex items-center">
            {icon}
            <span className="ml-2">{title} ({items.length})</span>
          </h4>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSelectAll(type, selectedDrafts[type].length !== items.length)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {selectedDrafts[type].length === items.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item._id} className="flex items-center space-x-3 p-2 bg-white border rounded">
              <input
                type="checkbox"
                checked={selectedDrafts[type].includes(item._id)}
                onChange={(e) => handleDraftSelection(type, item._id, e.target.checked)}
                className="rounded border-gray-300 text-slate-600 focus:ring-slate-500"
              />
              <div className="flex-1 text-sm">
                {type === 'timesheets' && (
                  <span>{formatDate(item.date)} - {item.start} to {item.end} ({((item.hours || 0) + (item.minutes || 0) / 60).toFixed(1)}h)</span>
                )}
                {type === 'leaves' && (
                  <span>{item.leaveType} - {formatDate(item.startDate)} to {formatDate(item.endDate)} ({item.totalDays} days)</span>
                )}
                {type === 'training' && (
                  <span>{item.title} - {formatDate(item.date)} ({item.duration}h)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-yellow-800 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Draft Entries ({totalDrafts})
        </h3>
        {totalSelected > 0 && (
          <span className="text-sm text-yellow-700">
            {totalSelected} selected
          </span>
        )}
      </div>

      <DraftSection 
        title="Work Hours" 
        type="timesheets" 
        items={drafts.timesheets}
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      />
      
      <DraftSection 
        title="Leave Requests" 
        type="leaves" 
        items={drafts.leaves}
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" /></svg>}
      />
      
      <DraftSection 
        title="Training Hours" 
        type="training" 
        items={drafts.training}
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
      />

      {error && (
        <div className="text-red-600 text-sm mb-3">{error}</div>
      )}

      {successMessage && (
        <div className="text-green-600 text-sm mb-3">{successMessage}</div>
      )}

      {totalSelected > 0 && (
        <div className="flex space-x-3 pt-3 border-t border-yellow-300">
          <button
            onClick={handleBulkSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
          >
            {isSubmitting ? 'Submitting...' : `Submit Selected (${totalSelected})`}
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={isSubmitting}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 text-sm font-medium"
          >
            {isSubmitting ? 'Deleting...' : `Delete Selected (${totalSelected})`}
          </button>
        </div>
      )}
    </div>
  );
};

export default DraftManager;