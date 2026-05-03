import { useEffect, useState } from 'react';

export default function Footer() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer
      className="flex items-center justify-between px-4 shrink-0"
      style={{
        height: '32px',
        borderTop: '1px solid var(--border-color)',
        color: 'var(--text-tertiary)',
      }}
    >
      <span className="text-xs font-medium tracking-wide">
        NanoBot Console v1.0.0
      </span>
      <span
        className="text-xs font-mono"
        style={{ color: 'var(--text-secondary)' }}
      >
        {time.toLocaleTimeString()}
      </span>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full animate-status-pulse" style={{ backgroundColor: 'var(--terminal-green)' }} />
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Connected
        </span>
        <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
          24ms
        </span>
      </div>
    </footer>
  );
}
