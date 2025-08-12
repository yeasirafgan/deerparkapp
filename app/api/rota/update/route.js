// app/api/rota/update/route.js

import { NextResponse } from 'next/server';
import connectMongo from '@/db/connectMongo';
import Rota from '@/models/Rota';
import mongoose from 'mongoose';

export async function PATCH(request) {
  const { id, updates } = await request.json();

  if (!id || !updates) {
    return NextResponse.json(
      { error: 'ID and updates are required' },
      { status: 400 }
    );
  }

  await connectMongo();
  const rota = await Rota.findById(id);

  if (!rota) {
    return NextResponse.json({ error: 'Rota not found' }, { status: 404 });
  }

  if (updates.parsedData) {
    updates.parsedData.forEach((update, index) => {
      if (rota.parsedData[index]) {
        Object.assign(rota.parsedData[index], update);
      } else {
        rota.parsedData.push(update);
      }
    });
  }

  Object.assign(rota, updates);

  const updatedRota = await rota.save();

  return NextResponse.json(updatedRota);
}
