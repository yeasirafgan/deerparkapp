//components/TrainingHoursTable.js

import connectMongo from '@/db/connectMongo';
import Training from '@/models/Training';
import ApprovalActions from './ApprovalActions';
import StatusBadge from './StatusBadge';

const TrainingHoursTable = async ({ searchParams }) => {
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
  
  // Calculate 30 seconds ago for auto-hide functionality (TESTING)
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
  
  // Fetch training records, excluding drafts, soft-deleted records, and approved records older than 24 hours
  const trainingRecords = await Training.find({
    ...queryFilter,
    isDraft: { $ne: true },
    deleted: { $ne: true },
    $or: [
      { status: { $ne: 'approved' } }, // Show all non-approved records
      { 
        status: 'approved',
        updatedAt: { $gte: thirtySecondsAgo } // Show approved records only if updated within 30 seconds (TESTING)
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
  
  const formatDuration = (duration) => {
    const hours = Math.floor(duration);
    const minutes = Math.round((duration - hours) * 60);
    
    if (hours === 0) {
      return `${minutes} min`;
    } else if (minutes === 0) {
      return `${hours} h`;
    } else {
      return `${hours} h ${minutes} min`;
    }
  };
  
  const getTrainingTypeColor = (type) => {
    const colors = {
      'mandatory': 'bg-red-100 text-red-800',
      'professional-development': 'bg-blue-100 text-blue-800',
      'health-safety': 'bg-yellow-100 text-yellow-800',
      'compliance': 'bg-purple-100 text-purple-800',
      'skills': 'bg-green-100 text-green-800',
      'other': 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };
  
  // Calculate totals
  const totalHours = trainingRecords.reduce((sum, record) => sum + (record.duration || 0), 0);
  const approvedHours = trainingRecords
    .filter(record => record.status === 'approved')
    .reduce((sum, record) => sum + (record.duration || 0), 0);
  
  if (trainingRecords.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No training records</h3>
        <p className="mt-1 text-sm text-gray-500">No training records found for the selected period.</p>
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
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Training Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Duration
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Provider
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {trainingRecords.map((training) => (
            <tr key={training._id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {training.username}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {formatDate(training.date)}
              </td>
              <td className="px-4 py-3 text-sm">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  getTrainingTypeColor(training.trainingType)
                }`}>
                  {training.trainingType?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Other'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
                <div className="truncate" title={training.title}>
                  {training.title || training.description}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                {formatDuration(training.duration)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {training.provider || '-'}
              </td>
              <td className="px-4 py-3 text-sm">
                <StatusBadge status={training.status} />
              </td>
              <td className="px-4 py-3 text-sm">
                <ApprovalActions 
                  id={training._id.toString()}
                  status={training.status}
                  type="training"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Summary */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Total Records:</span>
            <span className="ml-2 text-gray-900">{trainingRecords.length}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Total Hours:</span>
            <span className="ml-2 text-gray-900">{formatDuration(totalHours)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Approved Hours:</span>
            <span className="ml-2 text-green-600">{formatDuration(approvedHours)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Pending:</span>
            <span className="ml-2 text-yellow-600">
              {trainingRecords.filter(t => t.status === 'pending').length}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Rejected:</span>
            <span className="ml-2 text-red-600">
              {trainingRecords.filter(t => t.status === 'rejected').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingHoursTable;