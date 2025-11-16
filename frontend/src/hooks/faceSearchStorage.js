const STORAGE_KEY = 'face-search-jobs';
const STORAGE_VERSION = 1;

const readJobs = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed?.version !== STORAGE_VERSION || typeof parsed?.jobs !== 'object') {
      return {};
    }
    return parsed.jobs;
  } catch {
    return {};
  }
};

const writeJobs = (jobs) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, jobs })
    );
  } catch {
    // Fail silently – storage quota/full
  }
};

export const getStageJob = (stageKey) => {
  const jobs = readJobs();
  return jobs[stageKey] ?? null;
};

export const setStageJob = (stageKey, jobState) => {
  const jobs = readJobs();
  jobs[stageKey] = jobState;
  writeJobs(jobs);
  return jobState;
};

export const updateStageJob = (stageKey, patch) => {
  const jobs = readJobs();
  const next = {
    ...jobs[stageKey],
    ...patch,
  };
  jobs[stageKey] = next;
  writeJobs(jobs);
  return next;
};

export const removeStageJob = (stageKey) => {
  const jobs = readJobs();
  if (jobs[stageKey]) {
    delete jobs[stageKey];
    writeJobs(jobs);
  }
};

export const clearAllStageJobs = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
};
