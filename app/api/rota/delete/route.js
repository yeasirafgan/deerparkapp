// app/api/rota/delete/route.js

import { NextResponse } from 'next/server';
import connectMongo from '@/db/connectMongo';
import Rota from '@/models/Rota';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

export async function DELETE(request) {
  try {
    // Check authentication
    const { getUser, getPermission } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions for rota deletion
    const adminPermission = await getPermission('delete:timesheet');
    if (!adminPermission?.isGranted) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await connectMongo();
    const deletedRota = await Rota.findByIdAndDelete(id);

    if (!deletedRota) {
      return NextResponse.json({ error: 'Rota not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Rota deleted successfully' });
  } catch (error) {
    console.error('Error deleting rota:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
