import React, { useState } from 'react';
import type { Language } from '../types';
import { translations } from '../i18n';
import { Menu, X, LogOut } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  username: string;
  onLogout: () => void;
  onBrandClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  language,
  setLanguage,
  username,
  onLogout,
  onBrandClick,
}) => {
  const t = translations[language];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'diagnosis', label: t.nav.diagnosis },
    { id: 'chat', label: t.nav.chat },
    { id: 'goals', label: t.nav.goals },
    { id: 'history', label: t.nav.history },
    { id: 'insights', label: t.nav.insights },
  ];

  const handleNavClick = (tabId: string) => {
    setCurrentTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-14 gap-3">
        
        {/* Brand Link - never wraps */}
        <div className="flex items-center gap-2.5 shrink-0 select-none">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onBrandClick();
            }}
            className="brand-btn flex items-center gap-2"
          >
            <img
              src="/navbar-logo.png"
              alt=""
              width={26}
              height={26}
              className="brand-logo"
              aria-hidden="true"
            />
            <span className="font-editorial text-xl font-semibold tracking-tight text-[var(--color-ink)] whitespace-nowrap">
              MindPulse
            </span>
          </button>
          <span className="text-[11px] text-[var(--color-ink-faint)] hidden lg:inline border-l border-[var(--color-border)] pl-2.5 whitespace-nowrap">
            Digital Health
          </span>
        </div>

        {/* Desktop Primary Nav (visible on desktop >= lg / 1024px) */}
        <nav className="hidden lg:flex items-center gap-6 h-full">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                data-testid={`nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`relative h-full flex items-center text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-[var(--color-ink)] font-semibold'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 inset-x-0 h-[2px] bg-[var(--color-accent)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Desktop */}
        <div className="hidden lg:flex items-center gap-5 text-xs shrink-0">
          {/* Language Switcher: shows only the target language to switch to */}
          <button
            onClick={() => setLanguage(language === 'English' ? 'Urdu' : 'English')}
            className="lang-btn px-2 bg-[var(--color-paper)]"
            title={language === 'English' ? 'Switch to Urdu' : 'Switch to English'}
          >
            {language === 'English' ? 'اردو' : 'English'}
          </button>

          {/* User & Logout */}
          <span className="text-[var(--color-ink)] font-medium whitespace-nowrap truncate max-w-[120px]">
            {username}
          </span>
          <button
            onClick={onLogout}
            className="text-[var(--color-ink-muted)] hover:text-[var(--color-status-high)] transition-colors font-medium whitespace-nowrap text-xs"
          >
            {t.nav.logout}
          </button>
        </div>

        {/* Mobile & Tablet Controls (<= 768px, collapsed into clean hamburger) */}
        <div className="flex lg:hidden items-center gap-2.5 shrink-0">
          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'English' ? 'Urdu' : 'English')}
            className="lang-btn bg-[var(--color-paper)]"
          >
            {language === 'English' ? 'اردو' : 'English'}
          </button>

          {/* Hamburger Menu Button */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-1.5 rounded text-[var(--color-ink)] hover:bg-[var(--color-paper)] border border-[var(--color-border)] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4 text-[var(--color-ink)]" />
            ) : (
              <Menu className="w-4 h-4 text-[var(--color-ink)]" />
            )}
          </button>
        </div>

      </div>

      {/* Mobile & Tablet Collapsible Drawer (<= 768px) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] py-3 px-2 space-y-1 animate-fade-in shadow-sm">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${
                  isActive
                    ? 'bg-[var(--color-paper-subtle)] text-[var(--color-accent)] font-semibold'
                    : 'text-[var(--color-ink)] hover:bg-[var(--color-paper)]'
                }`}
              >
                <span>{item.label}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />}
              </button>
            );
          })}

          {/* Mobile User Section */}
          <div className="pt-3 mt-2 border-t border-[var(--color-border)] px-3 flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
            <span className="truncate max-w-[150px]">
              {username}
            </span>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="inline-flex items-center gap-1.5 text-[var(--color-status-high)] font-medium hover:underline"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.nav.logout}</span>
            </button>
          </div>
        </div>
      )}

    </header>
  );
};
