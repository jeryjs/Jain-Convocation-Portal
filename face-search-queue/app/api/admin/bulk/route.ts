import { NextResponse } from 'next/server';
import { faceSearchQueue } from '@/lib/queue';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    
    if (action === 'retry-failed') {
      const failedJobs = await faceSearchQueue.getFailed();
      let retried = 0;
      
      for (const job of failedJobs) {
        await job.retry();
        retried++;
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `Retried ${retried} failed jobs` 
      });
    }
    
    if (action === 'delete-failed') {
      await faceSearchQueue.clean(0, 1000, 'failed');
      return NextResponse.json({ 
        success: true, 
        message: 'Deleted all failed jobs' 
      });
    }
    
    if (action === 'delete-completed') {
      await faceSearchQueue.clean(0, 1000, 'completed');
      return NextResponse.json({ 
        success: true, 
        message: 'Deleted all completed jobs' 
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json({ error: 'Failed to perform bulk action' }, { status: 500 });
  }
}
