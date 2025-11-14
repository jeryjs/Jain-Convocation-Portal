import { NextRequest, NextResponse } from 'next/server';
import { faceSearchQueue } from '@/lib/queue';

// Get queue stats and job lists
export async function GET() {
  try {
    const [
      waitingJobs,
      activeJobs,
      completedJobs,
      failedJobs,
      delayedJobs,
      waitingCount,
      activeCount,
      completedCount,
      failedCount,
      delayedCount,
    ] = await Promise.all([
      faceSearchQueue.getWaiting(0, 100),
      faceSearchQueue.getActive(0, 100),
      faceSearchQueue.getCompleted(0, 100),
      faceSearchQueue.getFailed(0, 100),
      faceSearchQueue.getDelayed(0, 100),
      faceSearchQueue.getWaitingCount(),
      faceSearchQueue.getActiveCount(),
      faceSearchQueue.getCompletedCount(),
      faceSearchQueue.getFailedCount(),
      faceSearchQueue.getDelayedCount(),
    ]);

    const formatJob = (job: any) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
    });

    return NextResponse.json({
      stats: {
        waiting: waitingCount,
        active: activeCount,
        completed: completedCount,
        failed: failedCount,
        delayed: delayedCount,
      },
      jobs: {
        waiting: waitingJobs.map(formatJob),
        active: activeJobs.map(formatJob),
        completed: completedJobs.map(formatJob),
        failed: failedJobs.map(formatJob),
        delayed: delayedJobs.map(formatJob),
      },
    });
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    return NextResponse.json({ error: 'Failed to fetch queue stats' }, { status: 500 });
  }
}

// Delete a specific job
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const job = await faceSearchQueue.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    await job.remove();
    return NextResponse.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}

// Reorder job (change priority)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, action, priority } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const job = await faceSearchQueue.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (action === 'retry') {
      await job.retry();
      return NextResponse.json({ success: true, message: 'Job retried' });
    }

    if (action === 'promote') {
      await job.promote();
      return NextResponse.json({ success: true, message: 'Job promoted' });
    }

    if (action === 'setPriority' && priority !== undefined) {
      await job.changePriority({ priority });
      return NextResponse.json({ success: true, message: 'Priority updated' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}
