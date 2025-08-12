//components/LeaveRequestsTable.js

import connectMongo from '@/db/connectMongo';
import Leave from '@/models/Leave';
import ApprovalActions from './ApprovalActions';
import StatusBadge from './StatusBadge';

const LeaveRequestsTable = async ({ searchParams }) => {
  await connectMongo();
  
  const { startDate, endDate } = searchParams || {};
  
  // Build query filter
  const queryFilter = {};
  if (startDate) {
    queryFilter.startDate = { $gte: new Date(startDate) };
  }
  if (endDate) {
    queryFilter.endDate = { ...queryFilter.endDate, $lte: new Date(endDate) };
  }
  
  // Fetch leave requests, excluding drafts
  const leaveRequests = await Leave.find({
    ...queryFilter,
    isDraft: { $ne: true }
  }).sort({ createdAt: -1 }).lean();
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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
  
  if (leaveRequests.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No leave requests</h3>
        <p className="mt-1 text-sm text-gray-500">No leave requests found for the selected period.</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Employee
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Leave Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Start Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              End Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Days
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Reason
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {leaveRequests.map((leave) => (
            <tr key={leave._id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {leave.username}
              </td>
              <td className="px-4 py-3 text-sm">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  getLeaveTypeColor(leave.leaveType)
                }`}>
                  {leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {formatDate(leave.startDate)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {formatDate(leave.endDate)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {leave.totalDays}
              </td>
              <td className="px-4 py-3 text-sm">
                <StatusBadge status={leave.status} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                {leave.reason || '-'}
              </td>
              <td className="px-4 py-3 text-sm">
                <ApprovalActions 
                  id={leave._id.toString()}
                  status={leave.status}
                  type="leave"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Summary */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Total Requests:</span>
            <span className="ml-2 text-gray-900">{leaveRequests.length}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Pending:</span>
            <span className="ml-2 text-yellow-600">
              {leaveRequests.filter(l => l.status === 'pending').length}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Approved:</span>
            <span className="ml-2 text-green-600">
              {leaveRequests.filter(l => l.status === 'approved').length}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Rejected:</span>
            <span className="ml-2 text-red-600">
              {leaveRequests.filter(l => l.status === 'rejected').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestsTable;