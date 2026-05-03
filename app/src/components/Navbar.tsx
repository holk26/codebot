import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Rocket,
  DownloadCloud,
  Sliders,
  Cpu,
  FileText,
  Settings2,
  GitPullRequest,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/onboarding', label: 'Onboarding', icon: <Rocket size={18} /> },
  { path: '/install', label: 'Installation', icon: <DownloadCloud size={18} /> },
  { path: '/configure', label: 'Configuration', icon: <Sliders size={18} /> },
  { path: '/process', label: 'Process Manager', icon: <Cpu size={18} /> },
  { path: '/logs', label: 'Log Viewer', icon: <FileText size={18} /> },
  { path: '/services', label: 'Service Manager', icon: <Settings2 size={18} /> },
  { path: '/updates', label: 'Update Manager', icon: <GitPullRequest size={18} /> },
];

export default function Navbar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      className="fixed left-0 top-0 h-full z-50 flex flex-col transition-all duration-300 ease-out"
      style={{
        width: collapsed ? '64px' : '240px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
      }}
    >
      {/* Logo area */}
      <div
        className="flex items-center gap-3 px-3 shrink-0"
        style={{ height: '64px' }}
      >
        <img
          src="/nanobot-logo.png"
          alt="NanoBot"
          className="shrink-0"
          style={{ height: '32px', width: 'auto' }}
        />
        {!collapsed && (
          <span
            className="font-display font-semibold text-sm truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            NanoBot Console
          </span>
        )}
      </div>

      {/* Nav items */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 rounded-lg transition-all duration-200 ease-out relative"
              style={{
                height: '40px',
                padding: collapsed ? '0 12px' : '0 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--accent-glow)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    width: '3px',
                    height: '20px',
                    backgroundColor: 'var(--accent)',
                  }}
                />
              )}
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom status + collapse toggle */}
      <div
        className="shrink-0"
        style={{
          borderTop: '1px solid var(--border-color)',
        }}
      >
        {!collapsed && (
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ height: '44px' }}
          >
            <span
              className="w-2 h-2 rounded-full animate-status-pulse"
              style={{ backgroundColor: 'var(--terminal-green)' }}
            />
            <span
              className="text-xs font-mono"
              style={{ color: 'var(--text-secondary)' }}
            >
              Agent Online
            </span>
            <span
              className="text-xs font-mono ml-auto"
              style={{ color: 'var(--text-tertiary)' }}
            >
              v2.4.1
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center transition-colors duration-200 hover:bg-[var(--bg-tertiary)]"
          style={{ height: '40px', color: 'var(--text-secondary)' }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </nav>
  );
}
