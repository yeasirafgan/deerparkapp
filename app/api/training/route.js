// app/api/training/route.js

import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { revalidatePath } from 'next/cache';
import connectMongo from '../../../db/connectMongo';
import Training from '../../../models/Training';

// GET - Fetch training records for the authenticated user
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
    const trainingType = searchParams.get('trainingType');

    // Build query
    let query = { userId: user.id };
    
    if (!includeDrafts) {
      query.isDraft = false;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (trainingType) {
      query.trainingType = trainingType;
    }
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // For user timesheet display, hide approved records older than 30 seconds (TESTING)
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    if (includeDrafts) {
      query.$or = [
        { status: { $ne: 'approved' } }, // Show all non-approved records
        { 
          status: 'approved',
          updatedAt: { $gte: thirtySecondsAgo } // Show approved records only if updated within 30 seconds (TESTING)
        }
      ];
    }

    const training = await Training.find(query).sort({ createdAt: -1 });
    
    return NextResponse.json({ training });
  } catch (error) {
    console.error('Error fetching training:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training records' },
      { status: 500 }
    );
  }
}

// POST - Create a new training record
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
      trainingType,
      title,
      description,
      date,
      duration,
      provider,
      location,
      isDraft = false
    } = body;

    // Validate required fields
    if (!trainingType || !title || !date || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new training record
    const training = new Training({
      userId: user.id,
      username: user.given_name + ' ' + user.family_name,
      trainingType,
      title,
      description: description || '',
      date: new Date(date),
      duration,
      provider: provider || '',
      location: location || '',
      isDraft
    });

    await training.save();
    
    // Revalidate relevant pages
    revalidatePath('/timesheet');
    revalidatePath('/admin');
    revalidatePath(`/admin/${user.given_name + ' ' + user.family_name}`);
    
    return NextResponse.json({ training }, { status: 201 });
  } catch (error) {
    console.error('Error creating training:', error);
    return NextResponse.json(
      { error: 'Failed to create training record' },
      { status: 500 }
    );
  }
}

// PUT - Update a training record
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
        { error: 'Training ID is required' },
        { status: 400 }
      );
    }

    // Find the training and ensure it belongs to the user
    const training = await Training.findOne({ _id: id, userId: user.id });
    
    if (!training) {
      return NextResponse.json(
        { error: 'Training record not found' },
        { status: 404 }
      );
    }

    // Only allow updates if it's a draft, pending, or approved (but not completed)
    if (training.status === 'completed' && !training.isDraft) {
      return NextResponse.json(
        { error: 'Cannot update completed training records' },
        { status: 403 }
      );
    }

    // Update the training
    Object.assign(training, updateData);
    await training.save();
    
    return NextResponse.json({ training });
  } catch (error) {
    console.error('Error updating training:', error);
    return NextResponse.json(
      { error: 'Failed to update training record' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a training record
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
        { error: 'Training ID is required' },
        { status: 400 }
      );
    }

    // Find the training and ensure it belongs to the user
    const training = await Training.findOne({ _id: id, userId: user.id });
    
    if (!training) {
      return NextResponse.json(
        { error: 'Training record not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of approved records to preserve payroll data
    if (training.status === 'approved') {
      return NextResponse.json(
        { error: 'Cannot delete approved training records. Approved records are preserved for payroll calculations.' },
        { status: 403 }
      );
    }

    // Only allow deletion of draft/pending records
    await Training.findByIdAndDelete(id);
    
    return NextResponse.json({ message: 'Training record deleted successfully' });
  } catch (error) {
    console.error('Error deleting training:', error);
    return NextResponse.json(
      { error: 'Failed to delete training record' },
      { status: 500 }
    );
  }
}