import { NextResponse } from 'next/server';
import { faceSearchQueue } from '@/lib/queue';

export async function POST() {
  try {
    await faceSearchQueue.clean(0, 1000, 'completed');
    await faceSearchQueue.clean(0, 1000, 'failed');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Queue cleaned (removed completed and failed jobs)' 
    });
  } catch (error) {
    console.error('Error cleaning queue:', error);
    return NextResponse.json({ error: 'Failed to clean queue' }, { status: 500 });
  }
}
