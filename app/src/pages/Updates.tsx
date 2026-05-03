import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  CheckCircle2,
  ArrowUpCircle,
  ArrowRight,
  Download,
  ChevronDown,
  Github,
  Check,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  RotateCcw,
  GitBranch,
  Info,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReleaseCategory {
  type: 'features' | 'bugfixes' | 'improvements' | 'breaking' | 'docs';
  label: string;
  dotColor: string;
  items: { title: string; description: string }[];
}

interface Release {
  version: string;
  date: string;
  author: string;
  githubUrl: string;
  categories: ReleaseCategory[];
  contributors: number;
  isInstalled: boolean;
}

interface HistoryRow {
  id: number;
  date: string;
  fromVersion: string;
  toVersion: string;
  method: string;
  status: 'success' | 'failed';
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const CURRENT_VERSION = 'v2.4.1';
const LATEST_VERSION = 'v2.4.2';

const RELEASES: Release[] = [
  {
    version: 'v2.4.2',
    date: 'January 15, 2026',
    author: '@nanobot-team',
    githubUrl: 'https://github.com/nanobot-ai/nanobot/releases/tag/v2.4.2',
    isInstalled: false,
    contributors: 8,
    categories: [
      {
        type: 'features',
        label: 'New Features',
        dotColor: '#4ADE80',
        items: [
          {
            title: 'Multi-provider routing',
            description:
              'Route different conversations to different AI providers automatically based on model capability matching.',
          },
          {
            title: 'WebUI dark mode sync',
            description:
              'The WebUI now syncs its theme with the system preference and persists the choice across sessions.',
          },
          {
            title: 'Conversation branching',
            description:
              'Fork any message in a conversation to explore alternative response paths without losing context.',
          },
        ],
      },
      {
        type: 'bugfixes',
        label: 'Bug Fixes',
        dotColor: '#F87171',
        items: [
          {
            title: 'Memory leak in long-running sessions',
            description:
              'Fixed a memory leak that caused agent RAM usage to grow over multi-day sessions.',
          },
          {
            title: 'Gateway reconnection loop',
            description:
              'Resolved an issue where the WebSocket gateway would enter a rapid reconnect loop after network hiccups.',
          },
        ],
      },
      {
        type: 'improvements',
        label: 'Improvements',
        dotColor: '#22D3EE',
        items: [
          {
            title: 'Faster model warm-up',
            description:
              'Reduced initial model loading time by 35% through parallelized tokenizer initialization.',
          },
        ],
      },
    ],
  },
  {
    version: 'v2.4.1',
    date: 'January 10, 2026',
    author: '@nanobot-team',
    githubUrl: 'https://github.com/nanobot-ai/nanobot/releases/tag/v2.4.1',
    isInstalled: true,
    contributors: 5,
    categories: [
      {
        type: 'features',
        label: 'New Features',
        dotColor: '#4ADE80',
        items: [
          {
            title: 'Structured output mode',
            description:
              'Added support for OpenAI JSON mode and Anthropic structured outputs.',
          },
        ],
      },
      {
        type: 'bugfixes',
        label: 'Bug Fixes',
        dotColor: '#F87171',
        items: [
          {
            title: 'Config reload race condition',
            description:
              'Fixed a race condition when reloading configuration during active conversations.',
          },
        ],
      },
      {
        type: 'improvements',
        label: 'Improvements',
        dotColor: '#22D3EE',
        items: [
          {
            title: 'Reduced Docker image size',
            description: 'Slimmed the official Docker image from 1.2GB to 780MB.',
          },
        ],
      },
    ],
  },
  {
    version: 'v2.4.0',
    date: 'January 5, 2026',
    author: '@nanobot-team',
    githubUrl: 'https://github.com/nanobot-ai/nanobot/releases/tag/v2.4.0',
    isInstalled: false,
    contributors: 12,
    categories: [
      {
        type: 'features',
        label: 'New Features',
        dotColor: '#4ADE80',
        items: [
          {
            title: 'Agent tool calling',
            description:
              'NanoBot can now use external tools (web search, calculator, code execution) during conversations.',
          },
          {
            title: 'Plugin system v1',
            description:
              'Introduced a plugin architecture for extending NanoBot with custom capabilities.',
          },
        ],
      },
      {
        type: 'breaking',
        label: 'Breaking Changes',
        dotColor: '#FBBF24',
        items: [
          {
            title: 'Config schema v3',
            description:
              'The configuration file schema has been updated. Old configs will be auto-migrated on first boot.',
          },
        ],
      },
    ],
  },
  {
    version: 'v2.3.2',
    date: 'December 28, 2025',
    author: '@nanobot-team',
    githubUrl: 'https://github.com/nanobot-ai/nanobot/releases/tag/v2.3.2',
    isInstalled: false,
    contributors: 4,
    categories: [
      {
        type: 'bugfixes',
        label: 'Bug Fixes',
        dotColor: '#F87171',
        items: [
          {
            title: 'Slack channel message duplication',
            description:
              'Fixed duplicated message delivery in Slack channels with threaded replies.',
          },
        ],
      },
      {
        type: 'improvements',
        label: 'Improvements',
        dotColor: '#22D3EE',
        items: [
          {
            title: 'Better Ollama local model support',
            description:
              'Improved detection and fallback for local Ollama model endpoints.',
          },
        ],
      },
    ],
  },
];

const HISTORY: HistoryRow[] = [
  {
    id: 1,
    date: 'Jan 10, 2026',
    fromVersion: 'v2.4.0',
    toVersion: 'v2.4.1',
    method: 'PyPI',
    status: 'success',
  },
  {
    id: 2,
    date: 'Jan 5, 2026',
    fromVersion: 'v2.3.2',
    toVersion: 'v2.4.0',
    method: 'Source',
    status: 'success',
  },
  {
    id: 3,
    date: 'Dec 28, 2025',
    fromVersion: 'v2.3.1',
    toVersion: 'v2.3.2',
    method: 'PyPI',
    status: 'failed',
  },
];

const UPDATE_STEPS = [
  'Downloading update...',
  'Verifying checksum...',
  'Backing up configuration...',
  'Installing update...',
  'Restarting services...',
  'Cleaning up...',
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function VersionBanner({
  status,
  checking,
  onUpdate,
}: {
  status: 'uptodate' | 'available';
  checking: boolean;
  onUpdate: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: checking ? 0.5 : 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      className="rounded-xl p-8 relative overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderLeft:
          status === 'uptodate'
            ? '4px solid #4ADE80'
            : '4px solid #FBBF24',
        borderColor: 'var(--border-color)',
      }}
    >
      {checking && (
        <div className="absolute inset-0 flex items-center justify-center z-10"
          style={{ backgroundColor: 'rgba(13,17,23,0.6)' }}
        >
          <Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        {status === 'uptodate' ? (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
          >
            <CheckCircle2 size={40} style={{ color: '#4ADE80' }} />
          </motion.div>
        ) : (
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ArrowUpCircle size={40} style={{ color: '#FBBF24' }} />
          </motion.div>
        )}

        <div className="flex-1">
          <h2
            className="font-display font-semibold text-[28px]"
            style={{
              color: status === 'uptodate' ? '#4ADE80' : '#FBBF24',
            }}
          >
            {status === 'uptodate' ? "You're up to date!" : 'Update available'}
          </h2>
          <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
            {status === 'uptodate'
              ? `NanoBot ${CURRENT_VERSION} is the latest version.`
              : `NanoBot ${LATEST_VERSION} is ready to install.`}
          </p>

          {status === 'available' && (
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex items-center gap-3 mt-3"
            >
              <span
                className="font-mono text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Current: {CURRENT_VERSION}
              </span>
              <ArrowRight size={20} style={{ color: '#FBBF24' }} />
              <span
                className="font-mono text-sm"
                style={{ color: '#4ADE80' }}
              >
                Latest: {LATEST_VERSION}
              </span>
            </motion.div>
          )}
        </div>

        <div className="flex flex-col items-start md:items-end gap-3">
          {status === 'available' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <Button
                onClick={onUpdate}
                className="gap-2 text-base px-6 py-5 h-auto transition-all duration-200 hover:scale-[1.02]"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                }}
              >
                <Download size={18} />
                Update to {LATEST_VERSION}
              </Button>
              <p
                className="text-xs mt-2 text-center"
                style={{ color: 'var(--text-tertiary)' }}
              >
                3 new features, 2 bug fixes, 1 improvement
              </p>
            </motion.div>
          )}
          {status === 'uptodate' && (
            <Badge
              variant="outline"
              className="bg-green-500/15 text-green-400 border-green-500/20 text-xs"
            >
              Latest
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ReleaseNotes({ releases }: { releases: Release[] }) {
  const [activeTab, setActiveTab] = useState(releases[0].version);
  const activeRelease = releases.find((r) => r.version === activeTab)!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      className="rounded-xl p-6"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      <h2
        className="font-display font-semibold text-[28px] mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        Changelog
      </h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          className="mb-4 flex-wrap h-auto gap-1"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
          }}
        >
          {releases.map((rel) => (
            <TabsTrigger
              key={rel.version}
              value={rel.version}
              className="text-xs font-mono data-[state=active]:text-white transition-all"
              style={{
                color: 'var(--text-secondary)',
              }}
            >
              <span className="flex items-center gap-1.5">
                {rel.version}
                {rel.isInstalled && (
                  <Badge
                    variant="outline"
                    className="bg-green-500/15 text-green-400 border-green-500/20 text-[10px] px-1.5 py-0"
                  >
                    Installed
                  </Badge>
                )}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value={activeTab} key={activeTab} asChild>
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.3 }}
            >
              {/* Release header */}
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <h3
                    className="font-display font-bold text-[28px]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {activeRelease.version}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className="text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Released {activeRelease.date}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {activeRelease.author}
                    </span>
                  </div>
                </div>
                <a
                  href={activeRelease.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-80"
                  style={{ color: 'var(--terminal-cyan)' }}
                >
                  <Github size={16} />
                  View on GitHub
                </a>
              </div>

              {/* Categories */}
              <Accordion
                type="multiple"
                defaultValue={
                  activeRelease.categories
                    .filter((c) => c.type === 'breaking')
                    .map((c) => c.type)
                }
                className="space-y-2"
              >
                {activeRelease.categories.map((cat) => (
                  <AccordionItem
                    key={cat.type}
                    value={cat.type}
                    className="border-0 rounded-lg overflow-hidden"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                    }}
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline group">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.dotColor }}
                        />
                        <span
                          className="font-semibold text-lg"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {cat.label}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{
                            color: 'var(--text-tertiary)',
                            borderColor: 'var(--border-color)',
                          }}
                        >
                          {cat.items.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-0">
                        {cat.items.map((item, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: idx * 0.06,
                            }}
                            className="py-3"
                            style={{
                              borderBottom:
                                idx < cat.items.length - 1
                                  ? '1px solid var(--border-color)'
                                  : 'none',
                            }}
                          >
                            <p
                              className="text-sm font-semibold"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {item.title}
                            </p>
                            <p
                              className="text-sm mt-0.5"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {item.description}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* Contributors */}
              <div className="flex items-center gap-3 mt-5 pt-4"
                style={{ borderTop: '1px solid var(--border-color)' }}
              >
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold"
                      style={{
                        backgroundColor: `hsl(${250 + i * 30}, 60%, 60%)`,
                        borderColor: 'var(--bg-secondary)',
                        color: '#fff',
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  and {activeRelease.contributors} more contributors
                </span>
              </div>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </motion.div>
  );
}

function UpdateModal({
  open,
  onClose,
  currentVersion,
  targetVersion,
}: {
  open: boolean;
  onClose: () => void;
  currentVersion: string;
  targetVersion: string;
}) {
  const [phase, setPhase] = useState<'confirm' | 'progress' | 'success' | 'error'>('confirm');
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [backup, setBackup] = useState(true);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === 'progress') {
      setCurrentStep(0);
      setProgress(0);
      setTerminalLines([
        `$ nanobot update --target ${targetVersion}`,
        'Checking update manifest...',
      ]);

      const stepDuration = 1200;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        setCurrentStep(step);
        setProgress(Math.round((step / UPDATE_STEPS.length) * 100));

        // Add terminal lines
        const commands = [
          `Downloading ${targetVersion} from PyPI...`,
          'Verifying SHA-256 checksum... OK',
          backup ? 'Backing up ~/.nanobot/config.yaml... Done' : 'Skipping backup...',
          `Running pip install nanobot-ai==${targetVersion.slice(1)}...`,
          'Restarting nanobot-agent.service...',
          'Removing temporary files...',
        ];
        if (step <= commands.length) {
          setTerminalLines((prev) => [...prev, commands[step - 1]]);
        }

        if (step >= UPDATE_STEPS.length) {
          clearInterval(interval);
          // Simulate success
          setTimeout(() => {
            setTerminalLines((prev) => [...prev, 'Update completed successfully!']);
            setPhase('success');
          }, 500);
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }
  }, [phase, targetVersion, backup]);

  useEffect(() => {
    terminalRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  const reset = useCallback(() => {
    setPhase('confirm');
    setCurrentStep(0);
    setProgress(0);
    setTerminalLines([]);
    setErrorMessage('');
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setTimeout(reset, 300);
        }
      }}
    >
      <DialogContent
        className="max-w-[560px]"
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
            {phase === 'confirm' && `Update to ${targetVersion}`}
            {phase === 'progress' && 'Updating NanoBot...'}
            {phase === 'success' && 'Update Complete!'}
            {phase === 'error' && 'Update Failed'}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Confirm */}
          {phase === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div
                className="flex items-center justify-center gap-4 py-4"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                }}
              >
                <span
                  className="font-mono text-lg"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {currentVersion}
                </span>
                <ArrowRight size={24} style={{ color: 'var(--terminal-amber)' }} />
                <span
                  className="font-mono text-lg"
                  style={{ color: '#4ADE80' }}
                >
                  {targetVersion}
                </span>
              </div>

              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                This will download and install the latest version. Your
                configuration will be preserved.
              </p>

              <div
                className="flex items-start gap-2 rounded-lg p-3"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderLeft: '3px solid var(--terminal-amber)',
                }}
              >
                <AlertTriangle
                  size={16}
                  className="shrink-0 mt-0.5"
                  style={{ color: 'var(--terminal-amber)' }}
                />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  The agent will be restarted during the update.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="backup"
                  checked={backup}
                  onCheckedChange={(v) => setBackup(v === true)}
                />
                <label
                  htmlFor="backup"
                  className="text-sm"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Backup configuration before updating
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    setTimeout(reset, 300);
                  }}
                  style={{
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setPhase('progress')}
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                  }}
                >
                  Update Now
                </Button>
              </div>
            </motion.div>
          )}

          {/* Progress */}
          {phase === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <Progress value={progress} className="h-2" />
              <p
                className="text-xs text-right font-mono"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {progress}%
              </p>

              <div className="space-y-2">
                {UPDATE_STEPS.map((step, idx) => {
                  const done = idx < currentStep;
                  const active = idx === currentStep;
                  return (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: done
                            ? '#4ADE80'
                            : active
                            ? 'var(--accent)'
                            : 'var(--bg-tertiary)',
                        }}
                      >
                        {done ? (
                          <Check size={12} className="text-white" />
                        ) : active ? (
                          <Loader2 size={12} className="text-white animate-spin" />
                        ) : (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: 'var(--text-tertiary)',
                            }}
                          />
                        )}
                      </div>
                      <span
                        className="text-sm"
                        style={{
                          color: done
                            ? '#4ADE80'
                            : active
                            ? 'var(--text-primary)'
                            : 'var(--text-tertiary)',
                        }}
                      >
                        {step}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Terminal output */}
              <div
                className="rounded-lg overflow-hidden"
                style={{
                  backgroundColor: '#0C0C0C',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div
                  className="px-3 py-2 text-xs font-medium flex items-center gap-2"
                  style={{
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <FileText size={12} />
                  Terminal Output
                </div>
                <div
                  ref={terminalRef}
                  className="px-3 py-2 font-mono text-[12px] h-32 overflow-y-auto"
                  style={{ color: '#E6EDF3', lineHeight: 1.6 }}
                >
                  {terminalLines.map((line, i) => (
                    <div key={i} className="flex gap-2">
                      <span style={{ color: '#22D3EE' }}>$</span>
                      <span>{line}</span>
                    </div>
                  ))}
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                    style={{ color: '#22D3EE' }}
                  >
                    █
                  </motion.span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Success */}
          {phase === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
              className="flex flex-col items-center text-center space-y-4 py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(74,222,128,0.15)' }}
              >
                <CheckCircle2 size={32} style={{ color: '#4ADE80' }} />
              </motion.div>
              <div>
                <p
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Update complete!
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  NanoBot is now running {targetVersion}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    setTimeout(reset, 300);
                  }}
                  style={{
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Done
                </Button>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center space-y-4 py-4"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(248,113,113,0.15)' }}
              >
                <XCircle size={32} style={{ color: '#F87171' }} />
              </div>
              <div>
                <p
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Update failed
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {errorMessage || 'An unexpected error occurred during the update.'}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setPhase('progress')}
                  className="gap-2"
                  style={{
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <RotateCcw size={14} />
                  Retry
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    setTimeout(reset, 300);
                  }}
                  style={{
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function UpdateHistoryTable({ rows }: { rows: HistoryRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            {['Date', 'From', 'To', 'Method', 'Status', 'Actions'].map((h) => (
              <th
                key={h}
                className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <motion.tr
              key={row.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              style={{
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <td
                className="px-3 py-3 font-mono"
                style={{ color: 'var(--text-primary)' }}
              >
                {row.date}
              </td>
              <td
                className="px-3 py-3 font-mono"
                style={{ color: 'var(--text-secondary)' }}
              >
                {row.fromVersion}
              </td>
              <td
                className="px-3 py-3 font-mono"
                style={{ color: 'var(--text-primary)' }}
              >
                {row.toVersion}
              </td>
              <td
                className="px-3 py-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                {row.method}
              </td>
              <td className="px-3 py-3">
                {row.status === 'success' ? (
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: '#4ADE80' }}>
                    <CheckCircle2 size={14} />
                    Success
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: '#F87171' }}>
                    <XCircle size={14} />
                    Failed
                  </span>
                )}
              </td>
              <td className="px-3 py-3">
                <button
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--terminal-cyan)' }}
                >
                  <FileText size={12} />
                  View Log
                </button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function Updates() {
  const [updateStatus, setUpdateStatus] = useState<'uptodate' | 'available'>('available');
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState('2 hours ago');
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [channel, setChannel] = useState<'stable' | 'nightly'>('stable');
  const [showNightlyWarning, setShowNightlyWarning] = useState(false);

  const checkNow = useCallback(() => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setLastChecked('Just now');
      // For demo purposes, alternate between states
      setUpdateStatus((prev) => (prev === 'uptodate' ? 'available' : 'uptodate'));
    }, 2000);
  }, []);

  const handleUpdate = useCallback(() => {
    setUpdateModalOpen(true);
  }, []);

  const switchChannel = useCallback(
    (newChannel: 'stable' | 'nightly') => {
      setChannel(newChannel);
      setShowNightlyWarning(newChannel === 'nightly');
    },
    []
  );

  return (
    <Layout pageTitle="Update Manager">
      <div className="max-w-[960px] mx-auto space-y-6 pb-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <div>
            <h1
              className="font-display font-bold text-[36px] leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Update Manager
            </h1>
            <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
              Keep NanoBot up to date with the latest releases.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Last checked: {lastChecked}
            </span>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              onClick={checkNow}
              disabled={checking}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {checking ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Check Now
            </motion.button>
          </div>
        </motion.div>

        {/* Version Status Banner */}
        <VersionBanner
          status={updateStatus}
          checking={checking}
          onUpdate={handleUpdate}
        />

        {/* Changelog / Release Notes */}
        <ReleaseNotes releases={RELEASES} />

        {/* Update History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
          className="rounded-xl"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="w-full flex items-center justify-between p-6 text-left"
          >
            <h2
              className="font-display font-semibold text-[28px]"
              style={{ color: 'var(--text-primary)' }}
            >
              Update History
            </h2>
            <motion.div
              animate={{ rotate: historyExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={24} style={{ color: 'var(--text-secondary)' }} />
            </motion.div>
          </button>

          <AnimatePresence>
            {historyExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6">
                  <UpdateHistoryTable rows={HISTORY} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Branch Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <GitBranch size={16} style={{ color: 'var(--text-secondary)' }} />
            <span
              className="text-xs uppercase tracking-wider font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Channel
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={channel === 'nightly'}
                  onCheckedChange={(v) => switchChannel(v ? 'nightly' : 'stable')}
                />
                <div>
                  <span
                    className="text-sm font-medium block"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {channel === 'stable' ? 'Stable (main)' : 'Nightly'}
                  </span>
                  <span
                    className="text-xs block"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {channel === 'stable'
                      ? 'Recommended for most users.'
                      : 'Latest experimental features. May be unstable.'}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center gap-3 sm:ml-auto">
              <span
                className="text-xs font-mono"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Currently on: {channel === 'stable' ? 'main' : 'nightly'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  switchChannel(channel === 'stable' ? 'nightly' : 'stable')
                }
                style={{
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                Switch to {channel === 'stable' ? 'nightly' : 'stable'}
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {showNightlyWarning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div
                  className="mt-3 rounded-lg p-3 flex items-start gap-2"
                  style={{
                    backgroundColor: 'rgba(251,191,36,0.1)',
                    borderLeft: '3px solid var(--terminal-amber)',
                  }}
                >
                  <Info
                    size={14}
                    className="shrink-0 mt-0.5"
                    style={{ color: 'var(--terminal-amber)' }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: 'var(--terminal-amber)' }}
                  >
                    Nightly builds may contain bugs.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Update Modal */}
      <UpdateModal
        open={updateModalOpen}
        onClose={() => {
          setUpdateModalOpen(false);
          // After successful update, mark as up to date
          setUpdateStatus('uptodate');
          setLastChecked('Just now');
        }}
        currentVersion={CURRENT_VERSION}
        targetVersion={LATEST_VERSION}
      />
    </Layout>
  );
}
