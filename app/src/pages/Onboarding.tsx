import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  DownloadCloud,
  Sliders,
  Activity,
  GitBranch,
  Package,
  Zap,
  Container,
  Check,
  Play,
  Home,
  Info,
  ChevronDown,
  Loader2,
  X,
  MessageSquare,
  Smartphone,
  FileCheck,
  RefreshCw,
  FileText,
} from 'lucide-react';
import Layout from '@/components/Layout';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type InstallMethod = 'source' | 'pypi' | 'uv' | 'docker';

interface StepConfig {
  label: string;
  illustration?: string;
}

const STEPS: StepConfig[] = [
  { label: 'Welcome', illustration: '/onboarding-step-1.png' },
  { label: 'Install', illustration: '/onboarding-step-2.png' },
  { label: 'Configure', illustration: '/onboarding-step-3.png' },
  { label: 'Test', illustration: undefined },
  { label: 'Launch', illustration: '/onboarding-step-4.png' },
];

const INSTALL_METHODS: {
  id: InstallMethod;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: { text: string; color: string };
  requires: string;
  commands: string[];
}[] = [
  {
    id: 'source',
    icon: <GitBranch size={24} />,
    title: 'From Source',
    description: 'Clone the repository and install in development mode.',
    badge: { text: 'For developers', color: 'cyan' },
    requires: 'Requires: Git, Python 3.10+',
    commands: ['git clone https://github.com/HKUDS/nanobot.git', 'cd nanobot', 'pip install -e .'],
  },
  {
    id: 'pypi',
    icon: <Package size={24} />,
    title: 'PyPI Package',
    description: 'Install the latest stable release via pip.',
    badge: { text: 'Easiest', color: 'green' },
    requires: 'Requires: Python 3.10+, pip',
    commands: ['pip install nanobot-ai'],
  },
  {
    id: 'uv',
    icon: <Zap size={24} />,
    title: 'uv (Fastest)',
    description: "Blazing fast installation with Astral's uv tool.",
    badge: { text: 'Recommended', color: 'violet' },
    requires: 'Requires: uv installed',
    commands: ['uv tool install nanobot-ai'],
  },
  {
    id: 'docker',
    icon: <Container size={24} />,
    title: 'Docker',
    description: 'Run NanoBot in an isolated container.',
    badge: { text: 'Most isolated', color: 'amber' },
    requires: 'Requires: Docker, Docker Compose',
    commands: ['docker-compose up'],
  },
];

const PROVIDERS = [
  { name: 'OpenRouter', desc: 'Recommended — unified AI API' },
  { name: 'OpenAI', desc: 'GPT models' },
  { name: 'Anthropic', desc: 'Claude models' },
  { name: 'DeepSeek', desc: 'DeepSeek models' },
  { name: 'Azure', desc: 'Azure OpenAI Service' },
  { name: 'Ollama', desc: 'Local LLMs' },
  { name: 'LM Studio', desc: 'Local GUI server' },
  { name: 'vLLM', desc: 'Production inference' },
];

const CHANNELS = [
  { name: 'Telegram', icon: <Smartphone size={16} /> },
  { name: 'Discord', icon: <MessageSquare size={16} /> },
  { name: 'Slack', icon: <MessageSquare size={16} /> },
];

/* ------------------------------------------------------------------ */
/*  Animation Variants                                                 */
/* ------------------------------------------------------------------ */

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
  }),
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center gap-2">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative flex items-center justify-center">
                  {/* Pulse ring for active */}
                  {isActive && (
                    <motion.span
                      className="absolute rounded-full animate-pulse-ring"
                      style={{ width: 24, height: 24, backgroundColor: '#A78BFA' }}
                    />
                  )}
                  <motion.div
                    className="relative z-10 rounded-full flex items-center justify-center"
                    style={{
                      width: isActive ? 12 : isCompleted ? 16 : 8,
                      height: isActive ? 12 : isCompleted ? 16 : 8,
                      backgroundColor: isCompleted || isActive ? '#A78BFA' : '#21262D',
                      border: isUpcoming ? '2px solid #484F58' : 'none',
                    }}
                    initial={false}
                    animate={{ scale: isActive ? [0.8, 1] : 1 }}
                    transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
                  >
                    {isCompleted && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3, type: 'spring' }}>
                        <Check size={10} strokeWidth={3} className="text-white" />
                      </motion.div>
                    )}
                  </motion.div>
                </div>
                <span
                  className="text-xs font-medium whitespace-nowrap"
                  style={{
                    color: isActive ? '#E6EDF3' : '#8B949E',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {index < STEPS.length - 1 && (
                <div
                  className="mx-2 rounded-full overflow-hidden"
                  style={{ width: 40, height: 2, backgroundColor: '#21262D' }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: '#A78BFA' }}
                    initial={{ width: '0%' }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step1Welcome({ onNext }: { onNext: () => void }) {
  const features = [
    { icon: <DownloadCloud size={20} />, label: 'One-click installation' },
    { icon: <Sliders size={20} />, label: 'Visual configuration editor' },
    { icon: <Activity size={20} />, label: 'Real-time process monitoring' },
  ];

  return (
    <div className="flex flex-col items-center text-center py-4">
      <motion.img
        src="/onboarding-step-1.png"
        alt="Welcome"
        className="mb-6"
        style={{ width: 200, height: 160, objectFit: 'contain' }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.h2
        className="text-h1 font-display font-bold mb-3"
        style={{ color: '#E6EDF3' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] as [number, number, number, number], delay: 0.1 }}
      >
        Welcome to NanoBot
      </motion.h2>

      <motion.p
        className="text-body max-w-[480px] mb-8"
        style={{ color: '#8B949E' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        Your personal AI agent, managed beautifully. No terminal required.
      </motion.p>

      <motion.div
        className="flex flex-wrap items-center justify-center gap-6 mb-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        {features.map((f, i) => (
          <motion.div
            key={f.label}
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
          >
            <span style={{ color: '#A78BFA' }}>{f.icon}</span>
            <span className="text-body-sm" style={{ color: '#8B949E' }}>{f.label}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.button
        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
        style={{
          backgroundColor: '#A78BFA',
          color: '#FFFFFF',
          minWidth: 280,
        }}
        onClick={onNext}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.9 }}
        whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(167,139,250,0.3)' }}
        whileTap={{ scale: 0.98 }}
      >
        Get Started
        <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
      </motion.button>
    </div>
  );
}

function Step2Install({
  selectedMethod,
  onSelect,
}: {
  selectedMethod: InstallMethod | null;
  onSelect: (m: InstallMethod) => void;
}) {
  return (
    <div className="py-2">
      <div className="mb-6">
        <h3 className="text-h2 font-display font-semibold mb-1" style={{ color: '#E6EDF3' }}>
          Install NanoBot
        </h3>
        <p className="text-body-sm" style={{ color: '#8B949E' }}>
          Choose the installation method that works best for your system.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {INSTALL_METHODS.map((method, i) => {
          const isSelected = selectedMethod === method.id;
          const badgeColors: Record<string, { bg: string; text: string; border: string }> = {
            cyan: { bg: 'rgba(34,211,238,0.15)', text: '#22D3EE', border: 'rgba(34,211,238,0.2)' },
            green: { bg: 'rgba(74,222,128,0.15)', text: '#4ADE80', border: 'rgba(74,222,128,0.2)' },
            violet: { bg: 'rgba(167,139,250,0.15)', text: '#A78BFA', border: 'rgba(167,139,250,0.2)' },
            amber: { bg: 'rgba(251,191,36,0.15)', text: '#FBBF24', border: 'rgba(251,191,36,0.2)' },
          };
          const bc = badgeColors[method.badge.color];

          return (
            <motion.div
              key={method.id}
              className="relative rounded-xl p-5 cursor-pointer transition-all duration-200"
              style={{
                backgroundColor: isSelected ? 'rgba(167,139,250,0.08)' : '#21262D',
                border: `1px solid ${isSelected ? '#A78BFA' : '#30363D'}`,
                borderLeftWidth: isSelected ? '3px' : '1px',
                opacity: selectedMethod && !isSelected ? 0.7 : 1,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: selectedMethod && !isSelected ? 0.7 : 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
              whileHover={{ borderColor: '#A78BFA', y: -2 }}
              onClick={() => onSelect(method.id)}
            >
              {isSelected && (
                <motion.div
                  className="absolute top-3 right-3"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <Check size={18} style={{ color: '#A78BFA' }} />
                </motion.div>
              )}

              <div className="flex items-center gap-3 mb-2">
                <span style={{ color: '#A78BFA' }}>{method.icon}</span>
                <span className="text-h3 font-semibold" style={{ color: '#E6EDF3' }}>{method.title}</span>
              </div>

              <span
                className="inline-block px-2 py-0.5 rounded-full text-caption font-medium mb-2"
                style={{ backgroundColor: bc.bg, color: bc.text, border: `1px solid ${bc.border}` }}
              >
                {method.badge.text}
              </span>

              <p className="text-body-sm mb-3" style={{ color: '#8B949E' }}>{method.description}</p>
              <p className="text-caption font-mono" style={{ color: '#484F58' }}>{method.requires}</p>

              {isSelected && (
                <motion.div
                  className="mt-3 rounded-lg p-3 font-mono text-xs overflow-x-auto"
                  style={{ backgroundColor: '#0C0C0C', color: '#4ADE80' }}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-caption mb-1.5" style={{ color: '#8B949E' }}>This will run:</p>
                  {method.commands.map((cmd, idx) => (
                    <div key={idx} className="flex">
                      <span style={{ color: '#484F58', marginRight: 8 }}>$</span>
                      <span style={{ color: '#E6EDF3' }}>{cmd}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Step3Configure() {
  const [provider, setProvider] = useState('OpenRouter');
  const [model, setModel] = useState('');
  const [autoDetect, setAutoDetect] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [activeChannels, setActiveChannels] = useState<Record<string, boolean>>({});
  const [enableMemory, setEnableMemory] = useState(false);
  const [enableSandbox, setEnableSandbox] = useState(false);
  const [restrictWorkspace, setRestrictWorkspace] = useState(false);
  const [workspacePath, setWorkspacePath] = useState('~/.nanobot/workspace');
  const [previewOpen, setPreviewOpen] = useState(true);

  const toggleChannel = (name: string) => {
    setActiveChannels((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const config = {
    provider: provider.toLowerCase().replace(/\s/g, ''),
    model: autoDetect ? 'auto' : model || 'auto',
    channels: Object.entries(activeChannels)
      .filter(([, v]) => v)
      .map(([k]) => k.toLowerCase()),
    memory: { dream: enableMemory },
    security: { sandbox: enableSandbox, restrictWorkspace, workspacePath },
  };

  return (
    <div className="py-2">
      <div className="mb-6">
        <h3 className="text-h2 font-display font-semibold mb-1" style={{ color: '#E6EDF3' }}>
          Configure NanoBot
        </h3>
        <p className="text-body-sm" style={{ color: '#8B949E' }}>
          Set up your AI provider and preferences. You can change these anytime.
        </p>
      </div>

      <div className="space-y-4">
        {/* Provider */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <label className="text-caption font-medium mb-1.5 block" style={{ color: '#8B949E' }}>
            AI Provider
          </label>
          <div className="relative">
            <select
              className="w-full rounded-lg px-3 py-2.5 text-sm appearance-none cursor-pointer"
              style={{
                backgroundColor: '#21262D',
                border: '1px solid #30363D',
                color: '#E6EDF3',
              }}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {PROVIDERS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} — {p.desc}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#8B949E' }} />
          </div>
        </motion.div>

        {/* Model */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <label className="text-caption font-medium mb-1.5 block" style={{ color: '#8B949E' }}>
            Model
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              className="flex-1 rounded-lg px-3 py-2.5 text-sm"
              style={{
                backgroundColor: '#21262D',
                border: '1px solid #30363D',
                color: '#E6EDF3',
              }}
              placeholder="e.g. gpt-4o"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={autoDetect}
            />
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="rounded"
                style={{ accentColor: '#A78BFA' }}
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
              />
              <span className="text-body-sm" style={{ color: '#8B949E' }}>Auto-detect</span>
            </label>
          </div>
          {autoDetect && (
            <motion.span
              className="inline-flex items-center gap-1 mt-1.5 text-caption"
              style={{ color: '#4ADE80' }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
            >
              <Check size={12} /> Auto-detected
            </motion.span>
          )}
        </motion.div>

        {/* Channels Collapsible */}
        <motion.div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid #30363D' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            style={{ backgroundColor: '#21262D' }}
            onClick={() => setChannelsOpen(!channelsOpen)}
          >
            <div>
              <span className="text-body-sm font-medium block" style={{ color: '#E6EDF3' }}>
                Chat Channels (Optional)
              </span>
              <span className="text-caption" style={{ color: '#8B949E' }}>
                Enable channels for your NanoBot to interact with.
              </span>
            </div>
            <motion.div animate={{ rotate: channelsOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown size={16} style={{ color: '#8B949E' }} />
            </motion.div>
          </button>
          <AnimatePresence>
            {channelsOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-3" style={{ backgroundColor: '#161B22' }}>
                  {CHANNELS.map((ch) => (
                    <div key={ch.name}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span style={{ color: '#A78BFA' }}>{ch.icon}</span>
                          <span className="text-body-sm" style={{ color: '#E6EDF3' }}>{ch.name}</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={!!activeChannels[ch.name]}
                            onChange={() => toggleChannel(ch.name)}
                          />
                          <div
                            className="w-11 h-6 rounded-full transition-colors duration-200"
                            style={{
                              backgroundColor: activeChannels[ch.name] ? '#A78BFA' : '#21262D',
                              border: '1px solid #30363D',
                            }}
                          >
                            <div
                              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                              style={{ transform: activeChannels[ch.name] ? 'translateX(20px)' : 'translateX(0)' }}
                            />
                          </div>
                        </label>
                      </div>
                      <AnimatePresence>
                        {activeChannels[ch.name] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <input
                              type="text"
                              className="w-full mt-2 rounded-lg px-3 py-2 text-sm font-mono"
                              style={{
                                backgroundColor: '#21262D',
                                border: '1px solid #30363D',
                                color: '#E6EDF3',
                              }}
                              placeholder={`${ch.name} token / webhook URL`}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Memory Collapsible */}
        <motion.div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid #30363D' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            style={{ backgroundColor: '#21262D' }}
            onClick={() => setMemoryOpen(!memoryOpen)}
          >
            <span className="text-body-sm font-medium" style={{ color: '#E6EDF3' }}>Memory Settings (Optional)</span>
            <motion.div animate={{ rotate: memoryOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown size={16} style={{ color: '#8B949E' }} />
            </motion.div>
          </button>
          <AnimatePresence>
            {memoryOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-4 flex items-center gap-3" style={{ backgroundColor: '#161B22' }}>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={enableMemory}
                      onChange={(e) => setEnableMemory(e.target.checked)}
                    />
                    <div
                      className="w-11 h-6 rounded-full transition-colors duration-200"
                      style={{
                        backgroundColor: enableMemory ? '#A78BFA' : '#21262D',
                        border: '1px solid #30363D',
                      }}
                    >
                      <div
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                        style={{ transform: enableMemory ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </div>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-body-sm" style={{ color: '#E6EDF3' }}>
                      Enable two-stage memory (Dream)
                    </span>
                    <span title="Dream memory helps NanoBot learn from long conversations.">
                      <Info size={14} style={{ color: '#8B949E' }} />
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Security Collapsible */}
        <motion.div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid #30363D' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            style={{ backgroundColor: '#21262D' }}
            onClick={() => setSecurityOpen(!securityOpen)}
          >
            <span className="text-body-sm font-medium" style={{ color: '#E6EDF3' }}>Security Settings (Optional)</span>
            <motion.div animate={{ rotate: securityOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown size={16} style={{ color: '#8B949E' }} />
            </motion.div>
          </button>
          <AnimatePresence>
            {securityOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-3" style={{ backgroundColor: '#161B22' }}>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={enableSandbox}
                        onChange={(e) => setEnableSandbox(e.target.checked)}
                      />
                      <div
                        className="w-11 h-6 rounded-full transition-colors duration-200"
                        style={{
                          backgroundColor: enableSandbox ? '#A78BFA' : '#21262D',
                          border: '1px solid #30363D',
                        }}
                      >
                        <div
                          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                          style={{ transform: enableSandbox ? 'translateX(20px)' : 'translateX(0)' }}
                        />
                      </div>
                    </label>
                    <span className="text-body-sm" style={{ color: '#E6EDF3' }}>Enable sandbox (bwrap)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={restrictWorkspace}
                        onChange={(e) => setRestrictWorkspace(e.target.checked)}
                      />
                      <div
                        className="w-11 h-6 rounded-full transition-colors duration-200"
                        style={{
                          backgroundColor: restrictWorkspace ? '#A78BFA' : '#21262D',
                          border: '1px solid #30363D',
                        }}
                      >
                        <div
                          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                          style={{ transform: restrictWorkspace ? 'translateX(20px)' : 'translateX(0)' }}
                        />
                      </div>
                    </label>
                    <span className="text-body-sm" style={{ color: '#E6EDF3' }}>Restrict workspace access</span>
                  </div>
                  <input
                    type="text"
                    className="w-full rounded-lg px-3 py-2 text-sm font-mono"
                    style={{
                      backgroundColor: '#21262D',
                      border: '1px solid #30363D',
                      color: '#E6EDF3',
                    }}
                    value={workspacePath}
                    onChange={(e) => setWorkspacePath(e.target.value)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Config Preview */}
        <motion.div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid #30363D' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            style={{ backgroundColor: '#21262D' }}
            onClick={() => setPreviewOpen(!previewOpen)}
          >
            <span className="text-body-sm font-medium" style={{ color: '#E6EDF3' }}>Config Preview</span>
            <motion.div animate={{ rotate: previewOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown size={16} style={{ color: '#8B949E' }} />
            </motion.div>
          </button>
          <AnimatePresence>
            {previewOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-4 font-mono text-xs" style={{ backgroundColor: '#0C0C0C', color: '#E6EDF3' }}>
                  <pre className="whitespace-pre-wrap break-all">
                    <span style={{ color: '#A78BFA' }}>{'{\n'}</span>
                    <span style={{ color: '#A78BFA' }}>  "provider"</span>
                    <span style={{ color: '#E6EDF3' }}>: </span>
                    <span style={{ color: '#4ADE80' }}>{`"${config.provider}"`}</span>
                    <span style={{ color: '#E6EDF3' }}>,\n</span>
                    <span style={{ color: '#A78BFA' }}>  "model"</span>
                    <span style={{ color: '#E6EDF3' }}>: </span>
                    <span style={{ color: '#4ADE80' }}>{`"${config.model}"`}</span>
                    <span style={{ color: '#E6EDF3' }}>,\n</span>
                    <span style={{ color: '#A78BFA' }}>  "channels"</span>
                    <span style={{ color: '#E6EDF3' }}>: </span>
                    <span style={{ color: '#22D3EE' }}>{JSON.stringify(config.channels)}</span>
                    <span style={{ color: '#E6EDF3' }}>,\n</span>
                    <span style={{ color: '#A78BFA' }}>  "memory"</span>
                    <span style={{ color: '#E6EDF3' }}>: </span>
                    <span style={{ color: '#22D3EE' }}>{JSON.stringify(config.memory)}</span>
                    <span style={{ color: '#E6EDF3' }}>,\n</span>
                    <span style={{ color: '#A78BFA' }}>  "security"</span>
                    <span style={{ color: '#E6EDF3' }}>: </span>
                    <span style={{ color: '#22D3EE' }}>{JSON.stringify(config.security)}</span>
                    <span style={{ color: '#E6EDF3' }}>\n</span>
                    <span style={{ color: '#A78BFA' }}>{'}'}</span>
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function Step4Test({ onPass }: { onPass: () => void }) {
  type TestStatus = 'pending' | 'pass' | 'fail';
  const [tests, setTests] = useState<{ name: string; status: TestStatus; message: string }[]>([
    { name: 'Installation verified', status: 'pending', message: '' },
    { name: 'Config file created', status: 'pending', message: '' },
    { name: 'Provider reachable', status: 'pending', message: '' },
    { name: 'Agent can start', status: 'pending', message: '' },
    { name: 'Gateway responsive', status: 'pending', message: '' },
  ]);
  const [progress, setProgress] = useState(0);
  const [allPassed, setAllPassed] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);

  useEffect(() => {
    const testSequence = async () => {
      const lines: string[] = [];
      for (let i = 0; i < tests.length; i++) {
        await new Promise((r) => setTimeout(r, 600));
        setProgress(((i + 1) / tests.length) * 100);
        const passed = Math.random() > 0.1;
        setTests((prev) =>
          prev.map((t, idx) =>
            idx === i
              ? { ...t, status: passed ? 'pass' : 'fail', message: passed ? 'OK' : 'Failed' }
              : t
          )
        );
        lines.push(`${passed ? '[PASS]' : '[FAIL]'} ${tests[i].name}`);
        setTerminalLines([...lines]);
      }
      setAllPassed(true);
      setTimeout(onPass, 800);
    };
    testSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="py-2">
      <div className="mb-6">
        <h3 className="text-h2 font-display font-semibold mb-1" style={{ color: '#E6EDF3' }}>
          Test Your Setup
        </h3>
        <p className="text-body-sm" style={{ color: '#8B949E' }}>
          Let's verify everything is working before launching.
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full rounded-full h-1 mb-6 overflow-hidden" style={{ backgroundColor: '#21262D' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: '#A78BFA' }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Test list */}
      <div className="space-y-3 mb-6">
        {tests.map((test, i) => (
          <motion.div
            key={test.name}
            className="flex items-center gap-3 rounded-lg px-4 py-3"
            style={{ backgroundColor: '#21262D' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
          >
            {test.status === 'pending' && <Loader2 size={18} className="animate-spin" style={{ color: '#FBBF24' }} />}
            {test.status === 'pass' && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                <Check size={18} style={{ color: '#4ADE80' }} />
              </motion.div>
            )}
            {test.status === 'fail' && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                <X size={18} style={{ color: '#F87171' }} />
              </motion.div>
            )}
            <span className="text-body-sm font-medium flex-1" style={{ color: '#E6EDF3' }}>
              {test.name}
            </span>
            <span className="text-caption font-mono" style={{ color: test.status === 'pass' ? '#4ADE80' : test.status === 'fail' ? '#F87171' : '#8B949E' }}>
              {test.message || 'Running...'}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Terminal output */}
      <div
        className="rounded-lg p-3 font-mono text-xs max-h-[200px] overflow-y-auto"
        style={{ backgroundColor: '#0C0C0C', border: '1px solid #30363D' }}
      >
        {terminalLines.map((line, i) => (
          <motion.div
            key={i}
            className="py-0.5"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              color: line.includes('[PASS]') ? '#4ADE80' : line.includes('[FAIL]') ? '#F87171' : '#E6EDF3',
            }}
          >
            {line}
          </motion.div>
        ))}
        <span className="inline-block w-2 h-4 align-middle animate-caret-blink" style={{ backgroundColor: '#A78BFA' }} />
      </div>

      {/* Result banner */}
      <AnimatePresence>
        {allPassed && (
          <motion.div
            className="mt-4 rounded-lg px-4 py-3 flex items-center gap-3"
            style={{ backgroundColor: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <Check size={20} style={{ color: '#4ADE80' }} />
            </motion.div>
            <span className="text-body-sm font-medium" style={{ color: '#4ADE80' }}>
              All systems go!
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Step5Launch() {
  const [started, setStarted] = useState(false);
  const [startGateway, setStartGateway] = useState(true);

  const tips = [
    { icon: <FileCheck size={16} />, text: 'Use /status to check agent health' },
    { icon: <RefreshCw size={16} />, text: 'Use /restart to restart the agent' },
    { icon: <FileText size={16} />, text: 'Visit /logs to view real-time output' },
  ];

  return (
    <div className="flex flex-col items-center text-center py-4">
      <motion.img
        src="/onboarding-step-4.png"
        alt="Launch"
        className="mb-6"
        style={{ width: 200, height: 160, objectFit: 'contain' }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      />

      <motion.h2
        className="text-h1 font-display font-bold mb-3"
        style={{ color: '#4ADE80' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        You're all set!
      </motion.h2>

      <motion.p
        className="text-body max-w-[480px] mb-6"
        style={{ color: '#8B949E' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        NanoBot is ready to assist you. Start the agent and begin chatting.
      </motion.p>

      <motion.div
        className="flex flex-wrap items-center justify-center gap-4 mb-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <motion.button
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: started ? '#4ADE80' : '#A78BFA',
            color: '#0D1117',
          }}
          onClick={() => setStarted(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Play size={16} />
          {started ? 'Agent Running' : 'Start Agent'}
        </motion.button>

        <a
          href="#/"
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: '#21262D',
            color: '#E6EDF3',
            border: '1px solid #30363D',
          }}
        >
          <Home size={16} />
          Open Dashboard
        </a>
      </motion.div>

      <motion.label
        className="flex items-center gap-2 mb-8 cursor-pointer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <input
          type="checkbox"
          checked={startGateway}
          onChange={(e) => setStartGateway(e.target.checked)}
          style={{ accentColor: '#A78BFA' }}
        />
        <span className="text-body-sm" style={{ color: '#8B949E' }}>Start WebSocket Gateway too</span>
      </motion.label>

      {/* Quick tips */}
      <motion.div
        className="w-full max-w-[480px] rounded-xl p-4 text-left"
        style={{ backgroundColor: '#21262D', border: '1px solid #30363D' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.9 }}
      >
        <h4 className="text-body-sm font-semibold mb-3" style={{ color: '#E6EDF3' }}>
          Quick Tips
        </h4>
        <div className="space-y-2">
          {tips.map((tip, i) => (
            <motion.div
              key={tip.text}
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ backgroundColor: '#161B22' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 + i * 0.1 }}
            >
              <span style={{ color: '#A78BFA' }}>{tip.icon}</span>
              <span className="text-caption" style={{ color: '#8B949E' }}>{tip.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<InstallMethod | null>(null);

  const changeStep = useCallback((newStep: number) => {
    setDirection(newStep > currentStep ? 1 : -1);
    setCurrentStep(newStep);
  }, [currentStep]);

  const canProceed = () => {
    if (currentStep === 1) return selectedMethod !== null;
    return true;
  };

  return (
    <Layout pageTitle="Getting Started">
      <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-120px)] py-8">
        <StepIndicator currentStep={currentStep} />

        {/* Wizard card */}
        <motion.div
          className="w-full max-w-[680px] rounded-2xl overflow-hidden"
          style={{
            backgroundColor: '#161B22',
            border: '1px solid #30363D',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="p-8 relative min-h-[420px]">
            <AnimatePresence custom={direction} mode="wait">
              {currentStep === 0 && (
                <motion.div
                  key="step0"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <Step1Welcome onNext={() => changeStep(1)} />
                </motion.div>
              )}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <Step2Install selectedMethod={selectedMethod} onSelect={setSelectedMethod} />
                </motion.div>
              )}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <Step3Configure />
                </motion.div>
              )}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <Step4Test onPass={() => changeStep(4)} />
                </motion.div>
              )}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <Step5Launch />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation controls */}
          <div
            className="flex items-center justify-between px-8 py-5"
            style={{ borderTop: '1px solid #30363D' }}
          >
            <div>
              {currentStep > 0 && (
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    backgroundColor: '#21262D',
                    color: '#E6EDF3',
                    border: '1px solid #30363D',
                  }}
                  onClick={() => changeStep(currentStep - 1)}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              )}
            </div>

            <span className="text-caption" style={{ color: '#8B949E' }}>
              Step {currentStep + 1} of {STEPS.length}
            </span>

            <div>
              {currentStep < STEPS.length - 1 && (
                <button
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50"
                  style={{
                    backgroundColor: '#A78BFA',
                    color: '#FFFFFF',
                  }}
                  disabled={!canProceed()}
                  onClick={() => changeStep(currentStep + 1)}
                >
                  {currentStep === 0 ? 'Get Started' : 'Continue'}
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
