import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import { gsap } from 'gsap';
import type { Language } from '../types';
import { translations } from '../i18n';
import { loginUser, registerUser } from '../api';
import { Botanical } from './Botanical';

interface AuthViewProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  onSuccess: (username: string) => void;
  onBrandClick?: () => void;
}

const CROP_MARKS = [
  { key: 'tl', cls: '-top-2 -left-2', d: 'M0 .5H14M.5 0V14' },
  { key: 'tr', cls: '-top-2 -right-2', d: 'M14 .5H0M13.5 0V14' },
  { key: 'bl', cls: '-bottom-2 -left-2', d: 'M0 13.5H14M.5 14V0' },
  { key: 'br', cls: '-bottom-2 -right-2', d: 'M14 13.5H0M13.5 14V0' },
];

export const AuthView: React.FC<AuthViewProps> = ({
  language,
  setLanguage,
  onSuccess,
  onBrandClick,
}) => {
  const t = translations[language];
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Animation Refs
  const h1InnerRef = useRef<HTMLSpanElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const proofListRef = useRef<HTMLDivElement>(null);
  const disclaimerRef = useRef<HTMLParagraphElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);
  const tabSwitcherRef = useRef<HTMLDivElement>(null);
  const usernameFieldRef = useRef<HTMLDivElement>(null);
  const passwordFieldRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLDivElement>(null);
  const demoLinkRef = useRef<HTMLDivElement>(null);
  const cropMarksContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      if (h1InnerRef.current) gsap.set(h1InnerRef.current, { yPercent: 0, letterSpacing: '0em', opacity: 1 });
      if (subtitleRef.current) gsap.set(subtitleRef.current, { y: 0, opacity: 1 });
      if (proofListRef.current) gsap.set(proofListRef.current, { opacity: 1 });
      if (disclaimerRef.current) gsap.set(disclaimerRef.current, { y: 0, opacity: 0.7 });
      if (formCardRef.current) gsap.set(formCardRef.current, { opacity: 1 });
      [tabSwitcherRef.current, usernameFieldRef.current, passwordFieldRef.current, submitBtnRef.current, demoLinkRef.current].forEach(el => {
        if (el) gsap.set(el, { y: 0, opacity: 1 });
      });
      if (cropMarksContainerRef.current) {
        gsap.set(cropMarksContainerRef.current.querySelectorAll('path'), { strokeDasharray: 0, strokeDashoffset: 0 });
      }
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (typeof window !== 'undefined') (window as any).__tl = tl;

    // Initial setup
    if (h1InnerRef.current) gsap.set(h1InnerRef.current, { yPercent: 100, letterSpacing: '0.02em', opacity: 1 });
    if (subtitleRef.current) gsap.set(subtitleRef.current, { y: 8, opacity: 0 });
    if (proofListRef.current) gsap.set(proofListRef.current.querySelectorAll('.proof-item'), { y: 6, opacity: 0 });
    if (disclaimerRef.current) gsap.set(disclaimerRef.current, { y: 6, opacity: 0 });
    if (formCardRef.current) gsap.set(formCardRef.current, { opacity: 0 });
    if (cropMarksContainerRef.current) gsap.set(cropMarksContainerRef.current.querySelectorAll('path'), { strokeDasharray: 14, strokeDashoffset: 14 });

    // t=0ms: H1 masked reveal + letter-spacing (600ms, power4.out)
    if (h1InnerRef.current) {
      tl.to(h1InnerRef.current, {
        yPercent: 0,
        letterSpacing: '0em',
        duration: 0.6,
        ease: 'power4.out',
      }, 0);
    }

    // t=100ms: Subtitle fade-up (300ms, power3.out, y: 8 -> 0)
    if (subtitleRef.current) tl.to(subtitleRef.current, { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out' }, 0.1);

    // t=180ms: Three-item proof list stagger (each 220ms, 50ms apart, y: 6 -> 0)
    if (proofListRef.current) {
      tl.to(proofListRef.current.querySelectorAll('.proof-item'), { y: 0, opacity: 1, duration: 0.22, stagger: 0.05, ease: 'power3.out' }, 0.18);
    }

    // t=180ms: Disclaimer fade-up (300ms, y: 6 -> 0, opacity: 0.7)
    if (disclaimerRef.current) tl.to(disclaimerRef.current, { y: 0, opacity: 0.7, duration: 0.3, ease: 'power3.out' }, 0.18);

    // t=220ms: Form card container fade-in (180ms, opacity 0 -> 1)
    if (formCardRef.current) tl.to(formCardRef.current, { opacity: 1, duration: 0.18, ease: 'power3.out' }, 0.22);

    // Staggered form card children (200ms each): tab (320ms), username (400ms), password (460ms), submit (520ms), demo (580ms)
    const formItems: [HTMLElement | null, number, number][] = [
      [tabSwitcherRef.current, 8, 0.32],
      [usernameFieldRef.current, 6, 0.4],
      [passwordFieldRef.current, 6, 0.46],
      [submitBtnRef.current, 6, 0.52],
      [demoLinkRef.current, 6, 0.58],
    ];
    formItems.forEach(([el, y, time]) => {
      if (el) {
        gsap.set(el, { y, opacity: 0 });
        tl.to(el, { y: 0, opacity: 1, duration: 0.2, ease: 'power3.out' }, time);
      }
    });

    // t=620ms: Crop marks draw-in (140ms each, 60ms stagger: 620ms, 680ms, 740ms, 800ms)
    if (cropMarksContainerRef.current) {
      tl.to(cropMarksContainerRef.current.querySelectorAll('path'), { strokeDashoffset: 0, duration: 0.14, stagger: 0.06, ease: 'power2.out' }, 0.62);
    }

    return () => {
      tl.kill();
    };
  }, []);

  // Handle Tab / Mode Transition with Cross-fade
  const handleModeChange = (newMode: 'login' | 'register') => {
    if (mode === newMode) return;
    setError(null);
    setSuccessMsg(null);

    const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setMode(newMode);
      return;
    }

    // Elements to cross-fade: H1 inner, subtitle, disclaimer, and proof list
    const targets = [h1InnerRef.current, subtitleRef.current, disclaimerRef.current, proofListRef.current].filter(Boolean);

    gsap.to(targets, {
      opacity: 0,
      duration: 0.15,
      ease: 'power2.in',
      onComplete: () => {
        setMode(newMode);
        // Next tick after state update: fade back in
        requestAnimationFrame(() => {
          gsap.fromTo(
            targets,
            { opacity: 0 },
            {
              opacity: (_index: number, target: any) => (target === disclaimerRef.current ? 0.7 : 1),
              duration: 0.2,
              delay: 0.1,
              ease: 'power2.out',
            }
          );
        });
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(t.auth.errorEmpty);
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await loginUser(username.trim(), password.trim());
        onSuccess(res.username);
      } else {
        const res = await registerUser(username.trim(), password.trim());
        setSuccessMsg(res.message || (language === 'Urdu' ? 'اکاؤنٹ بن گیا۔ اب سائن ان کریں۔' : 'Account created. You can now sign in.'));
        handleModeChange('login');
      }
    } catch (err: any) {
      if (mode === 'register' && err.message?.includes('already exists')) {
        setError(t.auth.errorRegister);
      } else {
        setError(t.auth.errorFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setUsername('democlient');
    setPassword('democlient123');
    setError(null);
  };

  return (
    <div className={`relative min-h-screen flex flex-col justify-between overflow-x-hidden bg-[var(--color-paper)] text-[var(--color-ink)] px-6 py-6 lg:px-12 ${language === 'Urdu' ? 'font-urdu' : ''}`}>
      
      {/* Top Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBrandClick}
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
            <span className="font-editorial text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              MindPulse
            </span>
          </button>
          <span className="text-[11px] text-[var(--color-ink-muted)] pl-2 border-l border-[var(--color-border)] hidden sm:inline">
            {t.tagline}
          </span>
        </div>

        {/* Quiet Language Toggle */}
        <button
          onClick={() => setLanguage(language === 'English' ? 'Urdu' : 'English')}
          className="lang-btn bg-[var(--color-surface)]"
        >
          {language === 'English' ? 'اردو' : 'English'}
        </button>
      </header>

      {/* Main Two-Column Composition at >=1024px */}
      <main className="w-full max-w-[1160px] mx-auto my-auto lg:my-0 lg:pt-[8vh] lg:pb-12 py-8 sm:py-12 z-10 flex flex-col lg:flex-row items-center lg:items-center justify-between gap-12 lg:gap-16">
        
        {/* LEFT COLUMN: Editorial Presentation */}
        <div className="relative w-full max-w-[460px] lg:max-w-[380px] xl:max-w-[460px] text-left rtl:text-right flex flex-col justify-center">
          {/* Vertical Column Rule (Print magazine anchor, desktop >=1024 only) */}
          <div
            className="hidden lg:block absolute top-0 bottom-0 w-px bg-[var(--color-border)] pointer-events-none -start-6"
            aria-hidden="true"
          />
          
          {/* Row 1: Small mono eyebrow */}
          <div className="text-[11px] font-mono tracking-[0.12em] text-[var(--color-ink-muted)] uppercase mb-3 sm:mb-4 select-none">
            {t.auth.eyebrow}
          </div>

          {/* Row 2: Masked H1 (Mode-aware) */}
          <h1 className="font-editorial font-normal text-[var(--color-ink)] text-[40px] md:text-[44px] xl:text-[56px] leading-[1.05] tracking-tight mb-4 min-h-[1.2em]">
            <span className="inline-block overflow-hidden py-1">
              <span ref={h1InnerRef} className="inline-block will-change-transform">
                {mode === 'login' ? t.auth.h1SignIn : t.auth.h1CreateAccount}
              </span>
            </span>
          </h1>

          {/* Row 3: Mode-aware subtitle */}
          <p ref={subtitleRef} className="text-[15px] text-[var(--color-ink-muted)] max-w-[50ch] leading-[1.55] mb-6 sm:mb-8">
            {mode === 'login' ? t.auth.subtitleSignIn : t.auth.subtitleCreateAccount}
          </p>

          {/* Row 4: Three-item proof list (Sign in mode only, hidden on mobile <=768) */}
          {mode === 'login' && (
            <div ref={proofListRef} className="space-y-[10px] mb-8 hidden lg:block">
              {[t.auth.proof1, t.auth.proof2, t.auth.proof3].map((proof, i) => (
                <div key={i} className="proof-item text-[14px] text-[var(--color-ink)]/80 flex items-start gap-2">
                  <span className="text-[var(--color-ink-muted)] select-none">—</span>
                  <span>{proof}</span>
                </div>
              ))}
            </div>
          )}

          {/* Row 5: Small muted disclaimer (Footnote-anchored) */}
          <div ref={disclaimerRef} className="mt-6">
            <div className="w-[60%] h-px bg-[var(--color-border)] mb-4" aria-hidden="true" />
            <p className="text-[12px] text-[var(--color-ink-muted)]/70 max-w-[50ch] leading-relaxed">
              {mode === 'login' ? t.auth.disclaimerSignIn : t.auth.disclaimerCreateAccount}
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: Form Card with Four Crop Marks */}
        <div ref={formCardRef} className="w-full max-w-[400px] mx-auto lg:mx-0 relative flex-shrink-0">
          
          {/* Four Registration Crop Marks (Hidden on mobile <=768) */}
          <div ref={cropMarksContainerRef} className="hidden lg:block pointer-events-none select-none" aria-hidden="true">
            {CROP_MARKS.map(({ key, cls, d }) => (
              <svg key={key} className={`${cls} absolute w-3.5 h-3.5 text-[var(--color-ink)] pointer-events-none`} style={{ opacity: 0.28 }} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1">
                <path d={d} />
              </svg>
            ))}
          </div>

          {/* Paper Surface Card */}
          <div className="paper-card p-7 sm:p-10 w-full">
            
            {/* Segmented Mode Control */}
            <div ref={tabSwitcherRef} className="grid grid-cols-2 p-1 bg-[var(--color-paper-subtle)] rounded-md mb-6 border border-[var(--color-border)]">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleModeChange(m)}
                  className={`py-1.5 text-xs font-medium rounded transition-all duration-200 ease-out ${
                    mode === m
                      ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm font-semibold'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {m === 'login' ? t.auth.loginTab : t.auth.registerTab}
                </button>
              ))}
            </div>

            {/* Actionable Error / Success State */}
            {(error || successMsg) && (
              <div
                className={`mb-4 p-3 rounded-md border text-xs leading-normal ${
                  error
                    ? 'bg-[var(--color-status-high-bg)] border-[var(--color-status-high)] text-[var(--color-status-high)]'
                    : 'bg-[var(--color-status-low-bg)] border-[var(--color-status-low)] text-[var(--color-status-low)]'
                }`}
              >
                {error || successMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Username with Underline Focus */}
              <div ref={usernameFieldRef}>
                <label className="block text-xs font-medium text-[var(--color-ink)] mb-1.5">
                  {t.auth.username}
                </label>
                <div className="field-underline-container">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. democlient"
                    className="auth-input"
                    required
                  />
                  <div className="field-underline" />
                </div>
              </div>

              {/* Password with Underline Focus */}
              <div ref={passwordFieldRef}>
                <label className="block text-xs font-medium text-[var(--color-ink)] mb-1.5">
                  {t.auth.password}
                </label>
                <div className="field-underline-container">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="auth-input"
                    required
                  />
                  <div className="field-underline" />
                </div>
              </div>

              {/* Submit Action */}
              <div ref={submitBtnRef}>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-auth-submit"
                >
                  <span>{loading ? (mode === 'login' ? t.auth.loggingIn : t.auth.registering) : (mode === 'login' ? t.auth.loginBtn : t.auth.registerBtn)}</span>
                </button>
              </div>
            </form>

            {/* Demo Fill Action */}
            <div ref={demoLinkRef} className="mt-5 pt-4 border-t border-[var(--color-border)] text-center">
              <button
                type="button"
                onClick={handleDemoFill}
                className="text-xs text-[var(--color-accent)] hover:underline font-medium"
              >
                {t.auth.demoHint}
              </button>
            </div>

          </div>

        </div>

      </main>

      {/* Botanical Ornament (One, static, herbarium bay leaf, bottom-left or bottom-right in RTL, hidden on mobile <=768) */}
      <div
        className={`absolute bottom-0 ${language === 'Urdu' ? 'right-0' : 'left-0'} w-[240px] h-[300px] overflow-hidden pointer-events-none hidden lg:block z-0`}
        aria-hidden="true"
        style={{ opacity: 0.06 }}
      >
        <Botanical
          species="bay"
          animate={false}
          style={{ opacity: 1 }}
          className="w-[200px] h-[280px] text-[var(--color-ink)] translate-y-2"
        />
      </div>

      {/* Footer Privacy Line */}
      <footer className="max-w-5xl w-full mx-auto text-center pt-4 pb-2 text-[11px] text-[var(--color-ink-faint)] flex items-center justify-center gap-1.5 z-10">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>{language === 'Urdu' ? 'آپ کا منصوبہ تیار کرنے کے لیے جوابات اے آئی کو بھیجے جاتے ہیں' : 'Your answers are sent to an AI assistant to generate your plan.'}</span>
      </footer>

    </div>
  );
};
