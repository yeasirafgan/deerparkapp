// // app/api/rota/create/route.js

import connectMongo from '@/db/connectMongo';
import Rota from '@/models/Rota';
import { parseExcelFile } from '@/utils/excelUtils'; // Adjust the path if needed

export async function POST(request) {
  try {
    await connectMongo();

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'File is required' }), {
        status: 400,
      });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const parsedData = await parseExcelFile(fileBuffer); // Use parseExcelFile here

    const rota = new Rota({
      name: formData.get('name'),
      weekStart: new Date(formData.get('weekStart')),
      parsedData: parsedData,
    });

    await rota.save();

    return new Response(
      JSON.stringify({ message: 'Rota uploaded successfully' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error uploading rota:', error);
    return new Response(JSON.stringify({ error: 'Failed to upload rota' }), {
      status: 500,
    });
  }
}
