import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

// Get excluded images list
export async function GET() {
  try {
    const excluded = await redis.smembers('excluded_images');
    return NextResponse.json({ excluded: Array.from(excluded) });
  } catch (error) {
    console.error('Error getting excluded images:', error);
    return NextResponse.json(
      { error: 'Failed to get excluded images' },
      { status: 500 }
    );
  }
}

// Add/remove excluded images
export async function POST(request: NextRequest) {
  try {
    const { action, imageIds } = await request.json();

    if (!action || !Array.isArray(imageIds)) {
      return NextResponse.json(
        { error: 'Action and imageIds array required' },
        { status: 400 }
      );
    }

    if (action === 'add') {
      if (imageIds.length > 0) {
        await redis.sadd('excluded_images', ...imageIds);
      }
    } else if (action === 'remove') {
      if (imageIds.length > 0) {
        await redis.srem('excluded_images', ...imageIds);
      }
    } else if (action === 'clear') {
      await redis.del('excluded_images');
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use add, remove, or clear' },
        { status: 400 }
      );
    }

    const excluded = await redis.smembers('excluded_images');
    return NextResponse.json({ 
      success: true, 
      excluded: Array.from(excluded),
      count: excluded.length
    });
  } catch (error) {
    console.error('Error updating excluded images:', error);
    return NextResponse.json(
      { error: 'Failed to update excluded images' },
      { status: 500 }
    );
  }
}
