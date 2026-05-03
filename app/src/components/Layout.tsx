import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function Layout({ children, pageTitle }: LayoutProps) {
  return (
    <div className="flex min-h-[100dvh]">
      <Navbar />
      <div
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ marginLeft: '240px' }}
      >
        {/* Top Bar */}
        <header
          className="sticky top-0 z-40 flex items-center justify-between px-6 shrink-0"
          style={{
            height: '56px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <h1
            className="font-display text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {pageTitle || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 px-4 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                height: '36px',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              Quick Actions
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mx-auto max-w-[1200px]">
            {children}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
