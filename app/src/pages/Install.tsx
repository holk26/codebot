import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  Package,
  Zap,
  Container,
  Download,
  Check,
  Loader2,
  X,
  ChevronDown,
  FileText,
  Info,
  RotateCcw,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import Layout from '@/components/Layout';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type InstallMethodId = 'source' | 'pypi' | 'uv' | 'docker';
type InstallStatus = 'idle' | 'installing' | 'installed' | 'error';

interface InstallMethod {
  id: InstallMethodId;
  icon: React.ReactNode;
  title: string;
  description: string;
  requires: string;
  commands: string[];
  badge?: { text: string; color: string };
  extraInfo?: string;
}

interface HistoryEntry {
  id: string;
  date: string;
  method: string;
  version: string;
  status: 'success' | 'failed' | 'retry';
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const METHODS: InstallMethod[] = [
  {
    id: 'source',
    icon: <GitBranch size={28} />,
    title: 'From Source',
    description: 'Clone the GitHub repository and install in editable mode. Best for developers who want to modify the code.',
    requires: 'Requires Git, Python 3.10+',
    commands: [
      'git clone https://github.com/HKUDS/nanobot.git',
      'cd nanobot',
      'pip install -e .',
    ],
  },
  {
    id: 'pypi',
    icon: <Package size={28} />,
    title: 'PyPI Package',
    description: 'Install the latest stable release from the Python Package Index. Simple and reliable.',
    requires: 'Requires Python 3.10+, pip',
    commands: ['pip install nanobot-ai'],
  },
  {
    id: 'uv',
    icon: <Zap size={28} />,
    title: 'uv (Fastest)',
    description: "Ultra-fast installation using Astral's uv tool. Significantly faster than pip.",
    requires: 'Requires uv installed',
    commands: ['uv tool install nanobot-ai'],
    badge: { text: 'Recommended', color: 'violet' },
  },
  {
    id: 'docker',
    icon: <Container size={28} />,
    title: 'Docker',
    description: 'Run NanoBot in a fully isolated container. Includes Docker Compose configuration.',
    requires: 'Requires Docker, Docker Compose',
    commands: ['docker-compose up'],
    extraInfo: 'Volume mounts: ~/.nanobot/ → /app/config',
  },
];

const MOCK_HISTORY: HistoryEntry[] = [
  { id: '1', date: '2024-05-01 14:32', method: 'PyPI', version: 'v2.4.0', status: 'success' },
  { id: '2', date: '2024-04-15 09:10', method: 'uv', version: 'v2.3.2', status: 'success' },
  { id: '3', date: '2024-03-20 18:45', method: 'Source', version: 'dev', status: 'failed' },
];

const SIMULATED_LOGS: Record<InstallMethodId, string[]> = {
  source: [
    '[14:32:01] Cloning into \'nanobot\'...',
    '[14:32:03] remote: Enumerating objects: 3421, done.',
    '[14:32:05] remote: Total 3421 (delta 1203), reused 3421 (delta 1203)',
    '[14:32:06] Receiving objects: 100% (3421/3421), 2.4 MiB | 5.2 MiB/s, done.',
    '[14:32:08] Resolving deltas: 100% (1203/1203), done.',
    '[14:32:10] Obtaining file:///home/user/nanobot',
    '[14:32:12] Installing build dependencies...',
    '[14:32:15] Getting requirements to build wheel...',
    '[14:32:18] Preparing metadata (pyproject.toml)...',
    '[14:32:22] Installing collected packages: nanobot',
    '[14:32:25] Successfully installed nanobot-2.4.1',
  ],
  pypi: [
    '[14:32:01] Collecting nanobot-ai',
    '[14:32:02] Downloading nanobot_ai-2.4.1-py3-none-any.whl (1.2 MB)',
    '[14:32:04]    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.2/1.2 MB 8.3 MB/s eta 0:00:00',
    '[14:32:05] Requirement already satisfied: openai>=1.0 in ./venv',
    '[14:32:06] Installing collected packages: nanobot-ai',
    '[14:32:08] Successfully installed nanobot-ai-2.4.1',
  ],
  uv: [
    '[14:32:01] Resolved 42 packages in 125ms',
    '[14:32:01] Downloaded nanobot-ai v2.4.1',
    '[14:32:02] Downloaded openai v1.30.0',
    '[14:32:02] Downloaded anthropic v0.28.0',
    '[14:32:03] Installed 42 packages in 89ms',
    '[14:32:03] + nanobot-ai==2.4.1',
  ],
  docker: [
    '[14:32:01] Pulling nanobot image...',
    '[14:32:05] latest: Pulling from hkuds/nanobot',
    '[14:32:10] Digest: sha256:a1b2c3d4...',
    '[14:32:10] Status: Downloaded newer image for hkuds/nanobot:latest',
    '[14:32:11] Creating nanobot_nanobot_1 ... done',
    '[14:32:12] Attaching to nanobot_nanobot_1',
    '[14:32:13] NanoBot v2.4.1 running in container',
  ],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getLogColor(line: string): string {
  if (line.includes('Successfully') || line.includes('done') || line.includes('Running')) return '#4ADE80';
  if (line.includes('error') || line.includes('ERROR') || line.includes('Failed')) return '#F87171';
  if (line.includes('warning') || line.includes('WARN')) return '#FBBF24';
  if (line.includes('Downloading') || line.includes('Collecting') || line.includes('Resolved')) return '#22D3EE';
  return '#E6EDF3';
}

/* ------------------------------------------------------------------ */
/*  Terminal Component                                                 */
/* ------------------------------------------------------------------ */

function TerminalPreview({
  lines,
  onClear,
  onClose,
}: {
  lines: string[];
  onClear: () => void;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <motion.div
      className="rounded-xl overflow-hidden mb-6"
      style={{
        backgroundColor: '#0C0C0C',
        border: '1px solid #30363D',
      }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ backgroundColor: '#161B22', borderBottom: '1px solid #30363D' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#F87171' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FBBF24' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#4ADE80' }} />
          <span className="text-caption font-medium ml-2" style={{ color: '#8B949E' }}>
            Installation Output
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="text-caption hover:text-white transition-colors"
            style={{ color: '#8B949E' }}
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="hover:text-white transition-colors"
            style={{ color: '#8B949E' }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div
        ref={scrollRef}
        className="p-3 font-mono text-xs max-h-[400px] overflow-y-auto"
        style={{ lineHeight: 1.7 }}
      >
        <AnimatePresence>
          {lines.map((line, i) => (
            <motion.div
              key={`${i}-${line}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: 0.03 * (i % 5) }}
              className="py-0.5"
              style={{ color: getLogColor(line) }}
            >
              {line}
            </motion.div>
          ))}
        </AnimatePresence>
        <div className="flex items-center gap-1 mt-1">
          <span style={{ color: '#8B949E' }}>user@nanobot:~$</span>
          <span className="inline-block w-2 h-3.5 align-middle animate-caret-blink" style={{ backgroundColor: '#A78BFA' }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Method Card                                                        */
/* ------------------------------------------------------------------ */

function MethodCard({
  method,
  status,
  onInstall,
}: {
  method: InstallMethod;
  status: InstallStatus;
  onInstall: () => void;
}) {
  const isInstalling = status === 'installing';
  const isInstalled = status === 'installed';
  const isError = status === 'error';

  return (
    <motion.div
      className="rounded-xl p-6 transition-all duration-250"
      style={{
        backgroundColor: '#161B22',
        border: `1px solid ${isInstalled ? 'rgba(74,222,128,0.4)' : isInstalling ? 'rgba(251,191,36,0.4)' : isError ? 'rgba(248,113,113,0.4)' : '#30363D'}`,
      }}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      whileHover={
        !isInstalling && !isInstalled
          ? {
              y: -4,
              borderColor: '#A78BFA',
              boxShadow: '0 0 20px rgba(167,139,250,0.15)',
            }
          : {}
      }
    >
      {/* Badge */}
      {method.badge && (
        <div className="flex justify-end mb-2">
          <span
            className="px-2 py-0.5 rounded-full text-caption font-medium"
            style={{
              backgroundColor: 'rgba(167,139,250,0.15)',
              color: '#A78BFA',
              border: '1px solid rgba(167,139,250,0.2)',
            }}
          >
            {method.badge.text}
          </span>
        </div>
      )}

      {/* Icon + Title */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'rgba(167,139,250,0.15)' }}
        >
          <span style={{ color: '#A78BFA' }}>{method.icon}</span>
        </div>
        <h3 className="text-h3 font-semibold" style={{ color: '#E6EDF3' }}>
          {method.title}
        </h3>
      </div>

      {/* Description */}
      <p className="text-body-sm mb-2" style={{ color: '#8B949E' }}>
        {method.description}
      </p>

      {/* Requirements */}
      <p className="text-caption font-mono mb-4" style={{ color: '#484F58' }}>
        {method.requires}
      </p>

      {/* Command preview */}
      <div
        className="rounded-lg p-3 font-mono text-xs mb-4 overflow-x-auto"
        style={{ backgroundColor: '#0C0C0C' }}
      >
        {method.commands.map((cmd, i) => (
          <div key={i} className="flex">
            <span style={{ color: '#4ADE80', marginRight: 8 }}>$</span>
            <span>
              {cmd.split(' ').map((part, j) => {
                const isUrl = part.startsWith('http');
                return (
                  <span key={j} style={{ color: isUrl ? '#22D3EE' : j === 0 ? '#4ADE80' : '#E6EDF3' }}>
                    {part}{' '}
                  </span>
                );
              })}
            </span>
          </div>
        ))}
      </div>

      {/* Extra info */}
      {method.extraInfo && (
        <p className="text-caption mb-4" style={{ color: '#8B949E' }}>
          {method.extraInfo}
        </p>
      )}

      {/* Action button */}
      {isInstalled ? (
        <motion.div
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.2)' }}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 0.4 }}
        >
          <Check size={16} />
          Installed
        </motion.div>
      ) : (
        <motion.button
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: isInstalling ? '#21262D' : '#A78BFA',
            color: isInstalling ? '#FBBF24' : '#FFFFFF',
            border: isInstalling ? '1px solid #30363D' : 'none',
          }}
          onClick={onInstall}
          disabled={isInstalling}
          whileHover={!isInstalling ? { scale: 1.02 } : {}}
          whileTap={!isInstalling ? { scale: 0.98 } : {}}
        >
          {isInstalling ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Installing...
            </>
          ) : (
            <>
              <Download size={16} />
              Install {method.title}
            </>
          )}
        </motion.button>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function InstallManager() {
  const [isInstalled, setIsInstalled] = useState(true);
  const [installStatuses, setInstallStatuses] = useState<Record<InstallMethodId, InstallStatus>>({
    source: 'idle',
    pypi: 'idle',
    uv: 'idle',
    docker: 'idle',
  });
  const [activeTerminal, setActiveTerminal] = useState<InstallMethodId | null>(null);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);

  const runInstall = useCallback((methodId: InstallMethodId) => {
    setInstallStatuses((prev) => ({ ...prev, [methodId]: 'installing' }));
    setActiveTerminal(methodId);
    setTerminalLines([]);

    const logs = SIMULATED_LOGS[methodId];
    let index = 0;

    const interval = setInterval(() => {
      if (index < logs.length) {
        setTerminalLines((prev) => [...prev, logs[index]]);
        index++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setInstallStatuses((prev) => ({ ...prev, [methodId]: 'installed' }));
          setIsInstalled(true);
        }, 600);
      }
    }, 300);
  }, []);

  const handleUninstall = useCallback(() => {
    setIsInstalled(false);
    setInstallStatuses({ source: 'idle', pypi: 'idle', uv: 'idle', docker: 'idle' });
    setActiveTerminal(null);
    setTerminalLines([]);
    setShowUninstallConfirm(false);
  }, []);

  const clearTerminal = useCallback(() => setTerminalLines([]), []);
  const closeTerminal = useCallback(() => {
    setActiveTerminal(null);
    setTerminalLines([]);
  }, []);

  return (
    <Layout pageTitle="Install Manager">
      <div className="max-w-[960px] mx-auto py-6 space-y-6">
        {/* Page Header */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
        >
          <div>
            <h1 className="text-h1 font-display font-bold" style={{ color: '#E6EDF3' }}>
              Install Manager
            </h1>
            <p className="text-body mt-1" style={{ color: '#8B949E' }}>
              Install, update, or remove NanoBot from your system.
            </p>
          </div>
          <motion.div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-caption font-medium"
            style={{
              backgroundColor: isInstalled ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
              color: isInstalled ? '#4ADE80' : '#F87171',
              border: `1px solid ${isInstalled ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
            }}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number], delay: 0.2 }}
          >
            {isInstalled ? (
              <>
                <Check size={14} />
                NanoBot v2.4.1 installed
              </>
            ) : (
              <>
                <X size={14} />
                Not installed
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Status Banner */}
        <motion.div
          className="rounded-lg px-4 py-3 flex items-start gap-3"
          style={{
            backgroundColor: '#21262D',
            borderLeft: `4px solid ${isInstalled ? '#4ADE80' : '#FBBF24'}`,
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
        >
          {isInstalled ? (
            <Check size={20} style={{ color: '#4ADE80', marginTop: 2 }} />
          ) : (
            <Info size={20} style={{ color: '#FBBF24', marginTop: 2 }} />
          )}
          <div className="flex-1">
            <p className="text-body-sm" style={{ color: '#E6EDF3' }}>
              {isInstalled
                ? 'NanoBot v2.4.1 is installed at ~/.nanobot/'
                : 'NanoBot is not installed on your system. Choose a method below to get started.'}
            </p>
            {isInstalled && (
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <button
                  className="px-3 py-1.5 rounded-lg text-caption font-medium transition-all duration-200"
                  style={{
                    backgroundColor: '#21262D',
                    color: '#E6EDF3',
                    border: '1px solid #30363D',
                  }}
                  onClick={() => setInstallStatuses({ source: 'idle', pypi: 'idle', uv: 'idle', docker: 'idle' })}
                >
                  Reinstall
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg text-caption font-medium transition-all duration-200"
                  style={{
                    backgroundColor: '#21262D',
                    color: '#F87171',
                    border: '1px solid #30363D',
                  }}
                  onClick={() => setShowUninstallConfirm(true)}
                >
                  Uninstall
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg text-caption font-medium transition-all duration-200"
                  style={{
                    backgroundColor: '#A78BFA',
                    color: '#FFFFFF',
                  }}
                >
                  Update
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Method Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {METHODS.map((method, i) => (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.4,
                delay: 0.1 * i,
                ease: [0, 0, 0.2, 1] as [number, number, number, number],
              }}
            >
              <MethodCard
                method={method}
                status={installStatuses[method.id]}
                onInstall={() => runInstall(method.id)}
              />
            </motion.div>
          ))}
        </div>

        {/* Terminal Preview */}
        <AnimatePresence>
          {activeTerminal && (
            <TerminalPreview
              lines={terminalLines}
              onClear={clearTerminal}
              onClose={closeTerminal}
            />
          )}
        </AnimatePresence>

        {/* Installation History Accordion */}
        <motion.div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: '#161B22',
            border: '1px solid #30363D',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <button
            className="w-full flex items-center justify-between px-6 py-4 text-left"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <div className="flex items-center gap-2">
              <Clock size={18} style={{ color: '#8B949E' }} />
              <h2 className="text-h3 font-semibold" style={{ color: '#E6EDF3' }}>
                Installation History
              </h2>
            </div>
            <motion.div animate={{ rotate: historyOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown size={18} style={{ color: '#8B949E' }} />
            </motion.div>
          </button>

          <AnimatePresence>
            {historyOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-4 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: '#21262D' }}>
                        {['Date', 'Method', 'Version', 'Status', 'Actions'].map((h) => (
                          <th
                            key={h}
                            className="text-left px-3 py-2 text-caption font-medium uppercase tracking-wide"
                            style={{ color: '#8B949E' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_HISTORY.map((entry, i) => (
                        <motion.tr
                          key={entry.id}
                          className="transition-colors duration-150"
                          style={{
                            backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(33,38,45,0.3)',
                            borderTop: '1px solid #30363D',
                          }}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05, duration: 0.3 }}
                        >
                          <td className="px-3 py-3 text-body-sm font-mono" style={{ color: '#8B949E' }}>
                            {entry.date}
                          </td>
                          <td className="px-3 py-3 text-body-sm" style={{ color: '#E6EDF3' }}>
                            {entry.method}
                          </td>
                          <td className="px-3 py-3 text-body-sm font-mono" style={{ color: '#E6EDF3' }}>
                            {entry.version}
                          </td>
                          <td className="px-3 py-3">
                            {entry.status === 'success' && (
                              <span className="inline-flex items-center gap-1 text-caption" style={{ color: '#4ADE80' }}>
                                <Check size={14} /> Success
                              </span>
                            )}
                            {entry.status === 'failed' && (
                              <span className="inline-flex items-center gap-1 text-caption" style={{ color: '#F87171' }}>
                                <X size={14} /> Failed
                              </span>
                            )}
                            {entry.status === 'retry' && (
                              <span className="inline-flex items-center gap-1 text-caption" style={{ color: '#FBBF24' }}>
                                <RotateCcw size={14} /> Retry
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                className="p-1.5 rounded-md transition-colors duration-200 hover:bg-[#21262D]"
                                style={{ color: '#8B949E' }}
                                title="View Log"
                              >
                                <FileText size={14} />
                              </button>
                              {entry.status === 'failed' && (
                                <button
                                  className="p-1.5 rounded-md transition-colors duration-200 hover:bg-[#21262D]"
                                  style={{ color: '#FBBF24' }}
                                  title="Reinstall"
                                >
                                  <RotateCcw size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Uninstall Confirmation Modal */}
      <AnimatePresence>
        {showUninstallConfirm && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-xl p-6 max-w-sm w-full"
              style={{
                backgroundColor: '#161B22',
                border: '1px solid #30363D',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(248,113,113,0.15)' }}
                >
                  <AlertTriangle size={20} style={{ color: '#F87171' }} />
                </div>
                <h3 className="text-h3 font-semibold" style={{ color: '#E6EDF3' }}>
                  Uninstall NanoBot?
                </h3>
              </div>
              <p className="text-body-sm mb-6" style={{ color: '#8B949E' }}>
                This will remove NanoBot and all associated data from your system. This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    backgroundColor: '#21262D',
                    color: '#E6EDF3',
                    border: '1px solid #30363D',
                  }}
                  onClick={() => setShowUninstallConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    backgroundColor: '#F87171',
                    color: '#FFFFFF',
                  }}
                  onClick={handleUninstall}
                >
                  Uninstall
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
