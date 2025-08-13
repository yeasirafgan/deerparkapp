// app/api/leave-hours/route.js

import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { revalidatePath } from 'next/cache';
import connectMongo from '../../../db/connectMongo';
import LeaveHours from '../../../models/LeaveHours';

// GET - Fetch leave hours for the authenticated user
export async function GET(request) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();

    const { searchParams } = new URL(request.url);
    const includeDrafts = searchParams.get('includeDrafts') === 'true';
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const leaveType = searchParams.get('leaveType');
    const username = searchParams.get('username');

    // Build query
    let query = {};
    
    // If username is provided, filter by userName field (for admin queries)
    // Otherwise, filter by userId (for user's own data)
    if (username) {
      query.userName = username;
    } else {
      query.userId = user.id;
    }
    
    if (!includeDrafts) {
      query.isDraft = false;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (leaveType) {
      query.leaveType = leaveType;
    }
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // For user timesheet display, hide approved records older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (includeDrafts) {
      query.$or = [
        { status: { $ne: 'approved' } }, // Show all non-approved records
        { 
          status: 'approved',
          updatedAt: { $gte: twentyFourHoursAgo } // Show approved records only if updated within 24 hours
        }
      ];
    }

    const leaveHours = await LeaveHours.find(query).sort({ createdAt: -1 });
    
    return NextResponse.json({ leaveHours });
  } catch (error) {
    console.error('Error fetching leave hours:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave hours' },
      { status: 500 }
    );
  }
}

// POST - Create new leave hours entry
export async function POST(request) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();

    const body = await request.json();
    const { leaveType, date, hours, reason, isDraft = false } = body;

    // Validate required fields
    if (!leaveType || !date || !hours) {
      return NextResponse.json(
        { error: 'Leave type, date, and hours are required' },
        { status: 400 }
      );
    }

    // Validate hours
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      return NextResponse.json(
        { error: 'Hours must be between 0 and 24' },
        { status: 400 }
      );
    }

    // Create new leave hours entry
    const leaveHours = new LeaveHours({
      userId: user.id,
      userEmail: user.email,
      userName: user.given_name && user.family_name 
        ? `${user.given_name} ${user.family_name}` 
        : user.email,
      leaveType,
      date: new Date(date),
      hours: hoursNum,
      reason: reason || '',
      isDraft,
      status: isDraft ? 'draft' : 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await leaveHours.save();

    // Revalidate the timesheet page
    revalidatePath('/timesheet');

    return NextResponse.json({ 
      message: isDraft ? 'Leave hours saved as draft' : 'Leave hours submitted successfully',
      leaveHours 
    });
  } catch (error) {
    console.error('Error creating leave hours:', error);
    return NextResponse.json(
      { error: 'Failed to create leave hours entry' },
      { status: 500 }
    );
  }
}

// PUT - Update existing leave hours entry
export async function PUT(request) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();

    const body = await request.json();
    const { id, leaveType, date, hours, reason, isDraft } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Leave hours ID is required' },
        { status: 400 }
      );
    }

    // Find the leave hours entry and ensure it belongs to the user
    const leaveHours = await LeaveHours.findOne({ _id: id, userId: user.id });
    
    if (!leaveHours) {
      return NextResponse.json(
        { error: 'Leave hours entry not found' },
        { status: 404 }
      );
    }

    // Only allow editing if it's a draft or pending
    if (leaveHours.status !== 'pending' && !leaveHours.isDraft) {
      return NextResponse.json(
        { error: 'Cannot edit approved or rejected leave hours' },
        { status: 403 }
      );
    }

    // Validate hours if provided
    if (hours !== undefined) {
      const hoursNum = parseFloat(hours);
      if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
        return NextResponse.json(
          { error: 'Hours must be between 0 and 24' },
          { status: 400 }
        );
      }
    }

    // Update the leave hours entry
    const updateData = {
      updatedAt: new Date(),
    };

    if (leaveType !== undefined) updateData.leaveType = leaveType;
    if (date !== undefined) updateData.date = new Date(date);
    if (hours !== undefined) updateData.hours = parseFloat(hours);
    if (reason !== undefined) updateData.reason = reason;
    if (isDraft !== undefined) {
      updateData.isDraft = isDraft;
      updateData.status = isDraft ? 'draft' : 'pending';
    }

    const updatedLeaveHours = await LeaveHours.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    // Revalidate the timesheet page
    revalidatePath('/timesheet');

    return NextResponse.json({ 
      message: 'Leave hours updated successfully',
      leaveHours: updatedLeaveHours 
    });
  } catch (error) {
    console.error('Error updating leave hours:', error);
    return NextResponse.json(
      { error: 'Failed to update leave hours entry' },
      { status: 500 }
    );
  }
}

// DELETE - Delete leave hours entry
export async function DELETE(request) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Leave hours ID is required' },
        { status: 400 }
      );
    }

    // Find the leave hours entry and ensure it belongs to the user
    const leaveHours = await LeaveHours.findOne({ _id: id, userId: user.id });
    
    if (!leaveHours) {
      return NextResponse.json(
        { error: 'Leave hours entry not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of approved records to preserve payroll data
    if (leaveHours.status === 'approved') {
      return NextResponse.json(
        { error: 'Cannot delete approved leave hours. Approved records are preserved for payroll calculations.' },
        { status: 403 }
      );
    }

    // Only allow deletion of draft/pending records
    await LeaveHours.findByIdAndDelete(id);
    
    return NextResponse.json({ message: 'Leave hours entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting leave hours:', error);
    return NextResponse.json(
      { error: 'Failed to delete leave hours entry' },
      { status: 500 }
    );
  }
}