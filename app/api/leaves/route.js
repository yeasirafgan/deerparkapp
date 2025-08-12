// app/api/leaves/route.js

import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { revalidatePath } from 'next/cache';
import connectMongo from '../../../db/connectMongo';
import Leave from '../../../models/Leave';

// GET - Fetch leaves for the authenticated user
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

    // Build query
    let query = { userId: user.id };
    
    if (!includeDrafts) {
      query.isDraft = false;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (startDate && endDate) {
      query.startDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const leaves = await Leave.find(query).sort({ createdAt: -1 });
    
    return NextResponse.json({ leaves });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaves' },
      { status: 500 }
    );
  }
}

// POST - Create a new leave request
export async function POST(request) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();

    const body = await request.json();
    const {
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      isDraft = false
    } = body;

    // Validate required fields
    if (!leaveType || !startDate || !endDate || !totalDays) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new leave request
    const leave = new Leave({
      userId: user.id,
      username: user.given_name + ' ' + user.family_name,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalDays,
      reason: reason || '',
      isDraft
    });

    await leave.save();
    
    // Revalidate relevant pages
    revalidatePath('/timesheet');
    revalidatePath('/admin');
    revalidatePath(`/admin/${user.given_name + ' ' + user.family_name}`);
    
    return NextResponse.json({ leave }, { status: 201 });
  } catch (error) {
    console.error('Error creating leave:', error);
    return NextResponse.json(
      { error: 'Failed to create leave request' },
      { status: 500 }
    );
  }
}

// PUT - Update a leave request
export async function PUT(request) {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Leave ID is required' },
        { status: 400 }
      );
    }

    // Find the leave and ensure it belongs to the user
    const leave = await Leave.findOne({ _id: id, userId: user.id });
    
    if (!leave) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // Only allow updates if it's a draft or pending
    if (leave.status !== 'pending' && !leave.isDraft) {
      return NextResponse.json(
        { error: 'Cannot update approved or rejected leave requests' },
        { status: 403 }
      );
    }

    // Update the leave
    Object.assign(leave, updateData);
    await leave.save();
    
    return NextResponse.json({ leave });
  } catch (error) {
    console.error('Error updating leave:', error);
    return NextResponse.json(
      { error: 'Failed to update leave request' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a leave request
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
        { error: 'Leave ID is required' },
        { status: 400 }
      );
    }

    // Find the leave and ensure it belongs to the user
    const leave = await Leave.findOne({ _id: id, userId: user.id });
    
    if (!leave) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // Allow deletion of any leave request that belongs to the user

    await Leave.findByIdAndDelete(id);
    
    return NextResponse.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    console.error('Error deleting leave:', error);
    return NextResponse.json(
      { error: 'Failed to delete leave request' },
      { status: 500 }
    );
  }
}