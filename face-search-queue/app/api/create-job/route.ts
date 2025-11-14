import { NextRequest, NextResponse } from 'next/server';
import { createJob, checkRateLimit, checkExistingJob } from '@/lib/queue';
import type { FaceSearchJobData } from '@/lib/queue';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, uid, stage } = body;

    // Validation
    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Image data is required and must be a base64 string' },
        { status: 400 }
      );
    }

    if (!uid || typeof uid !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'User ID (email) is required' },
        { status: 400 }
      );
    }

    if (!stage || typeof stage !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Stage is required' },
        { status: 400 }
      );
    }

    // Validate base64 image format
    if (!image.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Image must be a valid base64 data URL' },
        { status: 400 }
      );
    }

    // Check for existing active job
    const existingJob = await checkExistingJob(uid);
    if (existingJob.hasJob) {
      return NextResponse.json(
        {
          error: 'Already in queue',
          message: 'You already have an active job in the queue',
          existingJobId: existingJob.jobId,
          stage: existingJob.stage,
        },
        { status: 409 }
      );
    }

    // Check rate limit
    const rateCheck = await checkRateLimit(uid);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'You can only create a job once every 5 minutes',
          retryAfter: rateCheck.retryAfter,
        },
        { status: 429 }
      );
    }

    // Create job
    const timestamp = Date.now();
    const jobData: FaceSearchJobData = {
      image,
      uid,
      stage,
      timestamp,
    };

    const job = await createJob(jobData);

    return NextResponse.json(
      {
        jobId: job.id,
        timestamp,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create job' },
      { status: 500 }
    );
  }
}
