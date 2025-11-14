# Face Filter Queue Implementation Details

## Overview
Implement a face-based image filtering system with a queue mechanism that allows users to filter gallery images based on their face. The system should use Server-Sent Events (SSE) for real-time queue position updates and support multiple stages (gallery stages).

---

## Feature Requirements

### 1. Job Creation Flow

**User Actions:**
1. User clicks on the face filter option in the gallery page
2. Face is captured using the webcam
3. User clicks submit button

**Backend Requirements:**
- **Endpoint:** `POST https://face-filter-queue.endpoint/create-job`
- **Payload:** `{ image: string (base64), uid: string (email), stage: string }`
- **Response:** `{ jobId: string, timestamp: number }`
- **Restrictions:**
  - Only one job creation per user every 5 minutes (upon successful job creation)
  - User cannot create a new job if they already have a position in ANY queue (across all stages)
  - Return appropriate error messages for rate limiting and duplicate queue violations

<details>
<summary>API Sample - Create Job</summary>

**Request:**
```http
POST https://face-filter-queue.endpoint/create-job
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA...",
  "uid": "user@example.com",
  "stage": "stage-1"
}
```

**Success Response (201):**
```json
{
  "jobId": "job_abc123xyz789",
  "timestamp": 1699876543210
}
```

**Error Response - Rate Limited (429):**
```json
{
  "error": "Rate limit exceeded",
  "message": "You can only create a job once every 5 minutes",
  "retryAfter": 120
}
```

**Error Response - Already in Queue (409):**
```json
{
  "error": "Already in queue",
  "message": "You already have an active job in the queue",
  "existingJobId": "job_xyz456abc123",
  "stage": "stage-2"
}
```

</details>

**Frontend Storage:**
- Save to localStorage with structure:
```js
{
  "stage-1": {
    jobId: "job_abc123xyz789",
    timestamp: 1699876543210
  },
  "stage-2": {
    jobId: "job_xyz456abc123",
    timestamp: 1699876543999
  }
}
```

---

### 2. Job Status Stream (SSE)

**Purpose:** Provide real-time updates on job processing status and final results

**Endpoint:** `GET https://face-filter-queue.endpoint/get-job?id={jobId}`

**Stream Events:**

The backend should send one of three event types:

1. **Position Update (while processing):**
   ```json
   {
     "position": 3,
     "total_size": 10,
     "start_time": 1699876543210,
     "stage": "stage-1"
   }
   ```

2. **Success Result (final event):**
   ```json
   {
     "result": [
       { "id": "img_001", "score": 0.95 },
       { "id": "img_042", "score": 0.87 },
       { "id": "img_103", "score": 0.73 }
     ],
     "start_time": 1699876543210,
     "finish_time": 1699876598450,
     "stage": "stage-1"
   }
   ```

3. **Error (final event):**
   ```json
   {
     "error": "No face detected in the provided image",
     "start_time": 1699876543210,
     "finish_time": 1699876555120,
     "stage": "stage-1"
   }
   ```

**Backend Behavior:**
- If job is completed (has result or error), immediately send the final event and close the connection
- If job is in queue or processing, send position updates followed by the final result/error
- Automatically close the SSE connection after sending `result` or `error` event

<details>
<summary>API Sample - Get Job Status</summary>

**Request:**
```http
GET https://face-filter-queue.endpoint/get-job?id=job_abc123xyz789
Accept: text/event-stream
```

**SSE Stream Response (In Progress):**
```
event: status
data: {"position":5,"total_size":12,"start_time":1699876543210,"stage":"stage-1"}

event: status
data: {"position":3,"total_size":12,"start_time":1699876543210,"stage":"stage-1"}

event: status
data: {"position":1,"total_size":12,"start_time":1699876543210,"stage":"stage-1"}

event: result
data: {"result":[{"id":"img_001","score":0.95},{"id":"img_042","score":0.87}],"start_time":1699876543210,"finish_time":1699876598450,"stage":"stage-1"}
```

**SSE Stream Response (Already Completed):**
```
event: result
data: {"result":[{"id":"img_001","score":0.95}],"start_time":1699876543210,"finish_time":1699876598450,"stage":"stage-1"}
```

**SSE Stream Response (Error):**
```
event: error
data: {"error":"No face detected in the provided image","start_time":1699876543210,"finish_time":1699876555120,"stage":"stage-1"}
```

</details>

---

### 3. Frontend Implementation

**Gallery Page Initialization:**
- On mount, check localStorage for job data matching the current stage
- If job exists, automatically connect to the SSE endpoint with the job ID
- Display appropriate UI based on the current job state

**SSE Hook Requirements:**
- Create a custom React hook that accepts `jobId` as parameter
- Hook should connect to `https://face-filter-queue.endpoint/get-job?id={jobId}`
- Parse SSE events and return current state
- Handle connection errors and retries gracefully
- Auto-cleanup on unmount

<details>
<summary>Hook Usage Example</summary>

```jsx
const { status, result, error, isComplete } = useFaceFilterJob(jobId);

// status = { position: 3, total_size: 10, start_time: 1699876543210, stage: "stage-1" }
// result = [{ id: "img_001", score: 0.95 }, ...]
// error = "No face detected"
// isComplete = true/false
```

</details>

**LocalStorage Update:**
- When final `result` or `error` is received, update the localStorage object for that stage
- Add `result` or `error` field to the stored job data
- Keep `jobId` and `timestamp` for reference

<details>
<summary>LocalStorage Structure After Completion</summary>

```js
{
  "stage-1": {
    jobId: "job_abc123xyz789",
    timestamp: 1699876543210,
    result: [
      { id: "img_001", score: 0.95 },
      { id: "img_042", score: 0.87 }
    ],
    finishTime: 1699876598450
  }
}
```

</details>

---

### 4. Image Grid Filtering

**When Filter is Active (result exists):**
- Filter the image grid to show only images with IDs present in the result array
- Display a score badge (percentage) on each filtered image
  - Convert score to percentage: `Math.round(score * 100) + '%'`
  - Badge should be visible and clearly indicate face match confidence

**When Filter is Inactive:**
- Display all images without filtering
- No score badges shown

<details>
<summary>Result Filtering Example</summary>

```jsx
const filteredImages = result 
  ? images.filter(img => result.some(r => r.id === img.id))
  : images;

const getScoreForImage = (imageId) => {
  const match = result?.find(r => r.id === imageId);
  return match ? Math.round(match.score * 100) : null;
};
```

</details>

---

### 5. Alert/Banner Display

**Location:** Just above the ImageGrid component

**Display Logic:**

1. **While in Queue (position update):**
   - Show alert with queue position and total size
   - Example: "Processing your face filter... Position 3 of 10 in queue"

2. **When Result is Ready (filter active):**
   - Show alert indicating filtered view is active
   - Provide option to disable filter and view all images
   - Example: "Viewing filtered images based on your face (X images found). [Disable Filter]"

3. **When Error Occurs:**
   - Show error message with option to retry
   - Example: "Failed to process face filter: No face detected. [Try Again]"

**User Actions:**
- "Disable Filter" button should clear the active filter state (but keep result in localStorage)
- "Try Again" should allow creating a new job (respecting rate limits)

---

### 6. Rate Limiting & Validation

**Create Job Restrictions:**
- ✅ User can only create one job every 5 minutes (after successful creation)
- ✅ User cannot create a job if they already have an active position in ANY queue
- ✅ Validate that image data is provided and is a valid base64 string
- ✅ Validate that uid (email) is provided
- ✅ Validate that stage is provided

**Backend Storage:**
- Track job creation timestamps per user
- Track active jobs per user across all stages
- Clean up completed jobs after a reasonable period (e.g., 24 hours)

---

### 7. Stage Isolation

**Important:** Each gallery stage is independent:
- User can have different job results for different stages
- Filter state is stage-specific
- LocalStorage structure uses stage as key to maintain isolation
- When switching between gallery pages (different stages), the correct job state should be loaded

---

## Technical Notes

- Use Server-Sent Events (SSE) for real-time updates to minimize request overhead
- SSE connections should be closed by the backend after sending final result/error
- Frontend should handle reconnection if SSE connection drops during queue processing
- All timestamps should be in Unix epoch milliseconds
- Score values are floats between 0 and 1 (0-100% confidence)
- Result array should be sorted by score (highest first)

---

## Success Criteria

- ✅ Users can submit face images and receive a job ID
- ✅ Users receive real-time queue position updates via SSE
- ✅ Image grid is filtered based on face matching results
- ✅ Score badges are displayed on filtered images
- ✅ Filter can be toggled on/off without losing result data
- ✅ Page reload preserves job state and resumes updates
- ✅ Completed jobs return results immediately on reconnection
- ✅ Rate limiting prevents spam and multiple concurrent jobs
- ✅ Each gallery stage maintains independent filter state
- ✅ Clear error messages for all failure scenarios
