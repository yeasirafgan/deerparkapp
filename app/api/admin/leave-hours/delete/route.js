// app/api/admin/leave-hours/delete/route.js

import { NextResponse } from 'next/server';
import connectMongo from '@/db/connectMongo';
import LeaveHours from '@/models/LeaveHours';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { revalidatePath } from 'next/cache';

export async function DELETE(request) {
  try {
    // Check authentication and admin permissions
    const { getUser, getPermission } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    const adminPermission = await getPermission('delete:timesheet');
    if (!adminPermission?.isGranted) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    await connectMongo();

    const body = await request.json();
    const { id, reason } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Leave hours ID is required' },
        { status: 400 }
      );
    }

    // Find the leave hours record
    const leaveHours = await LeaveHours.findById(id);
    
    if (!leaveHours) {
      return NextResponse.json(
        { error: 'Leave hours record not found' },
        { status: 404 }
      );
    }

    let deletedLeaveHours;
    
    if (leaveHours.status === 'approved') {
      // For approved records, use soft deletion to preserve payment calculations
      deletedLeaveHours = await LeaveHours.findByIdAndUpdate(
        id,
        {
          deleted: true,
          deletedAt: new Date(),
          deletedBy: `${user.given_name || ''} ${user.family_name || ''}`.trim() || user.email,
          deletionReason: reason || 'Administrative cleanup'
        },
        { new: true }
      );
    } else {
      // For non-approved records, use hard deletion
      deletedLeaveHours = await LeaveHours.findByIdAndDelete(id);
    }
    
    // Revalidate admin pages to force refresh
    revalidatePath('/admin');
    revalidatePath('/admin', 'page');
    revalidatePath('/admin', 'layout');
    revalidatePath('/admin/leave-hours');
    
    return NextResponse.json({ 
      message: leaveHours.status === 'approved' 
        ? 'Approved leave hours record archived successfully (preserved for payment calculations)'
        : 'Leave hours record deleted successfully by admin',
      deletedLeaveHours
    });
  } catch (error) {
    console.error('Error deleting leave hours record (admin):', error);
    return NextResponse.json(
      { error: 'Failed to delete leave hours record' },
      { status: 500 }
    );
  }
}