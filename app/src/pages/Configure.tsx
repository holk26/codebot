import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '@/components/Layout'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  Bot,
  MessagesSquare,
  Brain,
  Shield,
  Plug,
  Clock,
  Globe,
  Sparkles,
  Save,
  RotateCcw,
  FileJson,
  Eye,
  EyeOff,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Trash2,
  Plus,
  Server,
  Radio,
  Zap,
  TestTube,
  AlertTriangle,
  Wand2,
  Terminal,
  ExternalLink,
  ChevronRight,
  Code2,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Color tokens from design.md (dark mode)                            */
/* ------------------------------------------------------------------ */
const C = {
  bgPrimary: '#0D1117',
  bgSecondary: '#161B22',
  bgTertiary: '#21262D',
  bgTerminal: '#0C0C0C',
  accent: '#A78BFA',
  accentHover: '#8B5CF6',
  accentGlow: 'rgba(167, 139, 250, 0.15)',
  terminalGreen: '#4ADE80',
  terminalCyan: '#22D3EE',
  terminalAmber: '#FBBF24',
  terminalRed: '#F87171',
  textPrimary: '#E6EDF3',
  textSecondary: '#8B949E',
  textTertiary: '#484F58',
  border: '#30363D',
  borderActive: '#A78BFA',
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ConfigState {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
  autoDetect: boolean
  temperature: number
  maxTokens: number
  channels: Record<string, { enabled: boolean; fields: Record<string, string> }>
  memoryEnabled: boolean
  tokenBudget: number
  compressionStrategy: string
  memoryDecay: boolean
  sandboxEnabled: boolean
  allowedPaths: string[]
  denyNetwork: boolean
  denyShell: boolean
  workspacePath: string
  accessMode: string
  allowSubdirs: boolean
  mcpServers: McpServer[]
  cronTasks: CronTask[]
  webuiEnabled: boolean
  gatewayPort: number
  startOnBoot: boolean
  devMode: boolean
  corsOrigins: string
}

interface McpServer {
  id: string
  name: string
  url: string
  authEnabled: boolean
  authHeaders: { key: string; value: string }[]
  command: string
  args: string
  expanded: boolean
}

interface CronTask {
  id: string
  schedule: string
  cronPreview: string
  command: string
  enabled: boolean
  nextRun: string
  lastRun: string
  lastResult: 'success' | 'fail'
}

const tabItems = [
  { id: 'provider', label: 'Provider & Model', icon: <Bot size={18} /> },
  { id: 'channels', label: 'Channels', icon: <MessagesSquare size={18} /> },
  { id: 'memory', label: 'Memory', icon: <Brain size={18} /> },
  { id: 'security', label: 'Security', icon: <Shield size={18} /> },
  { id: 'mcp', label: 'MCP', icon: <Plug size={18} /> },
  { id: 'cron', label: 'Cron', icon: <Clock size={18} /> },
  { id: 'webui', label: 'WebUI', icon: <Globe size={18} /> },
]

const providers = [
  { value: 'openrouter', label: 'OpenRouter', tagline: 'Recommended', recommended: true },
  { value: 'openai', label: 'OpenAI', tagline: 'Cloud' },
  { value: 'anthropic', label: 'Anthropic', tagline: 'Cloud' },
  { value: 'azure', label: 'Azure OpenAI', tagline: 'Cloud' },
  { value: 'deepseek', label: 'DeepSeek', tagline: 'Cloud' },
  { value: 'ollama', label: 'Ollama', tagline: 'Local' },
  { value: 'lmstudio', label: 'LM Studio', tagline: 'Local' },
  { value: 'vllm', label: 'vLLM', tagline: 'Local' },
  { value: 'bedrock', label: 'Amazon Bedrock', tagline: 'Enterprise' },
  { value: 'volcengine', label: 'VolcEngine', tagline: 'Enterprise' },
]

const channelDefs: Record<string, { fields: { key: string; label: string; placeholder: string }[] }> = {
  telegram: { fields: [{ key: 'token', label: 'Bot Token', placeholder: '123456:ABC-DEF...' }, { key: 'webhook', label: 'Webhook URL', placeholder: 'https://...' }] },
  discord: { fields: [{ key: 'token', label: 'Bot Token', placeholder: '' }, { key: 'guild', label: 'Guild ID', placeholder: '' }, { key: 'channel', label: 'Channel ID', placeholder: '' }] },
  slack: { fields: [{ key: 'token', label: 'Bot Token', placeholder: 'xoxb-...' }, { key: 'appToken', label: 'App Token', placeholder: 'xapp-...' }, { key: 'channel', label: 'Channel', placeholder: '#general' }] },
  websocket: { fields: [{ key: 'port', label: 'Port', placeholder: '8000' }] },
  email: { fields: [{ key: 'smtpServer', label: 'SMTP Server', placeholder: 'smtp.gmail.com' }, { key: 'smtpPort', label: 'SMTP Port', placeholder: '587' }, { key: 'username', label: 'Username', placeholder: '' }, { key: 'password', label: 'Password', placeholder: '' }, { key: 'from', label: 'From Address', placeholder: 'bot@example.com' }] },
  feishu: { fields: [{ key: 'token', label: 'App ID', placeholder: '' }, { key: 'secret', label: 'App Secret', placeholder: '' }] },
  whatsapp: { fields: [{ key: 'token', label: 'API Token', placeholder: '' }] },
  wechat: { fields: [{ key: 'appId', label: 'App ID', placeholder: '' }, { key: 'secret', label: 'App Secret', placeholder: '' }] },
  matrix: { fields: [{ key: 'homeserver', label: 'Homeserver URL', placeholder: 'https://matrix.org' }, { key: 'token', label: 'Access Token', placeholder: '' }] },
  qq: { fields: [{ key: 'appId', label: 'App ID', placeholder: '' }, { key: 'token', label: 'Token', placeholder: '' }] },
  wecom: { fields: [{ key: 'corpId', label: 'Corp ID', placeholder: '' }, { key: 'agentId', label: 'Agent ID', placeholder: '' }, { key: 'secret', label: 'Secret', placeholder: '' }] },
  dingtalk: { fields: [{ key: 'appKey', label: 'App Key', placeholder: '' }, { key: 'appSecret', label: 'App Secret', placeholder: '' }] },
  msteams: { fields: [{ key: 'appId', label: 'App ID', placeholder: '' }, { key: 'appPassword', label: 'App Password', placeholder: '' }] },
}

const channelNames = [
  'telegram', 'discord', 'slack', 'feishu', 'whatsapp',
  'wechat', 'matrix', 'email', 'qq', 'wecom', 'dingtalk', 'msteams', 'websocket',
]

const modelOptions: Record<string, string[]> = {
  openrouter: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-1.5-pro', 'meta-llama/llama-3-70b', 'mistralai/mistral-large'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  azure: ['gpt-4o', 'gpt-4', 'gpt-35-turbo'],
  deepseek: ['deepseek-chat', 'deepseek-coder'],
  ollama: ['llama3.1', 'qwen2.5', 'gemma2', 'phi4', 'mistral'],
  lmstudio: ['local-model'],
  vllm: ['local-model'],
  bedrock: ['anthropic.claude-3-5-sonnet-20241022-v2:0', 'amazon.nova-pro-v1:0'],
  volcengine: ['doubao-lite-4k', 'doubao-pro-4k'],
}

/* ------------------------------------------------------------------ */
/*  Helper components                                                    */
/* ------------------------------------------------------------------ */
function CardShell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      className={`rounded-xl border p-6 ${className}`}
      style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}
    >
      {children}
    </motion.div>
  )
}

function SectionHeader({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span style={{ color: C.accent }}>{icon}</span>
      <h3 className="text-xl font-semibold" style={{ color: C.textPrimary, fontFamily: 'Space Grotesk, sans-serif' }}>
        {title}
      </h3>
      {badge}
    </div>
  )
}

function ToggleRow({ label, description, checked, onCheckedChange }: { label: string; description?: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: C.textPrimary }}>{label}</p>
        {description && <p className="text-xs mt-1" style={{ color: C.textSecondary }}>{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium mb-1.5" style={{ color: C.textSecondary }}>{children}</label>
}

/* ------------------------------------------------------------------ */
/*  Live JSON Preview                                                    */
/* ------------------------------------------------------------------ */
function syntaxHighlight(json: string) {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(".*?")(\s*:\s*)/g, `<span style="color:${C.accent}">$1</span>$2`)
    .replace(/: (".*?")/g, `: <span style="color:${C.terminalGreen}">$1</span>`)
    .replace(/: (\d+(\.\d+)?|true|false|null)/g, `: <span style="color:${C.terminalCyan}">$1</span>`)
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                            */
/* ------------------------------------------------------------------ */
export default function Configure() {
  const [activeTab, setActiveTab] = useState('provider')
  const [dirty, setDirty] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [copyOk, setCopyOk] = useState(false)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [rawJsonOpen, setRawJsonOpen] = useState(false)

  const [config, setConfig] = useState<ConfigState>({
    provider: 'openrouter',
    apiKey: '',
    baseUrl: '',
    model: 'anthropic/claude-3.5-sonnet',
    autoDetect: true,
    temperature: 0.7,
    maxTokens: 4096,
    channels: Object.fromEntries(
      channelNames.map((c) => [c, { enabled: false, fields: {} }])
    ),
    memoryEnabled: false,
    tokenBudget: 4000,
    compressionStrategy: 'balanced',
    memoryDecay: false,
    sandboxEnabled: false,
    allowedPaths: ['/tmp', '/home/user'],
    denyNetwork: false,
    denyShell: false,
    workspacePath: '~/.nanobot/workspace',
    accessMode: 'read-write',
    allowSubdirs: true,
    mcpServers: [],
    cronTasks: [],
    webuiEnabled: false,
    gatewayPort: 8000,
    startOnBoot: false,
    devMode: false,
    corsOrigins: 'http://localhost:3000',
  })

  const updateConfig = useCallback(<K extends keyof ConfigState>(key: K, value: ConfigState[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }, [])

  const updateChannel = useCallback((name: string, patch: Partial<ConfigState['channels'][string]>) => {
    setConfig((prev) => ({
      ...prev,
      channels: { ...prev.channels, [name]: { ...prev.channels[name], ...patch } },
    }))
    setDirty(true)
  }, [])

  const updateChannelField = useCallback((name: string, field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [name]: { ...prev.channels[name], fields: { ...prev.channels[name].fields, [field]: value } },
      },
    }))
    setDirty(true)
  }, [])

  const addMcpServer = useCallback(() => {
    const id = crypto.randomUUID()
    setConfig((prev) => ({
      ...prev,
      mcpServers: [{ id, name: 'New Server', url: '', authEnabled: false, authHeaders: [], command: '', args: '', expanded: true }, ...prev.mcpServers],
    }))
    setDirty(true)
  }, [])

  const removeMcpServer = useCallback((id: string) => {
    setConfig((prev) => ({ ...prev, mcpServers: prev.mcpServers.filter((s) => s.id !== id) }))
    setDirty(true)
  }, [])

  const updateMcpServer = useCallback((id: string, patch: Partial<McpServer>) => {
    setConfig((prev) => ({
      ...prev,
      mcpServers: prev.mcpServers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
    setDirty(true)
  }, [])

  const addCronTask = useCallback(() => {
    const id = crypto.randomUUID()
    setConfig((prev) => ({
      ...prev,
      cronTasks: [
        ...prev.cronTasks,
        { id, schedule: 'every 30 minutes', cronPreview: '*/30 * * * *', command: '/status', enabled: true, nextRun: 'In 30 minutes', lastRun: 'Never', lastResult: 'success' },
      ],
    }))
    setDirty(true)
  }, [])

  const removeCronTask = useCallback((id: string) => {
    setConfig((prev) => ({ ...prev, cronTasks: prev.cronTasks.filter((t) => t.id !== id) }))
    setDirty(true)
  }, [])

  const updateCronTask = useCallback((id: string, patch: Partial<CronTask>) => {
    setConfig((prev) => ({
      ...prev,
      cronTasks: prev.cronTasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
    setDirty(true)
  }, [])

  const handleSave = useCallback(() => {
    setDirty(false)
  }, [])

  const handleReset = useCallback(() => {
    setResetDialogOpen(false)
    setDirty(false)
  }, [])

  const handleTestConnection = useCallback(() => {
    setConnectionStatus('testing')
    setTimeout(() => {
      setConnectionStatus(config.apiKey.length > 10 ? 'success' : 'error')
    }, 1500)
  }, [config.apiKey])

  const generatedJson = useMemo(() => {
    const obj = {
      provider: config.provider,
      api_key: config.apiKey || undefined,
      base_url: config.baseUrl || undefined,
      model: config.autoDetect ? undefined : config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      channels: Object.fromEntries(
        Object.entries(config.channels)
          .filter(([, v]) => v.enabled)
          .map(([k, v]) => [k, v.fields])
      ),
      memory: config.memoryEnabled
        ? {
            token_budget: config.tokenBudget,
            compression_strategy: config.compressionStrategy,
            decay: config.memoryDecay,
          }
        : undefined,
      security: {
        sandbox: config.sandboxEnabled
          ? {
              allowed_paths: config.allowedPaths,
              deny_network: config.denyNetwork,
              deny_shell: config.denyShell,
            }
          : undefined,
        workspace: {
          path: config.workspacePath,
          access_mode: config.accessMode,
          allow_subdirs: config.allowSubdirs,
        },
      },
      mcp: config.mcpServers.length > 0
        ? config.mcpServers.map((s) => ({
            name: s.name,
            url: s.url || undefined,
            command: s.command || undefined,
            args: s.args ? s.args.split(' ') : undefined,
            auth: s.authEnabled ? Object.fromEntries(s.authHeaders.map((h) => [h.key, h.value])) : undefined,
          }))
        : undefined,
      cron: config.cronTasks.length > 0
        ? config.cronTasks.map((t) => ({
            schedule: t.schedule,
            command: t.command,
            enabled: t.enabled,
          }))
        : undefined,
      webui: config.webuiEnabled
        ? {
            port: config.gatewayPort,
            start_on_boot: config.startOnBoot,
            dev_mode: config.devMode,
            cors_origins: config.corsOrigins.split(',').map((s) => s.trim()),
          }
        : undefined,
    }
    return JSON.stringify(obj, null, 2)
  }, [config])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedJson)
    setCopyOk(true)
    setTimeout(() => setCopyOk(false), 2000)
  }, [generatedJson])

  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                    */
  /* ---------------------------------------------------------------- */
  const tabContentVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  }

  return (
    <Layout pageTitle="Configuration">
      {/* Inject design tokens for this page */}
      <style>{`
        .config-slider [data-slot="slider-range"] { background-color: ${C.accent} !important; }
        .config-slider [data-slot="slider-thumb"] { border-color: ${C.accent} !important; }
        .config-tabs [data-state="active"] { background-color: ${C.accentGlow} !important; color: ${C.accent} !important; border-bottom: 2px solid ${C.accent} !important; }
        .config-tabs [data-slot="tabs-list"] { background-color: ${C.bgSecondary}; }
        .config-tabs [data-slot="tabs-trigger"] { border-radius: 6px; padding: 8px 16px; font-size: 14px; font-weight: 500; color: ${C.textSecondary}; }
        .config-tabs [data-slot="tabs-trigger"]:hover { color: ${C.textPrimary}; background-color: ${C.bgTertiary}; }
      `}</style>

      <div className="max-w-[1000px] mx-auto pb-8">
        {/* ---- Page Header ---- */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        >
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-h1 font-display font-bold" style={{ color: C.textPrimary, fontSize: '2.25rem', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                Configuration
              </h1>
              <AnimatePresence>
                {dirty && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <Badge
                      className="border rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ borderColor: `${C.terminalAmber}30`, backgroundColor: `${C.terminalAmber}15`, color: C.terminalAmber }}
                    >
                      <span className="relative flex h-2 w-2 mr-1.5">
                        <span className="animate-badge-pulse absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: C.terminalAmber }} />
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: C.terminalAmber }} />
                      </span>
                      Unsaved Changes
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="text-body mt-1" style={{ color: C.textSecondary }}>
              Manage your NanoBot settings visually. Changes are saved to <code className="font-mono text-xs" style={{ color: C.terminalCyan }}>~/.nanobot/config.json</code>.
            </p>
          </div>

          <motion.div
            className="flex items-center gap-2 shrink-0"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.08, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
          >
            <Button
              onClick={handleSave}
              disabled={!dirty}
              className="gap-2 rounded-lg text-sm font-medium"
              style={{
                height: '40px',
                padding: '0 20px',
                backgroundColor: dirty ? C.accent : C.bgTertiary,
                color: dirty ? '#fff' : C.textTertiary,
                border: 'none',
                opacity: dirty ? 1 : 0.5,
                cursor: dirty ? 'pointer' : 'not-allowed',
              }}
            >
              <Save size={16} />
              Save Changes
              {dirty && (
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-badge-pulse absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: C.terminalAmber }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: C.terminalAmber }} />
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(true)}
              className="gap-2 rounded-lg text-sm font-medium"
              style={{ height: '40px', padding: '0 16px', borderColor: C.border, color: C.terminalRed, backgroundColor: 'transparent' }}
            >
              <RotateCcw size={16} />
              Reset
            </Button>
            <Button
              variant="outline"
              onClick={() => setRawJsonOpen(true)}
              className="gap-2 rounded-lg text-sm font-medium"
              style={{ height: '40px', padding: '0 16px', borderColor: C.border, color: C.textSecondary, backgroundColor: 'transparent' }}
            >
              <FileJson size={16} />
              Open Config
            </Button>
          </motion.div>
        </motion.div>

        {/* ---- Tab Navigation ---- */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-6"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="config-tabs">
            <TabsList className="w-full flex overflow-x-auto gap-1 p-1 rounded-lg" style={{ backgroundColor: C.bgSecondary, border: `1px solid ${C.border}` }}>
              {tabItems.map((t) => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  {t.icon}
                  <span>{t.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ---- Provider & Model ---- */}
            <TabsContent value="provider" className="mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="provider"
                  variants={tabContentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <CardShell>
                    <SectionHeader icon={<Sparkles size={20} />} title="AI Provider" />
                    <div className="space-y-4">
                      <div>
                        <FieldLabel>Provider</FieldLabel>
                        <Select
                          value={config.provider}
                          onValueChange={(v) => updateConfig('provider', v)}
                        >
                          <SelectTrigger className="w-full" style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary, height: '40px' }}>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}>
                            {providers.map((p) => (
                              <SelectItem
                                key={p.value}
                                value={p.value}
                                className="flex items-center justify-between gap-3"
                              >
                                <span>{p.label}</span>
                                {p.recommended && (
                                  <Badge className="ml-2 text-xs" style={{ backgroundColor: C.accentGlow, color: C.accent, border: `1px solid ${C.accent}30` }}>
                                    Recommended
                                  </Badge>
                                )}
                                <span className="ml-auto text-xs" style={{ color: C.textTertiary }}>{p.tagline}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <FieldLabel>API Key</FieldLabel>
                        <div className="relative">
                          <Input
                            type={apiKeyVisible ? 'text' : 'password'}
                            placeholder="sk-..."
                            value={config.apiKey}
                            onChange={(e) => updateConfig('apiKey', e.target.value)}
                            className="pr-10"
                            style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary, height: '40px' }}
                          />
                          <button
                            onClick={() => setApiKeyVisible(!apiKeyVisible)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            style={{ color: C.textSecondary }}
                          >
                            {apiKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <p className="text-xs mt-1.5" style={{ color: C.textTertiary }}>
                          Your key is stored locally in <code className="font-mono" style={{ color: C.terminalCyan }}>~/.nanobot/config.json</code>
                        </p>
                        {config.apiKey.length > 10 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-1.5 mt-1.5"
                          >
                            <Check size={14} style={{ color: C.terminalGreen }} />
                            <span className="text-xs" style={{ color: C.terminalGreen }}>Valid-looking format</span>
                          </motion.div>
                        )}
                      </div>

                      <div>
                        <FieldLabel>Base URL (optional)</FieldLabel>
                        <Input
                          placeholder="https://api.example.com/v1"
                          value={config.baseUrl}
                          onChange={(e) => updateConfig('baseUrl', e.target.value)}
                          style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary, height: '40px' }}
                        />
                      </div>
                    </div>
                  </CardShell>

                  <CardShell>
                    <SectionHeader icon={<Bot size={20} />} title="Model" />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <ToggleRow
                          label="Auto-detect Model"
                          description="Let NanoBot pick the best model for your provider"
                          checked={config.autoDetect}
                          onCheckedChange={(v) => updateConfig('autoDetect', v)}
                        />
                      </div>

                      <AnimatePresence>
                        {!config.autoDetect && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <FieldLabel>Model</FieldLabel>
                            <Select value={config.model} onValueChange={(v) => updateConfig('model', v)}>
                              <SelectTrigger className="w-full" style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary, height: '40px' }}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}>
                                {(modelOptions[config.provider] || []).map((m) => (
                                  <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2 mt-2">
                              <Badge style={{ backgroundColor: `${C.terminalGreen}15`, color: C.terminalGreen, border: `1px solid ${C.terminalGreen}20` }}>Fast</Badge>
                              <Badge style={{ backgroundColor: `${C.terminalCyan}15`, color: C.terminalCyan, border: `1px solid ${C.terminalCyan}20` }}>Cheap</Badge>
                              <Badge style={{ backgroundColor: `${C.accentGlow}`, color: C.accent, border: `1px solid ${C.accent}30` }}>Powerful</Badge>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {config.autoDetect && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-2"
                        >
                          <Badge style={{ backgroundColor: `${C.terminalGreen}15`, color: C.terminalGreen, border: `1px solid ${C.terminalGreen}20` }}>
                            <Check size={12} className="mr-1" /> Auto-detected
                          </Badge>
                        </motion.div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <FieldLabel>Temperature</FieldLabel>
                          <span className="text-sm font-mono" style={{ color: C.accent }}>{config.temperature.toFixed(1)}</span>
                        </div>
                        <Slider
                          value={[config.temperature]}
                          min={0}
                          max={2}
                          step={0.1}
                          onValueChange={(v) => updateConfig('temperature', v[0])}
                          className="config-slider"
                        />
                        <div className="flex justify-between text-xs mt-1" style={{ color: C.textTertiary }}>
                          <span>Precise</span>
                          <span>Balanced</span>
                          <span>Creative</span>
                        </div>
                      </div>

                      <div>
                        <FieldLabel>Max Tokens</FieldLabel>
                        <Input
                          type="number"
                          value={config.maxTokens}
                          onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value) || 0)}
                          style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary, height: '40px' }}
                        />
                      </div>
                    </div>
                  </CardShell>

                  <CardShell>
                    <SectionHeader icon={<TestTube size={20} />} title="Connection Test" />
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={handleTestConnection}
                        disabled={connectionStatus === 'testing'}
                        className="gap-2 rounded-lg text-sm font-medium"
                        style={{
                          height: '36px',
                          padding: '0 16px',
                          backgroundColor: C.bgTertiary,
                          color: C.textPrimary,
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        {connectionStatus === 'testing' ? (
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          >
                            <Zap size={16} />
                          </motion.span>
                        ) : (
                          <Zap size={16} />
                        )}
                        Test Connection
                      </Button>
                      <AnimatePresence>
                        {connectionStatus === 'success' && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="flex items-center gap-2"
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.terminalGreen }} />
                            <span className="text-sm" style={{ color: C.terminalGreen }}>Connected — latency 145ms</span>
                          </motion.div>
                        )}
                        {connectionStatus === 'error' && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="flex items-center gap-2"
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.terminalRed }} />
                            <span className="text-sm" style={{ color: C.terminalRed }}>Connection failed — check your API key</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </CardShell>
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* ---- Channels ---- */}
            <TabsContent value="channels" className="mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="channels"
                  variants={tabContentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="space-y-3"
                >
                  {channelNames.map((name, i) => {
                    const ch = config.channels[name]
                    const def = channelDefs[name]
                    const expanded = ch.enabled
                    return (
                      <motion.div
                        key={name}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        className="rounded-xl border overflow-hidden"
                        style={{
                          backgroundColor: C.bgSecondary,
                          borderColor: expanded ? C.borderActive : C.border,
                          borderLeftWidth: expanded ? '3px' : '1px',
                          borderLeftColor: expanded ? C.accent : C.border,
                        }}
                      >
                        <div
                          className="flex items-center justify-between px-4 cursor-pointer"
                          style={{ height: expanded ? '56px' : '56px' }}
                          onClick={() => updateChannel(name, { enabled: !ch.enabled })}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex items-center justify-center rounded-lg w-8 h-8"
                              style={{ backgroundColor: C.accentGlow }}
                            >
                              <Radio size={16} style={{ color: C.accent }} />
                            </div>
                            <span className="text-sm font-medium capitalize" style={{ color: C.textPrimary }}>
                              {name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs" style={{ color: ch.enabled ? C.terminalGreen : C.textTertiary }}>
                              {ch.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <Switch checked={ch.enabled} onCheckedChange={(v) => updateChannel(name, { enabled: v })} />
                            {expanded ? <ChevronUp size={16} style={{ color: C.textSecondary }} /> : <ChevronDown size={16} style={{ color: C.textSecondary }} />}
                          </div>
                        </div>
                        <AnimatePresence>
                          {expanded && def && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-2 space-y-3">
                                {def.fields.map((field, fi) => (
                                  <motion.div
                                    key={field.key}
                                    initial={{ opacity: 0, x: 12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: fi * 0.05 }}
                                  >
                                    <FieldLabel>{field.label}</FieldLabel>
                                    <Input
                                      placeholder={field.placeholder}
                                      value={ch.fields[field.key] || ''}
                                      onChange={(e) => updateChannelField(name, field.key, e.target.value)}
                                      style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary, height: '40px' }}
                                    />
                                  </motion.div>
                                ))}
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.15 }}
                                >
                                  <Button
                                    variant="outline"
                                    className="gap-2 rounded-lg text-sm"
                                    style={{ borderColor: C.border, color: C.textSecondary, backgroundColor: 'transparent' }}
                                  >
                                    <TestTube size={14} /> Test Connection
                                  </Button>
                                </motion.div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* ---- Memory ---- */}
            <TabsContent value="memory" className="mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="memory"
                  variants={tabContentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <CardShell>
                    <ToggleRow
                      label="Two-Stage Memory (Dream)"
                      description="Enable Dream two-stage memory system. NanoBot will compress long conversations into memory tokens for better context awareness."
                      checked={config.memoryEnabled}
                      onCheckedChange={(v) => updateConfig('memoryEnabled', v)}
                    />
                    <AnimatePresence>
                      {config.memoryEnabled && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-5 pt-5 space-y-4" style={{ borderTop: `1px solid ${C.border}` }}>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <FieldLabel>Token Budget</FieldLabel>
                                <span className="text-sm font-mono" style={{ color: C.accent }}>{config.tokenBudget}</span>
                              </div>
                              <Slider
                                value={[config.tokenBudget]}
                                min={1000}
                                max={10000}
                                step={500}
                                onValueChange={(v) => updateConfig('tokenBudget', v[0])}
                                className="config-slider"
                              />
                            </div>
                            <div>
                              <FieldLabel>Compression Strategy</FieldLabel>
                              <Select value={config.compressionStrategy} onValueChange={(v) => updateConfig('compressionStrategy', v)}>
                                <SelectTrigger style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary, height: '40px' }}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}>
                                  <SelectItem value="balanced">Balanced</SelectItem>
                                  <SelectItem value="aggressive">Aggressive</SelectItem>
                                  <SelectItem value="minimal">Minimal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <ToggleRow
                              label="Memory Decay"
                              description="Forget older memories over time"
                              checked={config.memoryDecay}
                              onCheckedChange={(v) => updateConfig('memoryDecay', v)}
                            />
                            <div className="grid grid-cols-3 gap-3 mt-4">
                              {[
                                { label: 'Memory entries', value: '142', color: C.terminalCyan },
                                { label: 'Memory size', value: '23 KB', color: C.terminalGreen },
                                { label: 'Last compression', value: '2h ago', color: C.terminalAmber },
                              ].map((stat) => (
                                <div key={stat.label} className="rounded-lg p-3 text-center" style={{ backgroundColor: C.bgTertiary }}>
                                  <p className="text-lg font-mono font-medium" style={{ color: stat.color }}>{stat.value}</p>
                                  <p className="text-xs mt-1" style={{ color: C.textTertiary }}>{stat.label}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardShell>
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* ---- Security ---- */}
            <TabsContent value="security" className="mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="security"
                  variants={tabContentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <CardShell>
                    <SectionHeader icon={<Shield size={20} />} title="Sandbox" />
                    <ToggleRow
                      label="Enable Sandbox (bwrap)"
                      description="Run NanoBot in a restricted sandbox environment. Isolates filesystem access."
                      checked={config.sandboxEnabled}
                      onCheckedChange={(v) => updateConfig('sandboxEnabled', v)}
                    />
                    <p className="text-xs mt-2 flex items-center gap-1" style={{ color: C.textTertiary }}>
                      <Terminal size={12} /> Linux only — uses bubblewrap (bwrap)
                    </p>
                    <AnimatePresence>
                      {config.sandboxEnabled && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 space-y-4" style={{ borderTop: `1px solid ${C.border}` }}>
                            <div>
                              <FieldLabel>Allowed Paths</FieldLabel>
                              <div className="space-y-2">
                                {config.allowedPaths.map((path, i) => (
                                  <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="flex items-center gap-2"
                                  >
                                    <code className="flex-1 font-mono text-sm px-3 py-1.5 rounded-md" style={{ backgroundColor: C.bgTertiary, color: C.terminalCyan }}>
                                      {path}
                                    </code>
                                    <button
                                      onClick={() => updateConfig('allowedPaths', config.allowedPaths.filter((_, idx) => idx !== i))}
                                      className="p-1 rounded-md hover:opacity-80"
                                      style={{ color: C.terminalRed }}
                                    >
                                      <X size={14} />
                                    </button>
                                  </motion.div>
                                ))}
                                <Button
                                  variant="outline"
                                  className="gap-1 text-sm"
                                  style={{ borderColor: C.border, color: C.textSecondary }}
                                  onClick={() => updateConfig('allowedPaths', [...config.allowedPaths, '/new/path'])}
                                >
                                  <Plus size={14} /> Add Path
                                </Button>
                              </div>
                            </div>
                            <ToggleRow label="Deny Network Access" checked={config.denyNetwork} onCheckedChange={(v) => updateConfig('denyNetwork', v)} />
                            <ToggleRow label="Deny Shell Execution" checked={config.denyShell} onCheckedChange={(v) => updateConfig('denyShell', v)} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardShell>

                  <CardShell>
                    <SectionHeader icon={<Code2 size={20} />} title="Workspace" />
                    <div className="space-y-4">
                      <div>
                        <FieldLabel>Workspace Path</FieldLabel>
                        <div className="flex gap-2">
                          <Input
                            value={config.workspacePath}
                            onChange={(e) => updateConfig('workspacePath', e.target.value)}
                            style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary, height: '40px' }}
                          />
                          <Button
                            variant="outline"
                            className="shrink-0"
                            style={{ borderColor: C.border, color: C.textSecondary }}
                          >
                            Browse
                          </Button>
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Access Control</FieldLabel>
                        <div className="flex gap-2">
                          {['read-only', 'read-write'].map((mode) => (
                            <button
                              key={mode}
                              onClick={() => updateConfig('accessMode', mode)}
                              className="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all"
                              style={{
                                backgroundColor: config.accessMode === mode ? C.accentGlow : C.bgTertiary,
                                color: config.accessMode === mode ? C.accent : C.textSecondary,
                                border: `1px solid ${config.accessMode === mode ? C.accent : C.border}`,
                              }}
                            >
                              {mode === 'read-only' ? 'Read Only' : 'Read & Write'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <ToggleRow
                        label="Allow Subdirectories"
                        checked={config.allowSubdirs}
                        onCheckedChange={(v) => updateConfig('allowSubdirs', v)}
                      />
                    </div>
                  </CardShell>
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* ---- MCP ---- */}
            <TabsContent value="mcp" className="mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="mcp"
                  variants={tabContentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold" style={{ color: C.textPrimary, fontFamily: 'Space Grotesk, sans-serif' }}>MCP Servers</h3>
                    <Button
                      onClick={addMcpServer}
                      className="gap-2 rounded-lg text-sm"
                      style={{ backgroundColor: C.accent, color: '#fff' }}
                    >
                      <Plus size={16} /> Add Server
                    </Button>
                  </div>
                  <AnimatePresence>
                    {config.mcpServers.map((server) => (
                      <motion.div
                        key={server.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, x: -40, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-xl border p-5"
                        style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Server size={18} style={{ color: C.accent }} />
                            <Input
                              value={server.name}
                              onChange={(e) => updateMcpServer(server.id, { name: e.target.value })}
                              className="w-48 font-medium"
                              style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary }}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateMcpServer(server.id, { expanded: !server.expanded })}
                              className="p-1 rounded-md"
                              style={{ color: C.textSecondary }}
                            >
                              {server.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            <button
                              onClick={() => removeMcpServer(server.id)}
                              className="p-1 rounded-md"
                              style={{ color: C.terminalRed }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <AnimatePresence>
                          {server.expanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden space-y-3"
                            >
                              <div>
                                <FieldLabel>SSE Endpoint URL</FieldLabel>
                                <Input
                                  placeholder="http://localhost:3001/sse"
                                  value={server.url}
                                  onChange={(e) => updateMcpServer(server.id, { url: e.target.value })}
                                  style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary, height: '40px' }}
                                />
                              </div>
                              <div>
                                <FieldLabel>Command (alternative to URL)</FieldLabel>
                                <Input
                                  placeholder="npx"
                                  value={server.command}
                                  onChange={(e) => updateMcpServer(server.id, { command: e.target.value })}
                                  style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary, height: '40px' }}
                                />
                              </div>
                              <div>
                                <FieldLabel>Arguments</FieldLabel>
                                <Input
                                  placeholder="-y @modelcontextprotocol/server-filesystem /tmp"
                                  value={server.args}
                                  onChange={(e) => updateMcpServer(server.id, { args: e.target.value })}
                                  style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary, height: '40px' }}
                                />
                              </div>
                              <ToggleRow
                                label="Enable Authentication"
                                checked={server.authEnabled}
                                onCheckedChange={(v) => updateMcpServer(server.id, { authEnabled: v })}
                              />
                              <AnimatePresence>
                                {server.authEnabled && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden space-y-2"
                                  >
                                    {server.authHeaders.map((h, i) => (
                                      <div key={i} className="flex gap-2">
                                        <Input
                                          placeholder="Header Key"
                                          value={h.key}
                                          onChange={(e) => {
                                            const next = [...server.authHeaders]
                                            next[i] = { ...next[i], key: e.target.value }
                                            updateMcpServer(server.id, { authHeaders: next })
                                          }}
                                          style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary }}
                                        />
                                        <Input
                                          placeholder="Value"
                                          value={h.value}
                                          onChange={(e) => {
                                            const next = [...server.authHeaders]
                                            next[i] = { ...next[i], value: e.target.value }
                                            updateMcpServer(server.id, { authHeaders: next })
                                          }}
                                          style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary }}
                                        />
                                        <button
                                          onClick={() => updateMcpServer(server.id, { authHeaders: server.authHeaders.filter((_, idx) => idx !== i) })}
                                          style={{ color: C.terminalRed }}
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>
                                    ))}
                                    <Button
                                      variant="outline"
                                      className="gap-1 text-sm"
                                      style={{ borderColor: C.border, color: C.textSecondary }}
                                      onClick={() => updateMcpServer(server.id, { authHeaders: [...server.authHeaders, { key: '', value: '' }] })}
                                    >
                                      <Plus size={14} /> Add Header
                                    </Button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              <Button
                                variant="outline"
                                className="gap-2 text-sm mt-2"
                                style={{ borderColor: C.border, color: C.textSecondary }}
                              >
                                <TestTube size={14} /> Test Connection
                              </Button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {config.mcpServers.length === 0 && (
                    <div className="text-center py-12 rounded-xl border" style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}>
                      <Server size={40} className="mx-auto mb-3" style={{ color: C.textTertiary }} />
                      <p className="text-sm" style={{ color: C.textSecondary }}>No MCP servers configured yet.</p>
                      <Button
                        onClick={addMcpServer}
                        className="gap-2 mt-3"
                        style={{ backgroundColor: C.accent, color: '#fff' }}
                      >
                        <Plus size={16} /> Add First Server
                      </Button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* ---- Cron ---- */}
            <TabsContent value="cron" className="mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="cron"
                  variants={tabContentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold" style={{ color: C.textPrimary, fontFamily: 'Space Grotesk, sans-serif' }}>Scheduled Tasks</h3>
                    <Button
                      onClick={addCronTask}
                      className="gap-2 rounded-lg text-sm"
                      style={{ backgroundColor: C.accent, color: '#fff' }}
                    >
                      <Plus size={16} /> Add Task
                    </Button>
                  </div>
                  <AnimatePresence>
                    {config.cronTasks.map((task, i) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.3, delay: i * 0.03 }}
                        className="rounded-xl border p-5"
                        style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                              <FieldLabel>Schedule</FieldLabel>
                              <div className="flex items-center gap-2">
                                <Switch checked={task.enabled} onCheckedChange={(v) => updateCronTask(task.id, { enabled: v })} />
                                <button onClick={() => removeCronTask(task.id)} style={{ color: C.terminalRed }}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="relative">
                              <Wand2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.accent }} />
                              <Input
                                placeholder="every morning at 9am"
                                value={task.schedule}
                                onChange={(e) => updateCronTask(task.id, { schedule: e.target.value, cronPreview: '0 9 * * *' })}
                                className="pl-10"
                                style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary, height: '40px' }}
                              />
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Code2 size={12} style={{ color: C.textTertiary }} />
                              <code className="text-xs font-mono" style={{ color: C.terminalCyan }}>{task.cronPreview}</code>
                              <Check size={12} style={{ color: C.terminalGreen }} />
                            </div>
                          </div>
                          <div>
                            <FieldLabel>Command</FieldLabel>
                            <Input
                              value={task.command}
                              onChange={(e) => updateCronTask(task.id, { command: e.target.value })}
                              style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary, height: '40px' }}
                            />
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1 rounded-lg p-3" style={{ backgroundColor: C.bgTertiary }}>
                              <p className="text-xs" style={{ color: C.textTertiary }}>Next Run</p>
                              <p className="text-sm font-mono mt-0.5" style={{ color: C.terminalAmber }}>{task.nextRun}</p>
                            </div>
                            <div className="flex-1 rounded-lg p-3" style={{ backgroundColor: C.bgTertiary }}>
                              <p className="text-xs" style={{ color: C.textTertiary }}>Last Run</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: task.lastResult === 'success' ? C.terminalGreen : C.terminalRed }}
                                />
                                <p className="text-sm font-mono" style={{ color: C.textSecondary }}>{task.lastRun}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {config.cronTasks.length === 0 && (
                    <div className="text-center py-12 rounded-xl border" style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}>
                      <Clock size={40} className="mx-auto mb-3" style={{ color: C.textTertiary }} />
                      <p className="text-sm" style={{ color: C.textSecondary }}>No scheduled tasks yet.</p>
                      <Button
                        onClick={addCronTask}
                        className="gap-2 mt-3"
                        style={{ backgroundColor: C.accent, color: '#fff' }}
                      >
                        <Plus size={16} /> Add First Task
                      </Button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* ---- WebUI ---- */}
            <TabsContent value="webui" className="mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="webui"
                  variants={tabContentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <CardShell>
                    <ToggleRow
                      label="Enable WebSocket Channel"
                      description="Enable the WebSocket channel to connect the web-based UI."
                      checked={config.webuiEnabled}
                      onCheckedChange={(v) => updateConfig('webuiEnabled', v)}
                    />
                    <AnimatePresence>
                      {config.webuiEnabled && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-5 pt-5 space-y-4" style={{ borderTop: `1px solid ${C.border}` }}>
                            <div>
                              <FieldLabel>Gateway Port</FieldLabel>
                              <Input
                                type="number"
                                value={config.gatewayPort}
                                onChange={(e) => updateConfig('gatewayPort', parseInt(e.target.value) || 0)}
                                style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary, height: '40px' }}
                              />
                            </div>
                            <ToggleRow label="Start Gateway on Boot" checked={config.startOnBoot} onCheckedChange={(v) => updateConfig('startOnBoot', v)} />
                            <ToggleRow
                              label="Development Mode"
                              description="Enable hot-reload for WebUI development"
                              checked={config.devMode}
                              onCheckedChange={(v) => updateConfig('devMode', v)}
                            />
                            <AnimatePresence>
                              {config.devMode && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div
                                    className="rounded-lg p-3 font-mono text-sm"
                                    style={{ backgroundColor: C.bgTerminal, color: C.terminalGreen }}
                                  >
                                    <span style={{ color: C.textTertiary }}>$ </span>
                                    cd webui && bun install && bun run dev
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <div>
                              <FieldLabel>CORS Origins (comma-separated)</FieldLabel>
                              <Input
                                value={config.corsOrigins}
                                onChange={(e) => updateConfig('corsOrigins', e.target.value)}
                                style={{ backgroundColor: C.bgTertiary, borderColor: C.border, color: C.textPrimary, height: '40px' }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardShell>

                  <CardShell>
                    <SectionHeader icon={<Radio size={20} />} title="Current Status" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-lg p-3" style={{ backgroundColor: C.bgTertiary }}>
                        <p className="text-xs" style={{ color: C.textTertiary }}>Gateway</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: C.terminalGreen }} />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: C.terminalGreen }} />
                          </span>
                          <span className="text-sm font-medium" style={{ color: C.terminalGreen }}>Running on port {config.gatewayPort}</span>
                        </div>
                      </div>
                      <div className="rounded-lg p-3" style={{ backgroundColor: C.bgTertiary }}>
                        <p className="text-xs" style={{ color: C.textTertiary }}>WebUI URL</p>
                        <a
                          href={`http://localhost:${config.gatewayPort}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-mono inline-flex items-center gap-1 mt-1 hover:underline"
                          style={{ color: C.terminalCyan }}
                        >
                          http://localhost:{config.gatewayPort}
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      <div className="flex items-center">
                        <Button
                          variant="outline"
                          className="gap-2 w-full rounded-lg text-sm"
                          style={{ borderColor: C.border, color: C.textSecondary }}
                        >
                          <RotateCcw size={14} /> Restart Gateway
                        </Button>
                      </div>
                    </div>
                  </CardShell>
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* ---- Live Config Preview (Sticky Footer) ---- */}
      <motion.div
        className="sticky bottom-0 z-30 border-t"
        style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}
        initial={false}
        animate={{ height: showPreview ? 220 : 48 }}
        transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      >
        <div
          className="flex items-center justify-between px-4 cursor-pointer"
          style={{ height: '48px' }}
          onClick={() => setShowPreview(!showPreview)}
        >
          <div className="flex items-center gap-2">
            {showPreview ? <ChevronDown size={16} style={{ color: C.textSecondary }} /> : <ChevronRight size={16} style={{ color: C.textSecondary }} />}
            <span className="text-sm font-medium" style={{ color: C.textPrimary }}>Live Config Preview</span>
            <Badge className="text-xs" style={{ backgroundColor: C.accentGlow, color: C.accent, border: `1px solid ${C.accent}30` }}>
              {dirty ? 'Modified' : 'Saved'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy() }}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: C.textSecondary }}
              title="Copy JSON"
            >
              {copyOk ? <Check size={16} style={{ color: C.terminalGreen }} /> : <Copy size={16} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation() }}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: C.textSecondary }}
              title="Download JSON"
            >
              <Download size={16} />
            </button>
          </div>
        </div>
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 pb-4 overflow-hidden"
              style={{ height: '172px' }}
            >
              <div
                className="rounded-lg p-3 overflow-auto text-xs font-mono h-full"
                style={{ backgroundColor: C.bgTerminal, lineHeight: 1.6 }}
              >
                <pre dangerouslySetInnerHTML={{ __html: syntaxHighlight(generatedJson) }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ---- Reset Confirmation Dialog ---- */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent style={{ backgroundColor: C.bgSecondary, borderColor: C.border, color: C.textPrimary }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: C.textPrimary }}>
              <AlertTriangle size={18} style={{ color: C.terminalAmber }} />
              Reset to Defaults?
            </DialogTitle>
            <DialogDescription style={{ color: C.textSecondary }}>
              This will discard all your configuration changes and restore the default settings. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              style={{ borderColor: C.border, color: C.textSecondary }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReset}
              style={{ backgroundColor: C.terminalRed, color: '#fff' }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Raw JSON Dialog ---- */}
      <Dialog open={rawJsonOpen} onOpenChange={setRawJsonOpen}>
        <DialogContent style={{ backgroundColor: C.bgSecondary, borderColor: C.border, color: C.textPrimary, maxWidth: '700px' }}>
          <DialogHeader>
            <DialogTitle style={{ color: C.textPrimary }}>Raw Config JSON</DialogTitle>
          </DialogHeader>
          <div
            className="rounded-lg p-4 overflow-auto text-xs font-mono max-h-[60vh]"
            style={{ backgroundColor: C.bgTerminal, lineHeight: 1.6 }}
          >
            <pre dangerouslySetInnerHTML={{ __html: syntaxHighlight(generatedJson) }} />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRawJsonOpen(false)}
              style={{ borderColor: C.border, color: C.textSecondary }}
            >
              Close
            </Button>
            <Button
              onClick={handleCopy}
              className="gap-2"
              style={{ backgroundColor: C.accent, color: '#fff' }}
            >
              {copyOk ? <Check size={16} /> : <Copy size={16} />}
              {copyOk ? 'Copied!' : 'Copy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
