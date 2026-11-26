import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { gsap } from 'gsap';
import type { Language } from './types';
import { Navbar } from './components/Navbar';
import { AuthView } from './components/AuthView';
import { DiagnosisView } from './components/DiagnosisView';
import { ChatBuddyView } from './components/ChatBuddyView';
import { GoalTrackerView } from './components/GoalTrackerView';
import { PaperBackground } from './components/PaperBackground';
import { initSmoothScroll, destroySmoothScroll, scrollLenisToTop } from './shell/smoothScroll';

const shouldAnimate = () => {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Code splitting: Heavy views & landing motion isolated into separate chunks to keep main chunk under 680 kB
const HistoryTrendsView = lazy(() =>
  import('./components/HistoryTrendsView').then((m) => ({ default: m.HistoryTrendsView }))
);
const ModelInsightsView = lazy(() =>
  import('./components/ModelInsightsView').then((m) => ({ default: m.ModelInsightsView }))
);
const LandingView = lazy(() =>
  import('./components/LandingView').then((m) => ({ default: m.LandingView }))
);

export function App() {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('mindpulse_lang') as Language) || 'English';
  });

  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('mindpulse_user') || '';
  });

  const [currentTab, setCurrentTab] = useState<string>(() => {
    return localStorage.getItem('mindpulse_tab') || 'diagnosis';
  });

  const mainContentRef = useRef<HTMLDivElement>(null);
  const rootViewRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pendingCommitRef = useRef<(() => void) | null>(null);
  const prevTabRef = useRef(currentTab);
  const [showCurtain, setShowCurtain] = useState(false);

  useEffect(() => {
    if (prevTabRef.current !== currentTab && mainContentRef.current && shouldAnimate()) {
      gsap.fromTo(mainContentRef.current, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'power1.out' });
    }
    prevTabRef.current = currentTab;
  }, [currentTab]);

  useEffect(() => {
    return () => {
      if (mainContentRef.current) gsap.killTweensOf(mainContentRef.current);
      if (rootViewRef.current) gsap.killTweensOf(rootViewRef.current);
      if (overlayRef.current) gsap.killTweensOf(overlayRef.current);
    };
  }, []);

  const [path, setPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const currentView = username ? 'app' : path === '/signin' ? 'auth' : 'landing';
  const prevViewRef = useRef(currentView);

  useEffect(() => {
    const el = overlayRef.current;
    if (!showCurtain || !el) return;
    gsap.fromTo(
      el,
      { y: '-100%' },
      {
        y: '0%',
        duration: 0.15,
        ease: 'power2.inOut',
        onComplete: () => {
          const fn = pendingCommitRef.current;
          pendingCommitRef.current = null;
          fn?.();
        },
      }
    );
  }, [showCurtain]);

  useEffect(() => {
    if (prevViewRef.current !== currentView) {
      prevViewRef.current = currentView;
      const el = overlayRef.current;
      if (showCurtain && el) {
        requestAnimationFrame(() => {
          gsap.to(el, {
            y: '100%',
            duration: 0.15,
            ease: 'power2.inOut',
            onComplete: () => setShowCurtain(false),
          });
        });
      } else if (!shouldAnimate() && rootViewRef.current) {
        gsap.fromTo(rootViewRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
      }
    }
  }, [currentView, showCurtain]);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    localStorage.setItem('mindpulse_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('mindpulse_tab', currentTab);
  }, [currentTab]);

  // Persistent Lenis Smooth Scroll Lifecycle (created once in shell, destroyed on unmount)
  useEffect(() => {
    initSmoothScroll();
    return () => {
      destroySmoothScroll();
    };
  }, []);

  // On every tab / route change: lenis.scrollTo(0, { immediate: true }) then rAF ScrollTrigger.refresh()
  useEffect(() => {
    scrollLenisToTop(true);
  }, [path, currentTab]);

  const runViewTransition = (commitFn: () => void) => {
    if (!shouldAnimate()) {
      commitFn();
      return;
    }
    if (pendingCommitRef.current || showCurtain) return;
    pendingCommitRef.current = commitFn;
    setShowCurtain(true);
  };

  const handleLoginSuccess = (user: string) => {
    runViewTransition(() => {
      setUsername(user);
      localStorage.setItem('mindpulse_user', user);
    });
  };

  const handleLogout = () => {
    runViewTransition(() => {
      setUsername('');
      localStorage.removeItem('mindpulse_user');
      window.history.pushState({}, '', '/signin');
      setPath('/signin');
    });
  };

  const navigateToSignIn = () => {
    runViewTransition(() => {
      window.history.pushState({}, '', '/signin');
      setPath('/signin');
    });
  };

  const handleBrandClick = () => {
    if (username) {
      setCurrentTab('diagnosis');
    } else {
      runViewTransition(() => {
        window.history.pushState({}, '', '/');
        setPath('/');
      });
    }
  };

  const isLanding = !username && path !== '/signin';

  const renderCurrentView = () => {
    switch (currentTab) {
      case 'diagnosis':
      case 'assessment':
        return <DiagnosisView language={language} username={username} />;
      case 'chat':
        return <ChatBuddyView language={language} username={username} />;
      case 'goals':
        return <GoalTrackerView language={language} username={username} />;
      case 'history':
        return (
          <Suspense fallback={<div className="min-h-[400px]" />}>
            <HistoryTrendsView
              language={language}
              username={username}
              onStartAssessment={() => setCurrentTab('assessment')}
            />
          </Suspense>
        );
      case 'insights':
        return (
          <Suspense fallback={<div className="min-h-[400px]" />}>
            <ModelInsightsView language={language} />
          </Suspense>
        );
      default:
        return <DiagnosisView language={language} username={username} />;
    }
  };

  return (
    <div className={`min-h-screen text-[var(--color-ink)] ${language === 'Urdu' ? 'font-urdu' : ''}`}>
      {/* Paper Motion Background rendered once in shell */}
      <PaperBackground isLanding={isLanding} />

      {/* Paper Curtain Overlay (300ms structural view transition) */}
      {showCurtain && <div ref={overlayRef} className="paper-curtain" aria-hidden="true" />}

      {/* Routed Content in sibling container at z-1 */}
      <div ref={rootViewRef} className="relative z-[1] min-h-screen flex flex-col">
        {!username ? (
          path === '/signin' ? (
            <AuthView
              language={language}
              setLanguage={setLanguage}
              onSuccess={handleLoginSuccess}
              onBrandClick={handleBrandClick}
            />
          ) : (
            <Suspense fallback={<div className="min-h-screen" />}>
              <LandingView
                language={language}
                setLanguage={setLanguage}
                onStartAssessment={navigateToSignIn}
                onSignIn={navigateToSignIn}
              />
            </Suspense>
          )
        ) : (
          <>
            {/* Top Navigation */}
            <Navbar
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
              language={language}
              setLanguage={setLanguage}
              username={username}
              onLogout={handleLogout}
              onBrandClick={handleBrandClick}
            />

            {/* Main Content Area */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div ref={mainContentRef}>{renderCurrentView()}</div>
            </main>

            {/* Sober Editorial Footer */}
            <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-surface)] py-6 px-4 text-xs text-[var(--color-ink-faint)]">
              <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-editorial text-sm font-medium text-[var(--color-ink)]">
                    {language === 'Urdu' ? 'مائنڈ پلس' : 'MindPulse'}
                  </span>
                  <span>·</span>
                  <span>
                    {language === 'Urdu' ? 'اسکرین ٹائم اور طرز عمل کا جائزہ' : 'Screen Time & Behavioral Evaluation'}
                  </span>
                </div>
                
                <div className="text-[11px] text-[var(--color-ink-muted)]">
                  {language === 'Urdu' ? 'آپ کا منصوبہ تیار کرنے کے لیے جوابات اے آئی کو بھیجے جاتے ہیں' : 'Your answers are sent to an AI assistant to generate your plan.'}
                </div>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
