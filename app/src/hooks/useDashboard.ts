import { useEffect, useRef, useState, useCallback } from 'react';
import * as api from '@/services/api';

/* ------------------------------------------------------------------ */
/*  useHealth - Poll health status                                     */
/* ------------------------------------------------------------------ */
export function useHealth(pollInterval = 5000) {
  const [health, setHealth] = useState<api.HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, pollInterval);
    return () => clearInterval(id);
  }, [fetchHealth, pollInterval]);

  return { health, error, refetch: fetchHealth };
}

/* ------------------------------------------------------------------ */
/*  useStats - Poll system stats                                       */
/* ------------------------------------------------------------------ */
export function useStats(pollInterval = 5000) {
  const [stats, setStats] = useState<api.StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getStats();
      setStats(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, pollInterval);
    return () => clearInterval(id);
  }, [fetchStats, pollInterval]);

  return { stats, error, refetch: fetchStats };
}

/* ------------------------------------------------------------------ */
/*  useLogs - Poll and manage logs                                     */
/* ------------------------------------------------------------------ */
export function useLogs(pollInterval = 3000) {
  const [logs, setLogs] = useState<api.LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [processFilter, setProcessFilter] = useState<string>('ALL');
  const pausedRef = useRef(false);

  const fetchLogs = useCallback(async () => {
    if (pausedRef.current) return;
    try {
      const data = await api.getLogs({
        level: levelFilter === 'ALL' ? undefined : levelFilter,
        process: processFilter === 'ALL' ? undefined : processFilter,
        limit: 500,
      });
      setLogs(data.logs);
      setTotal(data.total);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, [levelFilter, processFilter]);

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, pollInterval);
    return () => clearInterval(id);
  }, [fetchLogs, pollInterval]);

  const pause = useCallback(() => { pausedRef.current = true; }, []);
  const resume = useCallback(() => { pausedRef.current = false; fetchLogs(); }, [fetchLogs]);

  return {
    logs,
    total,
    error,
    levelFilter,
    setLevelFilter,
    processFilter,
    setProcessFilter,
    pause,
    resume,
    refetch: fetchLogs,
  };
}

/* ------------------------------------------------------------------ */
/*  useTasks - Poll task queue                                         */
/* ------------------------------------------------------------------ */
export function useTasks(pollInterval = 5000) {
  const [tasks, setTasks] = useState<api.TasksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const id = setInterval(fetchTasks, pollInterval);
    return () => clearInterval(id);
  }, [fetchTasks, pollInterval]);

  const trigger = useCallback(async (payload: Parameters<typeof api.triggerTask>[0]) => {
    const result = await api.triggerTask(payload);
    await fetchTasks();
    return result;
  }, [fetchTasks]);

  return { tasks, error, refetch: fetchTasks, triggerTask: trigger };
}
