import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Download,
  Trash2,
  Pin,
  PinOff,
  Pause,
  Play,
  ChevronUp,
  ChevronDown,
  Clipboard,
  ClipboardCheck,
  Terminal,
  AlertTriangle,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useLogs } from '@/hooks/useDashboard';
import '../styles/theme.css';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
type LogProcess = 'agent' | 'gateway' | 'mcp' | 'channel' | 'system' | 'webhook' | 'worker' | 'opencode' | 'github' | 'security' | 'queue';

interface LogLine {
  id: number;
  timestamp: string;
  level: LogLevel;
  process: LogProcess;
  message: string;
  stackTrace?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const LEVEL_STYLES: Record<string, { bg: string; text: string; border?: string; rowBg?: string }> = {
  DEBUG: { bg: 'rgba(139,148,158,0.1)', text: '#8B949E' },
  INFO: { bg: 'rgba(34,211,238,0.1)', text: '#22D3EE' },
  WARN: { bg: 'rgba(251,191,36,0.1)', text: '#FBBF24' },
  ERROR: { bg: 'rgba(248,113,113,0.1)', text: '#F87171', border: '2px solid #F87171', rowBg: 'rgba(248,113,113,0.05)' },
};

const PROCESS_COLORS: Record<string, string> = {
  agent: '#A78BFA',
  gateway: '#22D3EE',
  mcp: '#4ADE80',
  channel: '#FBBF24',
  system: '#8B949E',
  webhook: '#F472B6',
  worker: '#A78BFA',
  opencode: '#4ADE80',
  github: '#FBBF24',
  security: '#F87171',
  queue: '#22D3EE',
};

function formatTime(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

function highlightText(text: string, search: string): React.ReactNode {
  if (!search.trim()) return text;
  const parts = text.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === search.toLowerCase() ? (
      <mark
        key={i}
        className="rounded px-0.5"
        style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--text-primary)' }}
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/* ------------------------------------------------------------------ */
/*  Log Line Component                                                 */
/* ------------------------------------------------------------------ */

function LogLineItem({
  log,
  search,
  isNew,
}: {
  log: LogLine;
  search: string;
  isNew: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const styles = LEVEL_STYLES[log.level] || LEVEL_STYLES.INFO;

  const handleCopy = useCallback(() => {
    const text = `[${formatTime(log.timestamp)}] [${log.level}] [${log.process}] ${log.message}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [log]);

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      className="group flex items-start gap-3 px-4 py-1 transition-colors cursor-pointer"
      style={{
        backgroundColor: hovered ? 'var(--bg-tertiary)' : styles.rowBg || 'transparent',
        borderLeft: log.level === 'ERROR' ? '2px solid var(--terminal-red)' : '2px solid transparent',
        lineHeight: '28px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (log.stackTrace) setExpanded(!expanded);
        else handleCopy();
      }}
    >
      {/* Timestamp */}
      <span
        className="shrink-0 font-mono text-xs select-none"
        style={{ color: 'var(--text-tertiary)', width: '90px' }}
      >
        {formatTime(log.timestamp)}
      </span>

      {/* Level Badge */}
      <span
        className="shrink-0 inline-flex items-center justify-center rounded px-1.5 py-0 text-xs font-mono font-medium"
        style={{ backgroundColor: styles.bg, color: styles.text, minWidth: '50px', textAlign: 'center' }}
      >
        {log.level}
      </span>

      {/* Process Tag */}
      <span
        className="shrink-0 text-xs font-mono"
        style={{ color: PROCESS_COLORS[log.process] || '#8B949E', minWidth: '60px' }}
      >
        [{log.process}]
      </span>

      {/* Message */}
      <span className="flex-1 font-mono text-sm break-all" style={{ color: 'var(--text-primary)' }}>
        {highlightText(log.message, search)}
      </span>

      {/* Copy button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleCopy();
        }}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
        style={{ color: 'var(--text-tertiary)' }}
        title="Copy line"
      >
        {copied ? <ClipboardCheck size={14} style={{ color: 'var(--terminal-green)' }} /> : <Clipboard size={14} />}
      </button>

      {/* Expand chevron for errors */}
      {log.stackTrace && (
        <ChevronDown
          size={14}
          className="shrink-0 transition-transform"
          style={{
            color: 'var(--text-tertiary)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function Logs() {
  const {
    logs: apiLogs,
    total,
    error: logsError,
    setLevelFilter: setApiLevelFilter,
    setProcessFilter: setApiProcessFilter,
    pause,
    resume,
  } = useLogs(3000);

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [processFilter, setProcessFilter] = useState<LogProcess | 'ALL'>('ALL');
  const [timeRange, setTimeRange] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showNewToast, setShowNewToast] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<LogProcess | 'ALL'>('ALL');
  const [searchFocused, setSearchFocused] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const wasAtBottom = useRef(true);
  const prevLogCount = useRef(0);

  // Sync local filters with API hooks
  useEffect(() => {
    setApiLevelFilter(levelFilter);
  }, [levelFilter, setApiLevelFilter]);

  useEffect(() => {
    setApiProcessFilter(processFilter);
  }, [processFilter, setApiProcessFilter]);

  /* Pause / resume API polling */
  useEffect(() => {
    if (paused) {
      pause();
    } else {
      resume();
    }
  }, [paused, pause, resume]);

  /* Auto-scroll */
  useEffect(() => {
    if (autoScroll && !paused && bottomRef.current && apiLogs.length > prevLogCount.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (apiLogs.length > prevLogCount.current && !wasAtBottom.current) {
      setShowNewToast(true);
    }
    prevLogCount.current = apiLogs.length;
  }, [apiLogs, autoScroll, paused]);

  /* Keyboard shortcut Ctrl+K */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Scroll tracking */
  const handleScroll = useCallback(() => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    wasAtBottom.current = scrollHeight - scrollTop - clientHeight < 50;
    if (wasAtBottom.current) setShowNewToast(false);
  }, []);

  /* Filtered logs */
  const filteredLogs = useMemo(() => {
    let result = apiLogs.map((l) => ({
      ...l,
      timestamp: l.timestamp,
      level: (l.level as LogLevel) || 'INFO',
      process: (l.process as LogProcess) || 'system',
    })) as LogLine[];
    if (selectedProcess !== 'ALL') result = result.filter((l) => l.process === selectedProcess);
    if (timeRange !== 'all') {
      const now = new Date();
      const ranges: Record<string, number> = {
        '5min': 5 * 60 * 1000,
        '15min': 15 * 60 * 1000,
        '1hour': 60 * 60 * 1000,
        '24hour': 24 * 60 * 60 * 1000,
      };
      const ms = ranges[timeRange] || Infinity;
      result = result.filter((l) => now.getTime() - new Date(l.timestamp).getTime() <= ms);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.level.toLowerCase().includes(q) ||
          l.process.toLowerCase().includes(q)
      );
    }
    return result;
  }, [apiLogs, selectedProcess, timeRange, search]);

  const matchCount = search.trim() ? filteredLogs.length : 0;

  const handleExport = useCallback(() => {
    const text = filteredLogs
      .map((l) => `[${formatTime(l.timestamp)}] [${l.level}] [${l.process}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nanobot-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  const handleClear = useCallback(() => {
    // Cannot clear server-side logs from client; just clear search/filters
    setSearch('');
    setLevelFilter('ALL');
    setProcessFilter('ALL');
  }, []);

  const handleJumpBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewToast(false);
  }, []);

  const handleJumpTop = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const logSize = useMemo(() => {
    const bytes = filteredLogs.reduce((acc, l) => acc + l.message.length + 50, 0);
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }, [filteredLogs]);

  const isEmpty = filteredLogs.length === 0 && !logsError;

  return (
    <Layout pageTitle="Log Viewer">
      <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 88px)' }}>
        {/* Page Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
        >
          <div>
            <h1 className="text-h1 font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
              Log Viewer
            </h1>
            <p className="text-body mt-1" style={{ color: 'var(--text-secondary)' }}>
              Real-time logs from NanoBot agent and gateway.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-2">
              <span className="relative flex items-center justify-center">
                <span
                  className="absolute w-3 h-3 rounded-full animate-pulse-ring"
                  style={{ backgroundColor: paused ? 'var(--terminal-amber)' : 'var(--terminal-green)' }}
                />
                <span className="relative w-2 h-2 rounded-full" style={{ backgroundColor: paused ? 'var(--terminal-amber)' : 'var(--terminal-green)' }} />
              </span>
              <span
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: paused ? 'var(--terminal-amber)' : 'var(--terminal-green)' }}
              >
                {paused ? 'PAUSED' : 'LIVE'}
              </span>
            </div>

            {/* Process Selector */}
            <select
              value={selectedProcess}
              onChange={(e) => setSelectedProcess(e.target.value as LogProcess | 'ALL')}
              className="h-8 px-3 rounded-lg text-sm font-medium cursor-pointer outline-none"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <option value="ALL">All Sources</option>
              <option value="agent">Agent</option>
              <option value="gateway">Gateway</option>
              <option value="mcp">MCP</option>
              <option value="channel">Channel</option>
              <option value="system">System</option>
              <option value="webhook">Webhook</option>
              <option value="worker">Worker</option>
              <option value="opencode">OpenCode</option>
              <option value="github">GitHub</option>
              <option value="security">Security</option>
              <option value="queue">Queue</option>
            </select>
          </div>
        </motion.div>

        {logsError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-2 rounded-lg px-4 py-3"
            style={{ backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}
          >
            <AlertTriangle size={16} style={{ color: 'var(--terminal-red)' }} />
            <span className="text-sm" style={{ color: 'var(--terminal-red)' }}>
              Error de conexión con la API: {logsError}
            </span>
          </motion.div>
        )}

        {/* Toolbar */}
        <motion.div
          className="flex flex-wrap items-center gap-3 py-3 mb-4 rounded-lg px-4"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div
              className="flex items-center gap-2 flex-1 h-9 px-3 rounded-lg transition-all"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: `1px solid ${searchFocused ? 'var(--accent)' : 'var(--border-color)'}`,
                boxShadow: searchFocused ? '0 0 0 3px var(--accent-glow)' : 'none',
              }}
            >
              <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search logs... (Ctrl+K)"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--text-primary)' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ color: 'var(--text-tertiary)' }}>
                  <X size={14} />
                </button>
              )}
            </div>
            {matchCount > 0 && (
              <motion.span
                className="text-xs font-mono shrink-0"
                style={{ color: 'var(--accent)' }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              >
                {matchCount} matches
              </motion.span>
            )}
          </div>

          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'ALL')}
            className="h-9 px-3 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <option value="ALL">All Levels</option>
            <option value="DEBUG">Debug</option>
            <option value="INFO">Info</option>
            <option value="WARN">Warning</option>
            <option value="ERROR">Error</option>
          </select>

          {/* Process Filter */}
          <select
            value={processFilter}
            onChange={(e) => setProcessFilter(e.target.value as LogProcess | 'ALL')}
            className="h-9 px-3 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <option value="ALL">All Processes</option>
            <option value="agent">Agent</option>
            <option value="gateway">Gateway</option>
            <option value="mcp">MCP</option>
            <option value="channel">Channel</option>
            <option value="system">System</option>
          </select>

          {/* Time Range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="h-9 px-3 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <option value="5min">Last 5 min</option>
            <option value="15min">Last 15 min</option>
            <option value="1hour">Last 1 hour</option>
            <option value="24hour">Last 24 hours</option>
            <option value="all">All time</option>
          </select>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <Download size={14} />
              Export
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <Trash2 size={14} />
              Clear
            </button>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: autoScroll ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                color: autoScroll ? 'var(--accent)' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
              title="Auto-scroll"
            >
              {autoScroll ? <Pin size={14} /> : <PinOff size={14} />}
              Auto-scroll
            </button>
          </div>
        </motion.div>

        {/* Terminal Stream */}
        <div
          className="flex-1 rounded-lg overflow-hidden flex flex-col min-h-[300px]"
          style={{
            backgroundColor: 'var(--bg-terminal)',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* Window Chrome */}
          <div
            className="flex items-center justify-between px-4 py-2 shrink-0"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#F87171' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FBBF24' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#4ADE80' }} />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              <Terminal size={12} />
              NanoBot Logs — {selectedProcess === 'ALL' ? 'All Sources' : selectedProcess}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
                title="Clear"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Log List */}
          <div
            ref={terminalRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto font-mono text-[13px] leading-7 relative"
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '13px',
              lineHeight: '28px',
              scrollbarWidth: 'thin',
            }}
          >
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center h-full py-16">
                <img
                  src="/empty-state-logs.png"
                  alt="No logs"
                  className="w-40 h-auto mb-4 rounded-xl"
                  style={{
                    animation: 'breathe 3s ease-in-out infinite',
                  }}
                />
                <style>{`
                  @keyframes breathe {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                  }
                `}</style>
                <h3 className="text-h3 font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  No logs available
                </h3>
                <p className="text-body-sm text-center max-w-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Logs will appear here once NanoBot is running. Start the agent to see live output.
                </p>
              </div>
            ) : (
              <>
                {filteredLogs.map((log, idx) => (
                  <LogLineItem
                    key={log.id}
                    log={log}
                    search={search}
                    isNew={idx === filteredLogs.length - 1 && !paused}
                  />
                ))}
                {filteredLogs.some((l) => l.stackTrace) && (
                  <AnimatePresence>
                    {filteredLogs.map((log) =>
                      log.stackTrace ? (
                        <motion.div
                          key={`stack-${log.id}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="pl-[196px] pr-4 pb-2 font-mono text-xs whitespace-pre-wrap"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {log.stackTrace}
                          </div>
                        </motion.div>
                      ) : null
                    )}
                  </AnimatePresence>
                )}
                <div ref={bottomRef} className="h-1" />
              </>
            )}

            {/* Pause Overlay */}
            <AnimatePresence>
              {paused && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ backgroundColor: 'rgba(12,12,12,0.7)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div
                    className="px-6 py-3 rounded-lg font-mono text-sm font-medium"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--terminal-amber)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    PAUSED
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Stream Controls */}
          <div
            className="flex items-center justify-between px-4 shrink-0"
            style={{
              height: '40px',
              backgroundColor: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            {/* Left: Stats */}
            <div className="flex items-center gap-3">
              <span className="text-caption" style={{ color: 'var(--text-secondary)' }}>
                Lines: {filteredLogs.length.toLocaleString()} / {total}
              </span>
              <span className="text-caption" style={{ color: 'var(--text-secondary)' }}>
                Size: {logSize}
              </span>
            </div>

            {/* Center: Jump buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleJumpTop}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
                title="Jump to top"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={handleJumpBottom}
                className={`p-1.5 rounded-md transition-colors ${showNewToast ? 'animate-pulse' : ''}`}
                style={{ color: showNewToast ? 'var(--terminal-amber)' : 'var(--text-tertiary)' }}
                title="Jump to bottom"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaused(!paused)}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: paused ? 'var(--terminal-amber)' : 'var(--text-tertiary)' }}
                title={paused ? 'Resume' : 'Pause'}
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}
              </button>
              <button
                onClick={handleExport}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
                title="Download full log"
              >
                <Download size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* New logs toast */}
        <AnimatePresence>
          {showNewToast && (
            <motion.div
              className="fixed bottom-20 right-6 z-50"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={handleJumpBottom}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-lg"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--terminal-amber)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <ChevronDown size={14} />
                New logs — Jump to bottom
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
