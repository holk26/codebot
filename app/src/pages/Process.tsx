import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Globe,
  Play,
  Square,
  RefreshCw,
  ScrollText,
  AlertTriangle,
  Activity,
  Clock,
  Microchip,
  Database,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useHealth, useStats } from '@/hooks/useDashboard';
import '../styles/theme.css';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ProcessStatus = 'running' | 'stopped' | 'starting' | 'stopping' | 'error';

interface ProcessInfo {
  name: string;
  status: ProcessStatus;
  pid: number | null;
  cpu: number;
  memory: number; // MB
  uptime: string;
  port?: number;
  connections?: number;
  lastLogs: string[];
  history: { time: string; cpu: number; memory: number }[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusConfig: Record<
  ProcessStatus,
  { label: string; border: string; badgeBg: string; badgeText: string; dot: string }
> = {
  running: {
    label: 'Running',
    border: '#4ADE80',
    badgeBg: 'rgba(74,222,128,0.15)',
    badgeText: '#4ADE80',
    dot: '#4ADE80',
  },
  stopped: {
    label: 'Stopped',
    border: '#F87171',
    badgeBg: 'rgba(248,113,113,0.15)',
    badgeText: '#F87171',
    dot: '#F87171',
  },
  starting: {
    label: 'Starting...',
    border: '#FBBF24',
    badgeBg: 'rgba(251,191,36,0.15)',
    badgeText: '#FBBF24',
    dot: '#FBBF24',
  },
  stopping: {
    label: 'Stopping...',
    border: '#FBBF24',
    badgeBg: 'rgba(251,191,36,0.15)',
    badgeText: '#FBBF24',
    dot: '#FBBF24',
  },
  error: {
    label: 'Error',
    border: '#F87171',
    badgeBg: 'rgba(248,113,113,0.15)',
    badgeText: '#F87171',
    dot: '#F87171',
  },
};

function generateHistory(baseCpu: number, baseMem: number) {
  const data: { time: string; cpu: number; memory: number }[] = [];
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 2000);
    data.push({
      time: `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}:${t.getSeconds().toString().padStart(2, '0')}`,
      cpu: Math.max(0, Math.min(100, baseCpu + (Math.random() - 0.5) * 10)),
      memory: Math.max(0, Math.min(100, baseMem + (Math.random() - 0.5) * 5)),
    });
  }
  return data;
}

function MiniSparkline({ data, color }: { data: { v: number }[]; color: string }) {
  return (
    <svg width="80" height="30" className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={data.map((d, i) => `${(i / (data.length - 1)) * 80},${30 - d.v * 0.3}`).join(' ')}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Confirm Modal                                                      */
/* ------------------------------------------------------------------ */

function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className="rounded-xl p-6 max-w-sm w-full mx-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={20} style={{ color: 'var(--terminal-amber)' }} />
              <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h3>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {message}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--terminal-red)', color: '#fff' }}
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Process Card                                                       */
/* ------------------------------------------------------------------ */

function ProcessCard({
  process,
  icon,
  iconColor,
  onStart,
  onStop,
  onRestart,
  delay,
}: {
  process: ProcessInfo;
  icon: React.ReactNode;
  iconColor: string;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  delay: number;
}) {
  const cfg = statusConfig[process.status];
  const isRunning = process.status === 'running';
  const isStopped = process.status === 'stopped';
  const isTransitioning = process.status === 'starting' || process.status === 'stopping';
  const isError = process.status === 'error';

  const [cpuSparkline, setCpuSparkline] = useState<{ v: number }[]>([]);

  useEffect(() => {
    const arr = Array.from({ length: 20 }, () => ({ v: Math.random() * 30 + 10 }));
    setCpuSparkline(arr);
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const iv = setInterval(() => {
      setCpuSparkline((prev) => [...prev.slice(1), { v: Math.random() * 30 + 10 }]);
    }, 2000);
    return () => clearInterval(iv);
  }, [isRunning]);

  return (
    <motion.div
      className="rounded-xl p-6 transition-all duration-300"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: `2px solid ${cfg.border}`,
      }}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] as [number, number, number, number], delay }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span style={{ color: iconColor }}>{icon}</span>
          <h3 className="text-h3 font-semibold" style={{ color: 'var(--text-primary)' }}>
            {process.name}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="relative flex items-center justify-center">
              <span
                className="absolute w-3 h-3 rounded-full animate-badge-pulse"
                style={{ backgroundColor: cfg.dot }}
              />
              <span className="relative w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
            </span>
          )}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: cfg.badgeBg,
              color: cfg.badgeText,
              borderColor: cfg.badgeText + '20',
            }}
          >
            {isTransitioning && (
              <RefreshCw size={12} className="animate-spin" />
            )}
            {isError && <AlertTriangle size={12} />}
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div
          className="rounded-md px-3 py-2"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Microchip size={12} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-caption font-medium" style={{ color: 'var(--text-tertiary)' }}>
              PID
            </span>
          </div>
          <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
            {process.pid ?? '—'}
          </span>
        </div>

        <div
          className="rounded-md px-3 py-2"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Activity size={12} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-caption font-medium" style={{ color: 'var(--text-tertiary)' }}>
              CPU
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              {isRunning ? `${process.cpu.toFixed(1)}%` : '—'}
            </span>
            {isRunning && <MiniSparkline data={cpuSparkline} color={iconColor} />}
          </div>
        </div>

        <div
          className="rounded-md px-3 py-2"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Database size={12} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-caption font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Memory
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              {isRunning ? `${process.memory} MB` : '—'}
            </span>
            {isRunning && (
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: iconColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((process.memory / 512) * 100, 100)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </div>
        </div>

        <div
          className="rounded-md px-3 py-2"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={12} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-caption font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Uptime
            </span>
          </div>
          <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
            {isRunning ? process.uptime : '—'}
          </span>
        </div>
      </div>

      {/* Extra info */}
      {process.port !== undefined && (
        <div className="flex items-center gap-4 mb-3 text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
          <span>Port: {process.port}</span>
          {process.connections !== undefined && <span>Connections: {process.connections}</span>}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mb-3">
        <AnimatePresence mode="wait">
          {(isStopped || isError) && (
            <motion.button
              key="start"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={onStart}
              disabled={isTransitioning}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--terminal-green)', color: '#0D1117' }}
            >
              <Play size={14} />
              Start
            </motion.button>
          )}
          {(isRunning || isTransitioning) && !isError && (
            <motion.button
              key="stop"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={onStop}
              disabled={isTransitioning}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--terminal-red)', color: '#fff' }}
            >
              <Square size={14} />
              Stop
            </motion.button>
          )}
        </AnimatePresence>

        {(isRunning || isError) && (
          <button
            onClick={onRestart}
            disabled={isTransitioning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <RefreshCw size={14} />
            Restart
          </button>
        )}

        <Link
          to="/logs"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ml-auto"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <ScrollText size={14} />
          View Logs
        </Link>
      </div>

      {/* Recent Activity */}
      <div
        className="border-t pt-3 space-y-1.5"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {process.lastLogs.map((log, i) => (
          <p
            key={i}
            className="text-xs font-mono truncate"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {log}
          </p>
        ))}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function Process() {
  const { health, error: healthError } = useHealth(5000);
  const { stats, error: statsError } = useStats(5000);

  const [systemHistory, setSystemHistory] = useState<{ time: string; cpu: number; memory: number }[]>(
    generateHistory(5, 40)
  );

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    processName: string;
    action: 'stop' | 'kill';
    onConfirm: () => void;
  }>({ open: false, processName: '', action: 'stop', onConfirm: () => {} });

  const [tableExpanded, setTableExpanded] = useState(true);

  // Build process info from real data
  const nanobotStatus: ProcessStatus = health?.services.nanobot.status === 'ok' ? 'running' : 'error';
  const opencodeStatus: ProcessStatus = health?.services.opencode.status === 'ok' ? 'running' : 'error';

  const agent: ProcessInfo = useMemo(() => ({
    name: 'NanoBot Orchestrator',
    status: nanobotStatus,
    pid: stats?.processes.pid ?? null,
    cpu: stats?.processes.cpu_percent ?? 0,
    memory: stats?.processes.memory_mb ?? 0,
    uptime: health?.services.nanobot.uptime ?? '—',
    lastLogs: [
      `Provider: ${stats?.config.provider ?? '—'}`,
      `Model: ${stats?.config.model ?? '—'}`,
      `Repo: ${stats?.config.repo ?? '—'}`,
    ],
    history: systemHistory,
  }), [nanobotStatus, stats, health, systemHistory]);

  const gateway: ProcessInfo = useMemo(() => ({
    name: 'OpenCode Executor',
    status: opencodeStatus,
    pid: null,
    cpu: 0,
    memory: 0,
    uptime: health?.services.nanobot.uptime ?? '—',
    port: 8001,
    connections: stats?.queue.pending ?? 0,
    lastLogs: [
      `Status: ${health?.services.opencode.status ?? 'unknown'}`,
      `Redis: ${health?.services.redis.status ?? 'unknown'}`,
      `Pending tasks: ${stats?.queue.pending ?? 0}`,
    ],
    history: systemHistory,
  }), [opencodeStatus, health, stats, systemHistory]);

  /* Live stat updates (mock system chart) */
  useEffect(() => {
    const iv = setInterval(() => {
      setSystemHistory((prev) => [...prev.slice(1), {
        time: new Date().toLocaleTimeString('en-GB'),
        cpu: Math.random() * 8 + 2,
        memory: Math.random() * 15 + 30,
      }]);
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const handleStart = useCallback((_setter: React.Dispatch<React.SetStateAction<ProcessInfo>>) => {
    // In Docker, processes are managed by the orchestrator, not from UI
    alert('Los procesos se gestionan automáticamente por Docker Compose.');
  }, []);

  const handleStop = useCallback(
    (processName: string, _setter: React.Dispatch<React.SetStateAction<ProcessInfo>>) => {
      setConfirmModal({
        open: true,
        processName,
        action: 'stop',
        onConfirm: () => {
          alert('Los procesos se gestionan automáticamente por Docker Compose.');
          setConfirmModal((prev) => ({ ...prev, open: false }));
        },
      });
    },
    []
  );

  const handleRestart = useCallback((_setter: React.Dispatch<React.SetStateAction<ProcessInfo>>) => {
    alert('Los procesos se gestionan automáticamente por Docker Compose.');
  }, []);

  const allRunning = agent.status === 'running' && gateway.status === 'running';
  const allStopped = agent.status === 'stopped' && gateway.status === 'stopped';
  const anyTransitioning = false;

  return (
    <Layout pageTitle="Process Manager">
      <div className="max-w-[960px] mx-auto">
        {/* Page Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
        >
          <div>
            <h1 className="text-h1 font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
              Process Manager
            </h1>
            <p className="text-body mt-1" style={{ color: 'var(--text-secondary)' }}>
              Monitorea los procesos de NanoBot y OpenCode en tiempo real.
            </p>
          </div>
          {(healthError || statsError) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2 rounded-lg px-4 py-3"
              style={{ backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}
            >
              <AlertTriangle size={16} style={{ color: 'var(--terminal-red)' }} />
              <span className="text-sm" style={{ color: 'var(--terminal-red)' }}>
                Error de conexión: {healthError || statsError}
              </span>
            </motion.div>
          )}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            <button
              onClick={() => {
                if (!allRunning && !anyTransitioning) {
                  if (agent.status !== 'running') handleStart(() => {});
                  if (gateway.status !== 'running') handleStart(() => {});
                }
              }}
              disabled={allRunning || anyTransitioning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: allRunning ? 'var(--bg-tertiary)' : 'var(--terminal-green)',
                color: allRunning ? 'var(--text-tertiary)' : '#0D1117',
              }}
            >
              <Play size={14} />
              Start All
            </button>
            <button
              onClick={() => {
                if (!allStopped && !anyTransitioning) {
                  handleStop('NanoBot Agent', () => {});
                  handleStop('WebSocket Gateway', () => {});
                }
              }}
              disabled={allStopped || anyTransitioning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: allStopped ? 'var(--text-tertiary)' : 'var(--terminal-red)',
                border: '1px solid var(--border-color)',
              }}
            >
              <Square size={14} />
              Stop All
            </button>
            <button
              onClick={() => {
                handleRestart(() => {});
                handleRestart(() => {});
              }}
              disabled={anyTransitioning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <RefreshCw size={14} />
              Restart All
            </button>
          </motion.div>
        </motion.div>

        {/* Process Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ProcessCard
            process={agent}
            icon={<Bot size={32} />}
            iconColor="var(--accent)"
            onStart={() => handleStart(() => {})}
            onStop={() => handleStop('NanoBot Agent', () => {})}
            onRestart={() => handleRestart(() => {})}
            delay={0}
          />
          <ProcessCard
            process={gateway}
            icon={<Globe size={32} />}
            iconColor="var(--terminal-cyan)"
            onStart={() => handleStart(() => {})}
            onStop={() => handleStop('WebSocket Gateway', () => {})}
            onRestart={() => handleRestart(() => {})}
            delay={0.12}
          />
        </div>

        {/* System Metrics */}
        <motion.div
          className="rounded-xl p-5 mb-6"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="text-h3 font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            System Resources
          </h3>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={systemHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#A78BFA" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#8B949E', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#30363D' }}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: '#8B949E', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#30363D' }}
                  tickLine={false}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161B22',
                    border: '1px solid #30363D',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono',
                    color: '#E6EDF3',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#A78BFA"
                  strokeWidth={2}
                  fill="url(#cpuGrad)"
                  name="CPU"
                  animationDuration={500}
                />
                <Area
                  type="monotone"
                  dataKey="memory"
                  stroke="#22D3EE"
                  strokeWidth={2}
                  fill="url(#memGrad)"
                  name="Memory"
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#A78BFA' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>CPU</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22D3EE' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Memory</span>
            </div>
          </div>
        </motion.div>

        {/* Process Table (Accordion) */}
        <motion.div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <button
            onClick={() => setTableExpanded(!tableExpanded)}
            className="w-full flex items-center justify-between px-5 py-3 transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <h3 className="text-h3 font-semibold" style={{ color: 'var(--text-primary)' }}>
              Process Table
            </h3>
            {tableExpanded ? (
              <ChevronUp size={18} style={{ color: 'var(--text-secondary)' }} />
            ) : (
              <ChevronDown size={18} style={{ color: 'var(--text-secondary)' }} />
            )}
          </button>
          <AnimatePresence>
            {tableExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4">
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        {['Name', 'PID', 'Status', 'CPU %', 'Memory', 'Uptime', 'Actions'].map((h) => (
                          <th
                            key={h}
                            className="text-caption font-medium uppercase tracking-wide py-2 pr-3"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[agent, gateway].map((proc, idx) => {
                        const cfg = statusConfig[proc.status];
                        return (
                          <motion.tr
                            key={proc.name}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.06 }}
                            className="group"
                            style={{ borderBottom: '1px solid var(--border-color)' }}
                          >
                            <td className="py-2.5 pr-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {proc.name}
                            </td>
                            <td className="py-2.5 pr-3 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                              {proc.pid ?? '—'}
                            </td>
                            <td className="py-2.5 pr-3">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                                style={{
                                  backgroundColor: cfg.badgeBg,
                                  color: cfg.badgeText,
                                  borderColor: cfg.badgeText + '20',
                                }}
                              >
                                {cfg.label}
                              </span>
                            </td>
                            <td className="py-2.5 pr-3 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                              {proc.status === 'running' ? `${proc.cpu.toFixed(1)}%` : '—'}
                            </td>
                            <td className="py-2.5 pr-3 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                              {proc.status === 'running' ? `${proc.memory} MB` : '—'}
                            </td>
                            <td className="py-2.5 pr-3 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                              {proc.uptime}
                            </td>
                            <td className="py-2.5">
                              <button
                                onClick={() =>
                                  setConfirmModal({
                                    open: true,
                                    processName: proc.name,
                                    action: 'kill',
                                    onConfirm: () => {
                                      alert('Los procesos se gestionan automáticamente por Docker Compose.');
                                      setConfirmModal((prev) => ({ ...prev, open: false }));
                                    },
                                  })
                                }
                                className="p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                style={{ color: 'var(--terminal-red)' }}
                                title="Kill process"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmModal.open}
        title={`${confirmModal.action === 'kill' ? 'Kill' : 'Stop'} ${confirmModal.processName}?`}
        message={
          confirmModal.action === 'kill'
            ? 'This will force-terminate the process immediately. Unsaved data may be lost.'
            : 'This will gracefully terminate the running process.'
        }
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
      />
    </Layout>
  );
}
