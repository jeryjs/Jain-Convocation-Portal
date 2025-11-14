export interface JobStatus {
  position?: number;
  total_size?: number;
  start_time: number;
  stage: string;
}

export interface JobResult {
  result: Array<{ id: string; score: number }>;
  start_time: number;
  finish_time: number;
  stage: string;
}

export interface JobError {
  error: string;
  start_time: number;
  finish_time: number;
  stage: string;
}

export type SSEEvent = JobStatus | JobResult | JobError;

export function isJobResult(event: SSEEvent): event is JobResult {
  return 'result' in event;
}

export function isJobError(event: SSEEvent): event is JobError {
  return 'error' in event && !('result' in event);
}

export function isJobStatus(event: SSEEvent): event is JobStatus {
  return 'position' in event;
}
