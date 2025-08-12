// app/api/training/delete/route.js

import { NextResponse } from 'next/server';
import connectMongo from '@/db/connectMongo';
import Training from '@/models/Training';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

export async function DELETE(request) {
  try {
    // Check authentication
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await connectMongo();
    
    // Find the training record
    const training = await Training.findById(id);
    
    if (!training) {
      return NextResponse.json({ error: 'Training record not found' }, { status: 404 });
    }

    // Prevent deletion of approved training records
    if (training.status === 'approved') {
      return NextResponse.json(
        { error: 'Cannot delete approved training records. Approved records are locked for payment purposes.' },
        { status: 403 }
      );
    }

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