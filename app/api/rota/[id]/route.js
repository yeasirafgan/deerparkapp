import connectMongo from '@/db/connectMongo';
import Rota from '@/models/Rota';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  const { id } = params;

  try {
    await connectMongo();
    const rota = await Rota.findById(id);

    if (!rota) {
      return NextResponse.json({ message: 'Rota not found.' }, { status: 404 });
    }

    return NextResponse.json(rota);
  } catch (error) {
    console.error('Error message:', error.message);
    return NextResponse.json(
      { message: 'Error fetching rota.' },
      { status: 500 }
    );
  }
}
