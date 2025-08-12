// app/api/admin/training/delete/route.js

import { NextResponse } from 'next/server';
import connectMongo from '@/db/connectMongo';
import Training from '@/models/Training';
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
        { error: 'Training ID is required' },
        { status: 400 }
      );
    }

    // Find the training record
    const training = await Training.findById(id);
    
    if (!training) {
      return NextResponse.json(
        { error: 'Training record not found' },
        { status: 404 }
      );
    }

    let deletedTraining;
    
    if (training.status === 'approved') {
      // For approved records, use soft deletion to preserve payment calculations
      deletedTraining = await Training.findByIdAndUpdate(
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
      deletedTraining = await Training.findByIdAndDelete(id);
    }
    
    // Revalidate admin pages to force refresh
    revalidatePath('/admin');
    revalidatePath('/admin', 'page');
    revalidatePath('/admin', 'layout');
    revalidatePath('/admin/training-hours');
    
    return NextResponse.json({ 
      message: training.status === 'approved' 
        ? 'Approved training record archived successfully (preserved for payment calculations)'
        : 'Training record deleted successfully by admin',
      deletedTraining
    });
  } catch (error) {
    console.error('Error deleting training record (admin):', error);
    return NextResponse.json(
      { error: 'Failed to delete training record' },
      { status: 500 }
    );
  }
}