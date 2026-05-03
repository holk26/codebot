import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Globe,
  Monitor,
  RefreshCw,
  ScrollText,
  Pencil,
  AlertTriangle,
  Download,
  Trash2,
  Plus,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ServiceState = 'active' | 'inactive' | 'enabling' | 'disabling' | 'error';
type Platform = 'linux' | 'macos' | 'windows' | 'unknown';

interface ServiceData {
  name: string;
  serviceFile: string;
  state: ServiceState;
  enabled: boolean;
  pid: string | null;
  lastStarted: string;
  autoStart: string;
  description: string;
}

interface LogLine {
  id: number;
  timestamp: string;
  unit: string;
  message: string;
  level: 'info' | 'warn' | 'error';
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_PLATFORM: Platform = 'linux';

const INITIAL_SERVICES: Record<string, ServiceData> = {
  agent: {
    name: 'NanoBot Agent Service',
    serviceFile: 'nanobot-agent.service',
    state: 'active',
    enabled: true,
    pid: '14283',
    lastStarted: '2 days ago',
    autoStart: 'On boot',
    description:
      'Runs the NanoBot AI agent as a persistent background process. Automatically starts on boot.',
  },
  gateway: {
    name: 'WebSocket Gateway Service',
    serviceFile: 'nanobot-gateway.service',
    state: 'inactive',
    enabled: false,
    pid: null,
    lastStarted: '—',
    autoStart: 'Manual',
    description:
      'Runs the WebSocket gateway for the NanoBot WebUI. Required for web interface access.',
  },
};

const MOCK_LOGS: LogLine[] = [
  {
    id: 1,
    timestamp: 'Jan 15 09:23:41',
    unit: 'nanobot-agent',
    message: 'Service started successfully',
    level: 'info',
  },
  {
    id: 2,
    timestamp: 'Jan 15 09:23:42',
    unit: 'nanobot-agent',
    message: 'Loading configuration from ~/.nanobot/config.yaml',
    level: 'info',
  },
  {
    id: 3,
    timestamp: 'Jan 15 09:23:43',
    unit: 'nanobot-agent',
    message: 'Connected to WebSocket gateway on port 7450',
    level: 'info',
  },
  {
    id: 4,
    timestamp: 'Jan 15 09:23:44',
    unit: 'nanobot-agent',
    message: 'AI provider initialized: OpenAI (gpt-4o)',
    level: 'info',
  },
  {
    id: 5,
    timestamp: 'Jan 15 09:23:45',
    unit: 'nanobot-agent',
    message: 'Memory module loaded. 42 contexts available.',
    level: 'info',
  },
  {
    id: 6,
    timestamp: 'Jan 15 09:24:12',
    unit: 'nanobot-agent',
    message: 'Gateway heartbeat check passed',
    level: 'info',
  },
  {
    id: 7,
    timestamp: 'Jan 15 09:25:01',
    unit: 'nanobot-agent',
    message: 'Periodic model refresh triggered',
    level: 'info',
  },
  {
    id: 8,
    timestamp: 'Jan 15 09:30:22',
    unit: 'nanobot-agent',
    message: 'Warning: high memory usage detected (78%)',
    level: 'warn',
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const platformInfo = (platform: Platform) => {
  switch (platform) {
    case 'linux':
      return {
        label: 'Linux (Ubuntu 22.04)',
        manager: 'Services will be managed using systemd.',
      };
    case 'macos':
      return {
        label: 'macOS ( Sonoma 14 )',
        manager: 'Services will be managed using LaunchAgent.',
      };
    case 'windows':
      return {
        label: 'Windows 11',
        manager: 'Services will be managed using Windows Service.',
      };
    default:
      return {
        label: 'Unknown Platform',
        manager:
          'Service management requires Linux (systemd), macOS (LaunchAgent), or Windows.',
      };
  }
};

const stateBorderColor = (state: ServiceState) => {
  switch (state) {
    case 'active':
      return '#4ADE80';
    case 'inactive':
      return '#30363D';
    case 'enabling':
    case 'disabling':
      return '#FBBF24';
    case 'error':
      return '#F87171';
    default:
      return '#30363D';
  }
};

const stateBadge = (state: ServiceState) => {
  switch (state) {
    case 'active':
      return { label: 'Active', className: 'bg-green-500/15 text-green-400 border-green-500/20' };
    case 'inactive':
      return { label: 'Inactive', className: 'bg-gray-500/15 text-gray-400 border-gray-500/20' };
    case 'enabling':
      return { label: 'Enabling...', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' };
    case 'disabling':
      return { label: 'Disabling...', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' };
    case 'error':
      return { label: 'Error', className: 'bg-red-500/15 text-red-400 border-red-500/20' };
    default:
      return { label: 'Unknown', className: 'bg-gray-500/15 text-gray-400 border-gray-500/20' };
  }
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ServiceLogTerminal({
  logs,
  selectedUnit,
  onRefresh,
  onClear,
  onExport,
}: {
  logs: LogLine[];
  selectedUnit: string;
  onRefresh: () => void;
  onClear: () => void;
  onExport: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const levelColor = (level: LogLine['level']) => {
    switch (level) {
      case 'info':
        return '#22D3EE';
      case 'warn':
        return '#FBBF24';
      case 'error':
        return '#F87171';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Terminal header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#F87171' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FBBF24' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#4ADE80' }} />
          </div>
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            Service Log
          </span>
          <Badge
            variant="outline"
            className="text-xs font-mono"
            style={{
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-color)',
            }}
          >
            {selectedUnit}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Trash2 size={14} />
            Clear
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Terminal output */}
      <div
        className="px-4 py-3 font-mono text-[13px] overflow-y-auto"
        style={{
          backgroundColor: '#0C0C0C',
          color: '#8B949E',
          maxHeight: '300px',
          lineHeight: 1.7,
        }}
      >
        {logs.length === 0 ? (
          <p className="italic opacity-50">No log entries...</p>
        ) : (
          logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3"
            >
              <span className="shrink-0 opacity-50">{log.timestamp}</span>
              <span className="shrink-0" style={{ color: levelColor(log.level) }}>
                [{log.unit}]
              </span>
              <span style={{ color: log.level === 'error' ? '#F87171' : '#E6EDF3' }}>
                {log.message}
              </span>
            </motion.div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </motion.div>
  );
}

function ServiceConfigModal({
  open,
  onClose,
  service,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  service: ServiceData;
  onSave: (config: ServiceConfigForm) => void;
}) {
  const [workingDir, setWorkingDir] = useState('~/.nanobot/');
  const [restartPolicy, setRestartPolicy] = useState('always');
  const [restartDelay, setRestartDelay] = useState('5');
  const [maxRestarts, setMaxRestarts] = useState('10');
  const [user, setUser] = useState('current user');
  const [startOnBoot, setStartOnBoot] = useState(service.enabled);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([
    { key: 'NANOBOT_LOG_LEVEL', value: 'info' },
    { key: 'NANOBOT_PROVIDER', value: 'openai' },
  ]);

  const addEnvVar = () => setEnvVars([...envVars, { key: '', value: '' }]);
  const removeEnvVar = (idx: number) =>
    setEnvVars(envVars.filter((_, i) => i !== idx));
  const updateEnvVar = (idx: number, field: 'key' | 'value', val: string) => {
    const next = [...envVars];
    next[idx][field] = val;
    setEnvVars(next);
  };

  const preview = `[Unit]
Description=${service.name}
After=network.target

[Service]
Type=simple
User=${user}
WorkingDirectory=${workingDir}
Environment=${envVars.map((e) => `${e.key}=${e.value}`).join(' ')}
ExecStart=/usr/local/bin/nanobot start
Restart=${restartPolicy}
RestartSec=${restartDelay}
StartLimitBurst=${maxRestarts}

[Install]
WantedBy=multi-user.target`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-[640px]"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="font-display text-xl font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Edit Service Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Service Name */}
          <div>
            <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Service Name
            </Label>
            <Input
              readOnly
              value={service.serviceFile}
              className="mt-1.5 font-mono text-sm"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-tertiary)',
              }}
            />
          </div>

          {/* Working Directory */}
          <div>
            <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Working Directory
            </Label>
            <Input
              value={workingDir}
              onChange={(e) => setWorkingDir(e.target.value)}
              className="mt-1.5 font-mono text-sm"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Environment Variables */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Environment Variables
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={addEnvVar}
                className="h-7 text-xs gap-1"
                style={{ color: 'var(--accent)' }}
              >
                <Plus size={14} /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {envVars.map((env, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="KEY"
                    value={env.key}
                    onChange={(e) => updateEnvVar(idx, 'key', e.target.value)}
                    className="font-mono text-xs flex-1"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Input
                    placeholder="value"
                    value={env.value}
                    onChange={(e) => updateEnvVar(idx, 'value', e.target.value)}
                    className="font-mono text-xs flex-1"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEnvVar(idx)}
                    className="h-8 w-8 p-0"
                    style={{ color: 'var(--terminal-red)' }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Restart Policy */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Restart Policy
              </Label>
              <Select value={restartPolicy} onValueChange={setRestartPolicy}>
                <SelectTrigger
                  className="mt-1.5 text-sm"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <SelectItem value="always">always</SelectItem>
                  <SelectItem value="on-failure">on-failure</SelectItem>
                  <SelectItem value="no">no</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Restart Delay (seconds)
              </Label>
              <Input
                type="number"
                value={restartDelay}
                onChange={(e) => setRestartDelay(e.target.value)}
                className="mt-1.5 text-sm"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Max Restarts & User */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Max Restarts
              </Label>
              <Input
                type="number"
                value={maxRestarts}
                onChange={(e) => setMaxRestarts(e.target.value)}
                className="mt-1.5 text-sm"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                User
              </Label>
              <Input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="mt-1.5 text-sm"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Start on Boot */}
          <div className="flex items-center justify-between py-2">
            <Label className="text-sm" style={{ color: 'var(--text-primary)' }}>
              Start on Boot
            </Label>
            <Switch checked={startOnBoot} onCheckedChange={setStartOnBoot} />
          </div>

          {/* Preview */}
          <div
            className="rounded-lg overflow-hidden"
            style={{
              backgroundColor: '#0C0C0C',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              className="px-3 py-2 text-xs font-medium"
              style={{
                color: 'var(--text-secondary)',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              Generated Service File Preview
            </div>
            <pre
              className="p-3 font-mono text-[12px] overflow-x-auto"
              style={{ color: '#E6EDF3', lineHeight: 1.6 }}
            >
              {preview}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setWorkingDir('~/.nanobot/');
                setRestartPolicy('always');
                setRestartDelay('5');
                setMaxRestarts('10');
                setUser('current user');
                setStartOnBoot(service.enabled);
                setEnvVars([
                  { key: 'NANOBOT_LOG_LEVEL', value: 'info' },
                  { key: 'NANOBOT_PROVIDER', value: 'openai' },
                ]);
              }}
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              Reset
            </Button>
            <Button
              onClick={() =>
                onSave({
                  workingDir,
                  restartPolicy,
                  restartDelay,
                  maxRestarts,
                  user,
                  startOnBoot,
                  envVars,
                })
              }
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ServiceConfigForm {
  workingDir: string;
  restartPolicy: string;
  restartDelay: string;
  maxRestarts: string;
  user: string;
  startOnBoot: boolean;
  envVars: { key: string; value: string }[];
}

function DisableConfirmModal({
  open,
  onClose,
  onConfirm,
  serviceName,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  serviceName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-[420px]"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="font-display text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Disable {serviceName}?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          This will stop the service and prevent it from starting on boot.
        </p>
        <div className="flex items-center justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            style={{
              backgroundColor: 'var(--terminal-red)',
              color: '#fff',
            }}
          >
            Disable
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function Services() {
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [logs, setLogs] = useState<LogLine[]>(MOCK_LOGS);
  const [selectedLogUnit, setSelectedLogUnit] = useState('nanobot-agent');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configTarget, setConfigTarget] = useState<string | null>(null);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [disableTarget, setDisableTarget] = useState<string | null>(null);
  const [shakeCard, setShakeCard] = useState<string | null>(null);
  const [restarting, setRestarting] = useState<Record<string, boolean>>({});

  const platform = MOCK_PLATFORM;
  const platformData = platformInfo(platform);
  const isUnsupported = platform === 'unknown';

  /* ---- Service actions ---- */

  const toggleService = useCallback(
    (key: string) => {
      const svc = services[key];
      if (!svc) return;

      if (svc.state === 'active') {
        // Show confirmation before disabling
        setDisableTarget(key);
        setDisableConfirmOpen(true);
        return;
      }

      // Enable
      setServices((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          state: 'enabling',
          enabled: true,
        },
      }));

      // Simulate enabling
      setTimeout(() => {
        setServices((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            state: 'active',
            enabled: true,
            pid: String(Math.floor(10000 + Math.random() * 50000)),
            lastStarted: 'Just now',
            autoStart: 'On boot',
          },
        }));
      }, 1500);
    },
    [services]
  );

  const confirmDisable = useCallback(() => {
    if (!disableTarget) return;
    const key = disableTarget;
    setDisableConfirmOpen(false);
    setDisableTarget(null);

    setServices((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        state: 'disabling',
      },
    }));

    setTimeout(() => {
      setServices((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          state: 'inactive',
          enabled: false,
          pid: null,
          lastStarted: '—',
          autoStart: 'Manual',
        },
      }));
    }, 1200);
  }, [disableTarget]);

  const restartService = useCallback((key: string) => {
    setRestarting((prev) => ({ ...prev, [key]: true }));
    setShakeCard(key);

    setServices((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        state: 'enabling',
      },
    }));

    setTimeout(() => {
      setServices((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          state: 'active',
          pid: String(Math.floor(10000 + Math.random() * 50000)),
          lastStarted: 'Just now',
        },
      }));
      setRestarting((prev) => ({ ...prev, [key]: false }));
      setShakeCard(null);
    }, 2000);
  }, []);

  const openConfig = useCallback((key: string) => {
    setConfigTarget(key);
    setConfigModalOpen(true);
  }, []);

  const saveConfig = useCallback(
    (_config: ServiceConfigForm) => {
      setConfigModalOpen(false);
      setConfigTarget(null);
      // In a real app, this would write the service file
      // For demo, we just close the modal
    },
    []
  );

  /* ---- Log actions ---- */

  const refreshLogs = useCallback(() => {
    const newLog: LogLine = {
      id: logs.length + 1,
      timestamp: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      unit: selectedLogUnit,
      message: 'Log refreshed at ' + new Date().toLocaleTimeString(),
      level: 'info',
    };
    setLogs((prev) => [...prev, newLog]);
  }, [logs.length, selectedLogUnit]);

  const clearLogs = useCallback(() => setLogs([]), []);

  const exportLogs = useCallback(() => {
    const text = logs
      .map((l) => `${l.timestamp} [${l.unit}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedLogUnit}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs, selectedLogUnit]);

  /* ---- Render ---- */

  return (
    <Layout pageTitle="Service Manager">
      <div className="max-w-[800px] mx-auto space-y-6 pb-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
        >
          <h1
            className="font-display font-bold text-[36px] leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Service Manager
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="text-base mt-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Run NanoBot as a background service that starts automatically and
            survives reboots.
          </motion.p>
        </motion.div>

        {isUnsupported ? (
          /* Unsupported Platform */
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderLeft: '4px solid var(--terminal-amber)',
            }}
          >
            <div className="flex items-start gap-4">
              <AlertTriangle
                size={24}
                style={{ color: 'var(--terminal-amber)' }}
                className="shrink-0 mt-1"
              />
              <div>
                <h2
                  className="font-display font-semibold text-[28px]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Service management not available
                </h2>
                <p className="text-base mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Background services are only supported on Linux (systemd),
                  macOS (LaunchAgent), and Windows. Your current platform
                  doesn&apos;t support automatic service management.
                </p>
                <p
                  className="text-sm mt-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  You can still run NanoBot manually from the Process Manager.
                </p>
                <Button
                  className="mt-4"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                  }}
                  onClick={() => {
                    window.location.hash = '/process';
                  }}
                >
                  Go to Process Manager
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Platform Detection Banner */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
              className="rounded-lg p-4 flex items-start gap-3"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderLeft: '4px solid var(--terminal-cyan)',
              }}
            >
              <Monitor
                size={20}
                style={{ color: 'var(--terminal-cyan)' }}
                className="shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  Detected platform:{" "}
                  <span className="font-semibold">{platformData.label}</span>
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {platformData.manager}
                </p>
              </div>
            </motion.div>

            {/* Service Cards */}
            <div className="space-y-4">
              {Object.entries(services).map(([key, svc], idx) => {
                const badge = stateBadge(svc.state);
                const isAgent = key === 'agent';
                const isGateway = key === 'gateway';
                const showActions = svc.state === 'active';
                const isShaking = shakeCard === key;

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{
                      opacity: 1,
                      y: isShaking ? [0, -3, 3, -3, 3, 0] : 0,
                      scale: 1,
                    }}
                    transition={{
                      opacity: { duration: 0.4, delay: idx * 0.15 },
                      y: isShaking
                        ? { duration: 0.4, repeat: 0 }
                        : { duration: 0.4, delay: idx * 0.15 },
                      scale: { duration: 0.4, delay: idx * 0.15 },
                      ease: [0, 0, 0.2, 1] as [number, number, number, number],
                    }}
                    className="rounded-xl p-6 transition-all duration-300"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: `2px solid ${stateBorderColor(svc.state)}`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        '0 0 20px rgba(167, 139, 250, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        {isAgent && (
                          <Bot
                            size={28}
                            style={{ color: 'var(--accent)' }}
                          />
                        )}
                        {isGateway && (
                          <Globe
                            size={28}
                            style={{ color: 'var(--terminal-cyan)' }}
                          />
                        )}
                        <h3
                          className="font-semibold text-xl"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {svc.name}
                        </h3>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium ${badge.className}`}
                      >
                        {svc.state === 'enabling' || svc.state === 'disabling' ? (
                          <span className="flex items-center gap-1.5">
                            <RefreshCw size={12} className="animate-spin" />
                            {badge.label}
                          </span>
                        ) : (
                          badge.label
                        )}
                      </Badge>
                    </div>

                    {/* Description */}
                    <p
                      className="text-sm mt-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {svc.description}
                    </p>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                      {[
                        { label: 'Service Name', value: svc.serviceFile },
                        { label: 'Enabled', value: svc.enabled ? 'Yes' : 'No' },
                        { label: 'PID', value: svc.pid ?? '—' },
                        { label: 'Last Started', value: svc.lastStarted },
                        { label: 'Auto-start', value: svc.autoStart },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-md px-3.5 py-2.5"
                          style={{
                            backgroundColor: 'var(--bg-tertiary)',
                          }}
                        >
                          <p
                            className="text-[11px] uppercase tracking-wider font-medium"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {item.label}
                          </p>
                          <p
                            className="text-sm font-mono mt-0.5"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Toggle + Actions */}
                    <div className="flex items-center justify-between flex-wrap gap-4 mt-5 pt-4"
                      style={{ borderTop: '1px solid var(--border-color)' }}
                    >
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={
                            svc.state === 'active' || svc.state === 'enabling'
                          }
                          onCheckedChange={() => toggleService(key)}
                          disabled={
                            svc.state === 'enabling' || svc.state === 'disabling'
                          }
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Enable Service
                        </span>
                      </div>

                      <AnimatePresence>
                        {showActions && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{
                              duration: 0.3,
                              staggerChildren: 0.08,
                            }}
                            className="flex items-center gap-2"
                          >
                            <motion.button
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                              transition={{ duration: 0.2 }}
                              onClick={() => restartService(key)}
                              disabled={restarting[key]}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
                              style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                              }}
                            >
                              {restarting[key] ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <RefreshCw size={16} />
                              )}
                              Restart Service
                            </motion.button>

                            <motion.button
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                              transition={{ duration: 0.2, delay: 0.08 }}
                              onClick={() => setSelectedLogUnit(
                                isAgent ? 'nanobot-agent' : 'nanobot-gateway'
                              )}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
                              style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                              }}
                            >
                              <ScrollText size={16} />
                              View Service Log
                            </motion.button>

                            <motion.button
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                              transition={{ duration: 0.2, delay: 0.16 }}
                              onClick={() => openConfig(key)}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
                              style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                              }}
                            >
                              <Pencil size={16} />
                              Edit Service
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Service Log Terminal */}
            <ServiceLogTerminal
              logs={logs}
              selectedUnit={selectedLogUnit}
              onRefresh={refreshLogs}
              onClear={clearLogs}
              onExport={exportLogs}
            />
          </>
        )}
      </div>

      {/* Modals */}
      {configTarget && (
        <ServiceConfigModal
          open={configModalOpen}
          onClose={() => {
            setConfigModalOpen(false);
            setConfigTarget(null);
          }}
          service={services[configTarget]}
          onSave={saveConfig}
        />
      )}

      {disableTarget && (
        <DisableConfirmModal
          open={disableConfirmOpen}
          onClose={() => {
            setDisableConfirmOpen(false);
            setDisableTarget(null);
          }}
          onConfirm={confirmDisable}
          serviceName={services[disableTarget]?.name ?? ''}
        />
      )}
    </Layout>
  );
}
