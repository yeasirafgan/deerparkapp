import connectMongo from '@/db/connectMongo';
import Leave from '@/models/Leave';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request) {
  try {
    const { getUser, isAuthenticated } = getKindeServerSession();
    const isLoggedIn = await isAuthenticated();
    const user = await getUser();

    if (!isLoggedIn) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // User is already authenticated via Kinde, no additional authorization needed

    const { id, reason } = await request.json();

    if (!id) {
      return NextResponse.json({ message: 'Leave request ID is required' }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ message: 'Rejection reason is required' }, { status: 400 });
    }

    await connectMongo();

    const leaveRequest = await Leave.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        rejectedBy: user.email,
        rejectedAt: new Date(),
        rejectionReason: reason.trim(),
      },
      { new: true }
    );

    if (!leaveRequest) {
      return NextResponse.json({ message: 'Leave request not found' }, { status: 404 });
    }

    // Revalidate relevant pages
    revalidatePath('/admin');
    revalidatePath(`/admin/${leaveRequest.username}`);
    revalidatePath('/timesheet');

    return NextResponse.json({
      message: 'Leave request rejected successfully',
      leaveRequest,
    });
  } catch (error) {
    console.error('Error rejecting leave request:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}