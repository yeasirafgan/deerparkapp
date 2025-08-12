// app/api/leave-hours/reject/route.js

import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import connectMongo from '../../../../db/connectMongo';
import LeaveHours from '../../../../models/LeaveHours';

export async function POST(request) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();

    const { id, reason } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Leave hours ID is required' },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const leaveHours = await LeaveHours.findById(id);

    if (!leaveHours) {
      return NextResponse.json(
        { error: 'Leave hours entry not found' },
        { status: 404 }
      );
    }

    if (leaveHours.status === 'rejected') {
      return NextResponse.json(
        { error: 'Leave hours entry is already rejected' },
        { status: 400 }
      );
    }

    // Update the leave hours entry
    leaveHours.status = 'rejected';
    leaveHours.rejectedBy = user.email;
    leaveHours.rejectedAt = new Date();
    leaveHours.rejectionReason = reason.trim();
    leaveHours.isDraft = false;
    leaveHours.updatedAt = new Date();

    await leaveHours.save();

    // Revalidate the timesheet page and admin pages to reflect the changes
    revalidatePath('/timesheet');
    revalidatePath('/admin');
    revalidatePath(`/admin/${leaveHours.userName}`);

    return NextResponse.json({
      message: 'Leave hours entry rejected successfully',
      leaveHours
    });
  } catch (error) {
    console.error('Error rejecting leave hours:', error);
    return NextResponse.json(
      { error: 'Failed to reject leave hours entry' },
      { status: 500 }
    );
  }
}