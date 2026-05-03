/* ------------------------------------------------------------------ */
/*  Dashboard API client                                              */
/*  Communicates with nanobot-orchestrator /api/dashboard endpoints   */
/* ------------------------------------------------------------------ */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ---- Health ---- */
export interface HealthResponse {
  status: string;
  services: {
    nanobot: { status: string; uptime: string; uptime_seconds: number };
    opencode: { status: string };
    redis: { status: string };
  };
  timestamp: string;
}

export function getHealth() {
  return fetchJson<HealthResponse>('/api/dashboard/health');
}

/* ---- Stats ---- */
export interface StatsResponse {
  memory: {
    total: number;
    used: number;
    available: number;
    percent: number;
    total_gb: number;
    used_gb: number;
  };
  queue: { pending: number };
  processes: { pid: number; cpu_percent: number; memory_mb: number };
  config: {
    provider: string;
    model: string;
    repo: string;
    logLevel: string;
  };
  version: string;
}

export function getStats() {
  return fetchJson<StatsResponse>('/api/dashboard/stats');
}

/* ---- Logs ---- */
export interface LogEntry {
  id: number;
  timestamp: string;
  level: string;
  process: string;
  message: string;
  stackTrace?: string;
}

export interface LogsResponse {
  logs: LogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export function getLogs(params?: { level?: string; process?: string; limit?: number; offset?: number }) {
  const search = new URLSearchParams();
  if (params?.level) search.set('level', params.level);
  if (params?.process) search.set('process', params.process);
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.offset) search.set('offset', String(params.offset));
  return fetchJson<LogsResponse>(`/api/dashboard/logs?${search.toString()}`);
}

/* ---- Tasks ---- */
export interface TasksResponse {
  pending: number;
  recent: unknown[];
}

export function getTasks() {
  return fetchJson<TasksResponse>('/api/dashboard/tasks');
}

export function triggerTask(payload: { repo?: string; issue_number: number; issue_title?: string; issue_body?: string }) {
  return fetchJson<{ status: string; message: string }>('/api/dashboard/tasks/trigger', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
