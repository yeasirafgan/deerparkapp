// mainfolder/app/admin/edit-timesheet/[id]/page.js

import EditTimesheetForm from '@/components/EditTimesheetForm';
import connectMongo from '@/db/connectMongo';
import Timesheet from '@/models/Timesheet';
export const metadata = {
  title: 'Edit staffs worktime',
  description: 'Simple timesheet app for Deerpark staffs',
};

export default async function EditTimesheetPage({ params }) {
  // Fetch the data on the server
  await connectMongo();
  const timesheet = await Timesheet.findById(params.id).lean();

  if (!timesheet) {
    return <div>Timesheet not found</div>;
  }

  // Convert the ObjectId to a string
  timesheet._id = timesheet._id.toString();

  // Pass the data as a prop to the Client Component
  return (
    <div>
      <EditTimesheetForm timesheet={timesheet} />
    </div>
  );
}
