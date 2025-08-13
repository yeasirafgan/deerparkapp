//components/LeaveHoursTable.js

import connectMongo from '@/db/connectMongo';
import LeaveHours from '@/models/LeaveHours';
import ApprovalActions from './ApprovalActions';
import StatusBadge from './StatusBadge';

const LeaveHoursTable = async ({ searchParams }) => {
  await connectMongo();
  
  const { startDate, endDate } = searchParams || {};
  
  // Build query filter
  const queryFilter = {};
  if (startDate) {
    queryFilter.date = { $gte: new Date(startDate) };
  }
  if (endDate) {
    queryFilter.date = { ...queryFilter.date, $lte: new Date(endDate) };
  }
  
  // Calculate 24 hours ago for auto-hide functionality
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  // Fetch leave hours records, excluding drafts, soft-deleted records, and approved records older than 24 hours
  const leaveHoursRecords = await LeaveHours.find({
    ...queryFilter,
    isDraft: { $ne: true },
    deleted: { $ne: true },
    $or: [
      { status: { $ne: 'approved' } }, // Show all non-approved records
      { 
        status: 'approved',
        updatedAt: { $gte: twentyFourHoursAgo } // Show approved records only if updated within 24 hours
      }
    ]
  }).sort({ date: -1 }).lean();
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };
  
  const formatHours = (hours) => {
    const hoursNum = Math.floor(hours);
    const minutes = Math.round((hours - hoursNum) * 60);
    
    if (hoursNum === 0) {
      return `${minutes} min`;
    } else if (minutes === 0) {
      return `${hoursNum} h`;
    } else {
      return `${hoursNum} h ${minutes} min`;
    }
  };
  
  const getLeaveTypeColor = (type) => {
    const colors = {
      annual: 'bg-blue-100 text-blue-800',
      sick: 'bg-red-100 text-red-800',
      maternity: 'bg-pink-100 text-pink-800',
      paternity: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };
  
  if (leaveHoursRecords.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No leave hours found</h3>
        <p className="mt-1 text-sm text-gray-500">
          No leave hours entries match your current filters.
        </p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">
              Employee
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">
              Leave Type
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">
              Date
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">
              Hours
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">
              Reason
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">
              Status
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">
              Submitted
            </th>
            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold text-gray-900">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {leaveHoursRecords.map((entry) => (
            <tr key={entry._id} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                {entry.userName}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  getLeaveTypeColor(entry.leaveType)
                }`}>
                  {entry.leaveType}
                </span>
              </td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                {formatDate(entry.date)}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900">
                {formatHours(entry.hours)}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-500">
                {entry.reason || 'N/A'}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <StatusBadge status={entry.status} />
              </td>
              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-500">
                {formatDate(entry.createdAt)}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <ApprovalActions 
                  id={entry._id.toString()}
                  status={entry.status}
                  type="leave-hours"
                  approveEndpoint="/api/leave-hours/approve"
                  rejectEndpoint="/api/leave-hours/reject"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeaveHoursTable;