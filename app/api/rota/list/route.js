import connectMongo from '@/db/connectMongo';
import Rota from '@/models/Rota';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request) {
  try {
    await connectMongo();
    
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit')) || 50));
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    
    // Count total documents
    const totalCount = await Rota.countDocuments();
    
    // Fetch rotas with pagination and sorting
    const rotas = await Rota.find()
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // Use lean() for better performance
    
    return NextResponse.json({
      rotas,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }, {
      headers: {
        'X-Total-Count': totalCount.toString(),
        'X-Page': page.toString(),
        'X-Limit': limit.toString()
      }
    });
  } catch (error) {
    console.error('Error fetching rotas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rotas', message: error.message },
      { status: 500 }
    );
  }
}
