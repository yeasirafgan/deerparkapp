// app/api/leave-hours/approve/route.js

import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { revalidatePath } from 'next/cache';
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

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Leave hours ID is required' },
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

    if (leaveHours.status === 'approved') {
      return NextResponse.json(
        { error: 'Leave hours entry is already approved' },
        { status: 400 }
      );
    }

    // Update the leave hours entry
    leaveHours.status = 'approved';
    leaveHours.approvedBy = user.email;
    leaveHours.approvedAt = new Date();
    leaveHours.isDraft = false;
    leaveHours.updatedAt = new Date();

    await leaveHours.save();

    // Revalidate the timesheet page and admin pages to reflect the changes
    revalidatePath('/timesheet');
    revalidatePath('/admin');
    revalidatePath(`/admin/${leaveHours.userName}`);

    return NextResponse.json({
      message: 'Leave hours entry approved successfully',
      leaveHours
    });
  } catch (error) {
    console.error('Error approving leave hours:', error);
    return NextResponse.json(
      { error: 'Failed to approve leave hours entry' },
      { status: 500 }
    );
  }
}