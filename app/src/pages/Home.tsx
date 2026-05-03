import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Radio,
  HeartPulse,
  Tag,
  ScrollText,
  ArrowUpCircle,
  Terminal,
  DownloadCloud,
  Sliders,
  Cpu,
  FileText,
  Settings2,
  GitPullRequest,
  AlertTriangle,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useHealth, useStats } from '@/hooks/useDashboard';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function useGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function AnimatedNumber({ value, suffix = '' }: { value: number | string; suffix?: string }) {
  const [display, setDisplay] = useState('0');
  const numeric = typeof value === 'string' ? parseFloat(value) || 0 : value;

  useEffect(() => {
    let start = 0;
    const duration = 600;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (numeric - start) * eased);
      setDisplay(String(current));
      if (progress < 1) requestAnimationFrame(tick);
    }

    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [numeric]);

  return <>{display}{suffix}</>;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function WelcomeBanner({ uptime, status }: { uptime: string; status: string }) {
  const greeting = useGreeting();
  const isOnline = status === 'ok';

  return (
    <motion.div
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
    >
      <div>
        <h2
          className="text-h2 font-display font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {greeting}
        </h2>
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Panel de control de Codebot
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          <span
            className="w-8 h-8 rounded-full animate-pulse-ring"
            style={{ backgroundColor: isOnline ? 'var(--terminal-green)' : 'var(--terminal-red)', position: 'absolute' }}
          />
          <span
            className="relative w-4 h-4 rounded-full"
            style={{ backgroundColor: isOnline ? 'var(--terminal-green)' : 'var(--terminal-red)' }}
          />
        </div>
        <div className="text-right">
          <p className="text-sm font-medium" style={{ color: isOnline ? 'var(--terminal-green)' : 'var(--terminal-red)' }}>
            {isOnline ? 'Agent Online' : 'Degraded'}
          </p>
          <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            Uptime: {uptime}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueColor,
  subtext,
  sparklineData,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueColor: string;
  subtext: string;
  sparklineData?: { v: number }[];
  delay: number;
}) {
  const isNumeric = typeof value === 'number' || !isNaN(parseFloat(String(value)));
  const suffix = String(value).replace(/[0-9.]/g, '');
  const numericVal = isNumeric ? parseFloat(String(value)) : 0;

  return (
    <motion.div
      className="rounded-xl p-5 transition-all duration-200"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        ease: [0, 0, 0.2, 1] as [number, number, number, number],
        delay,
      }}
      whileHover={{
        borderColor: 'var(--accent)',
        boxShadow: '0 0 20px var(--accent-glow)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>
        <span className="text-caption font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </div>
      <div
        className="text-h2 font-display font-semibold mb-1"
        style={{ color: valueColor }}
      >
        {isNumeric ? <AnimatedNumber value={numericVal} suffix={suffix} /> : value}
      </div>
      {sparklineData && (
        <div className="mb-2" style={{ width: 60, height: 24 }}>
          <ResponsiveContainer width={60} height={24}>
            <LineChart data={sparklineData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={valueColor}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
        {subtext}
      </p>
    </motion.div>
  );
}

function SystemStats({ stats }: { stats: ReturnType<typeof useStats>['stats'] }) {
  const memorySparkline = useMemo(() => [
    { v: 30 }, { v: 35 }, { v: 32 }, { v: 40 }, { v: 38 }, { v: 42 }, { v: 45 }, { v: 42 },
  ], []);

  const memoryPercent = stats?.memory.percent ?? 0;
  const memorySub = stats ? `${stats.memory.used_gb} GB / ${stats.memory.total_gb} GB` : '—';
  const provider = stats?.config.provider ?? '—';
  const model = stats?.config.model ?? '—';
  const version = stats?.version ?? '1.0.0';
  const queuePending = stats?.queue.pending ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        icon={<Brain size={18} />}
        label="Memoria"
        value={`${memoryPercent}%`}
        valueColor="var(--accent)"
        subtext={memorySub}
        sparklineData={memorySparkline}
        delay={0}
      />
      <StatCard
        icon={<Radio size={18} />}
        label="Tareas Pendientes"
        value={queuePending}
        valueColor="var(--terminal-cyan)"
        subtext="En cola Redis"
        delay={0.08}
      />
      <StatCard
        icon={<HeartPulse size={18} />}
        label="Proveedor"
        value={provider.charAt(0).toUpperCase() + provider.slice(1)}
        valueColor="var(--terminal-green)"
        subtext={model}
        delay={0.16}
      />
      <StatCard
        icon={<Tag size={18} />}
        label="Versión"
        value={`v${version}`}
        valueColor="var(--text-primary)"
        subtext={stats?.config.repo ?? 'Codebot'}
        delay={0.24}
      />
    </div>
  );
}

function QuickActions() {
  const actions = [
    { icon: <ScrollText size={18} />, label: 'Ver Logs', variant: 'secondary' as const, to: '/logs' },
    { icon: <ArrowUpCircle size={18} />, label: 'Check Updates', variant: 'secondary' as const, to: '/updates' },
    { icon: <Terminal size={18} />, label: 'Open Terminal', variant: 'secondary' as const },
  ];

  return (
    <motion.div
      className="flex flex-wrap gap-3 mb-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: [0, 0, 0.2, 1] as [number, number, number, number],
        delay: 0.4,
      }}
    >
      {actions.map((action) => {
        const btn = (
          <motion.button
            className="flex items-center gap-2 px-5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              height: '40px',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            {action.icon}
            {action.label}
          </motion.button>
        );

        return action.to ? (
          <Link key={action.label} to={action.to}>
            {btn}
          </Link>
        ) : (
          <span key={action.label}>{btn}</span>
        );
      })}
    </motion.div>
  );
}

function ManagementCard({
  icon,
  title,
  description,
  badge,
  badgeColor,
  badgePulse = false,
  actionLabel,
  actionTo,
  previewLines,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  badgePulse?: boolean;
  actionLabel: string;
  actionTo: string;
  previewLines?: string[];
  delay: number;
}) {
  return (
    <motion.div
      className="rounded-xl p-6 transition-all duration-250 flex flex-col"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        minHeight: '280px',
      }}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        ease: [0, 0, 0.2, 1] as [number, number, number, number],
        delay,
      }}
      whileHover={{
        y: -4,
        borderColor: 'var(--accent)',
        boxShadow: '0 4px 24px var(--accent-glow)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--accent-glow)' }}
        >
          <span style={{ color: 'var(--accent)' }}>{icon}</span>
        </div>
        <div className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border">
          {badgePulse && (
            <span
              className="w-1.5 h-1.5 rounded-full animate-badge-pulse"
              style={{ backgroundColor: badgeColor }}
            />
          )}
          <span style={{ color: badgeColor }}>{badge}</span>
        </div>
      </div>

      <h3
        className="text-h3 font-semibold mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h3>
      <p className="text-body-sm mb-4 flex-1" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>

      {previewLines && (
        <div className="mb-4 font-mono text-xs space-y-1" style={{ color: 'var(--text-tertiary)' }}>
          {previewLines.map((line, i) => (
            <p key={i} className="truncate">{line}</p>
          ))}
        </div>
      )}

      <Link to={actionTo} className="mt-auto">
        <motion.button
          className="w-full flex items-center justify-center gap-2 px-4 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            height: '40px',
            backgroundColor: 'var(--accent)',
            color: '#fff',
          }}
          whileHover={{
            backgroundColor: 'var(--accent-hover)',
            scale: 1.02,
          }}
          whileTap={{ scale: 0.98 }}
        >
          {actionLabel}
        </motion.button>
      </Link>
    </motion.div>
  );
}

function ManagementCards() {
  const cards = [
    {
      icon: <DownloadCloud size={28} />,
      title: 'Instalación',
      description: 'Instala o reinstala NanoBot con un clic. Elige entre source, PyPI, Docker o uv.',
      badge: 'Docker',
      badgeColor: 'var(--terminal-green)',
      actionLabel: 'Gestionar',
      actionTo: '/install',
    },
    {
      icon: <Sliders size={28} />,
      title: 'Configuración',
      description: 'Configura tu proveedor AI, modelo, canales, memoria y seguridad.',
      badge: 'Editar',
      badgeColor: 'var(--terminal-amber)',
      actionLabel: 'Configurar',
      actionTo: '/configure',
    },
    {
      icon: <Cpu size={28} />,
      title: 'Procesos',
      description: 'Monitorea y controla los procesos de NanoBot y el gateway WebSocket.',
      badge: 'Activo',
      badgeColor: 'var(--terminal-green)',
      actionLabel: 'Gestionar',
      actionTo: '/process',
    },
    {
      icon: <FileText size={28} />,
      title: 'Logs',
      description: 'Visualiza logs en tiempo real del agente y del gateway. Filtra por nivel y exporta.',
      badge: 'En vivo',
      badgeColor: 'var(--terminal-cyan)',
      badgePulse: true,
      actionLabel: 'Ver Logs',
      actionTo: '/logs',
      previewLines: [
        '[INFO] Agent initialized successfully',
        '[INFO] Connected to OpenCode executor',
        '[INFO] Processing message queue...',
      ],
    },
    {
      icon: <Settings2 size={28} />,
      title: 'Servicios',
      description: 'Gestiona NanoBot como servicio en segundo plano.',
      badge: 'Systemd',
      badgeColor: 'var(--text-secondary)',
      actionLabel: 'Gestionar Servicios',
      actionTo: '/services',
    },
    {
      icon: <GitPullRequest size={28} />,
      title: 'Actualizaciones',
      description: 'Verifica nuevas versiones, lee changelogs y actualiza con un clic.',
      badge: 'v1.0.0',
      badgeColor: 'var(--terminal-amber)',
      actionLabel: 'Verificar',
      actionTo: '/updates',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {cards.map((card, i) => (
        <ManagementCard key={card.title} {...card} delay={0.5 + i * 0.1} />
      ))}
    </div>
  );
}

function HeroIllustration() {
  return (
    <motion.div
      className="flex justify-center mb-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] as [number, number, number, number], delay: 0.1 }}
    >
      <img
        src="/hero-illustration.png"
        alt="NanoBot Dashboard"
        className="w-full max-w-xl h-auto rounded-2xl"
        style={{
          boxShadow: '0 4px 40px var(--accent-glow)',
        }}
      />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function Home() {
  const { health, error: healthError } = useHealth(5000);
  const { stats, error: statsError } = useStats(5000);

  const uptime = health?.services.nanobot.uptime ?? '—';
  const status = health?.status ?? 'unknown';

  return (
    <Layout pageTitle="Dashboard">
      <div className="pb-4">
        <HeroIllustration />
        <WelcomeBanner uptime={uptime} status={status} />

        {(healthError || statsError) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-2 rounded-lg px-4 py-3"
            style={{ backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}
          >
            <AlertTriangle size={16} style={{ color: 'var(--terminal-red)' }} />
            <span className="text-sm" style={{ color: 'var(--terminal-red)' }}>
              Error de conexión con la API: {healthError || statsError}
            </span>
          </motion.div>
        )}

        <SystemStats stats={stats} />
        <QuickActions />
        <ManagementCards />
      </div>
    </Layout>
  );
}
