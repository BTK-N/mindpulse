import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Language } from '../types';
import { PlatformLogo, type PlatformId } from './platformLogos';
import { getLenis } from '../shell/smoothScroll';

export interface PlatformSpec {
  id: PlatformId;
  name: string;
  tag: string;
  conEn: string;
  conUr: string;
}

export const PLATFORMS: PlatformSpec[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    tag: 'INFINITE SCROLL',
    conEn: "The feed never reaches a bottom. Your brain has to notice the loop and stop it — the interface won't do it for you.",
    conUr: 'فیڈ کبھی ختم نہیں ہوتی۔ آپ کے ذہن کو خود اس چکر کو پہچان کر رکنا پڑتا ہے — ایپ یہ کام آپ کے لیے نہیں کرتی۔',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    tag: 'ALGORITHMIC FEED',
    conEn: 'Every swipe trains the recommendation engine. It learns what keeps you watching — including content that leaves you feeling worse.',
    conUr: 'ہر سوائپ الگورتھم کو سکھاتا ہے۔ یہ جان لیتا ہے کہ آپ کو کیا روکے رکھے گا — بشمول وہ مواد جو آپ کو اداس کرتا ہے۔',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    tag: 'AUTOPLAY',
    conEn: 'The next video starts before you decide. The default is to keep going. Stopping is the action you have to take.',
    conUr: 'اگلی ویڈیو آپ کے فیصلے سے پہلے ہی شروع ہو جاتی ہے۔ خودکار نظام آگے بڑھتا رہتا ہے، رکنا آپ کی ذمہ داری بن جاتی ہے۔',
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    tag: 'STREAK PRESSURE',
    conEn: 'A streak is a number that resets when you miss a day. The design turns a daily check-in into a daily obligation.',
    conUr: 'اسٹریک صرف ایک عدد ہے جو دن چھوٹنے پر صفر ہو جاتا ہے۔ یہ بناوٹ روزانہ حاضری کو ایک مجبوری بنا دیتی ہے۔',
  },
  {
    id: 'x',
    name: 'X',
    tag: 'RANKED TIMELINE',
    conEn: "The feed is ordered by predicted engagement, not by time. You see what keeps you scrolling, not what's actually happening.",
    conUr: 'ٹائم لائن وقت کے بجائے متوقع توجہ کی بنیاد پر دکھائی جاتی ہے۔ آپ وہ دیکھتے ہیں جو آپ کو الجھائے رکھے، نہ کہ جو واقعی ہو رہا ہے۔',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    tag: 'PERFORMANCE PRESSURE',
    conEn: 'The feed mixes career anxiety with personal updates. It reads as obligation more than information.',
    conUr: 'فیڈ روزگار کی فکر اور ذاتی باتوں کو ایک ساتھ ملا دیتی ہے۔ یہ معلومات سے زیادہ ایک بوجھ محسوس ہوتی ہے۔',
  },
];

interface PlatformFieldGuideProps {
  language: Language;
}

export const PlatformFieldGuide: React.FC<PlatformFieldGuideProps> = ({ language }) => {
  const isUrdu = language === 'Urdu';

  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  const [isReduced, setIsReduced] = useState(false);

  const stickyWrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mobileCardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Expose active state fire counter on window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__activeStateFireCount = 1;
    }
  }, []);

  // Check reduced motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Desktop GSAP horizontal snap scroll
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 1024 || isReduced) return;

    let ctx: any;

    import('../landing/gsapConfig').then(({ getGsapWithScrollTrigger }) => {
      const { gsap } = getGsapWithScrollTrigger();

      if (!trackRef.current || !stickyWrapperRef.current) return;
      const track = trackRef.current;
      const wrapper = stickyWrapperRef.current;

      const firstCard = track.querySelector('[data-fieldguide-card]') as HTMLElement;
      const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 880;
      const gap = 32;
      const step = cardWidth + gap;
      const targets = [0, -step, -2 * step, -3 * step, -4 * step, -5 * step];

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: wrapper,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.5,
            snap: {
              snapTo: 'labelsDirectional',
              duration: { min: 0.35, max: 0.6 },
              delay: 0.15,
              ease: 'power3.inOut',
              inertia: false,
            },
            fastScrollEnd: false,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const p = self.progress;
              const newIdx = Math.min(5, Math.max(0, Math.round(p * 5)));
              if (newIdx !== activeIndexRef.current) {
                activeIndexRef.current = newIdx;
                setActiveIndex(newIdx);
                if (typeof window !== 'undefined') {
                  (window as any).__activeStateFireCount =
                    ((window as any).__activeStateFireCount || 0) + 1;
                }
              }
            },
            onRefresh: () => {
              const fc = track.querySelector('[data-fieldguide-card]') as HTMLElement;
              if (fc) {
                const cw = fc.getBoundingClientRect().width;
                const s = cw + 32;
                for (let i = 0; i < 6; i++) {
                  targets[i] = -i * s;
                }
              }
            },
          },
        });

        tl.addLabel('card0')
          .to(track, { x: () => targets[1], duration: 1, ease: 'none' }, 0)
          .addLabel('card1')
          .to(track, { x: () => targets[2], duration: 1, ease: 'none' }, 1)
          .addLabel('card2')
          .to(track, { x: () => targets[3], duration: 1, ease: 'none' }, 2)
          .addLabel('card3')
          .to(track, { x: () => targets[4], duration: 1, ease: 'none' }, 3)
          .addLabel('card4')
          .to(track, { x: () => targets[5], duration: 1, ease: 'none' }, 4)
          .addLabel('card5');
      });
    });

    return () => {
      if (ctx) ctx.revert();
    };
  }, [isReduced]);

  // Mobile IntersectionObserver active state sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDesktop = window.innerWidth >= 1024 && !isReduced;
    if (isDesktop) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let highestRatio = 0;
        let highestIdx = -1;
        entries.forEach((entry) => {
          const idx = Number(entry.target.getAttribute('data-index'));
          if (entry.intersectionRatio > highestRatio) {
            highestRatio = entry.intersectionRatio;
            highestIdx = idx;
          }
        });
        if (highestIdx >= 0 && highestRatio > 0.25) {
          setActiveIndex(highestIdx);
          activeIndexRef.current = highestIdx;
        }
      },
      { threshold: [0.2, 0.4, 0.6, 0.8] }
    );

    mobileCardRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [isReduced]);

  // Jump to specific card on desktop (Lenis + GSAP snap)
  const handleJumpDesktop = useCallback((index: number) => {
    if (!stickyWrapperRef.current) return;
    const totalCards = PLATFORMS.length;
    const progress = index / (totalCards - 1);
    let wrapperTop = 0;
    let curr: HTMLElement | null = stickyWrapperRef.current;
    while (curr) {
      wrapperTop += curr.offsetTop;
      curr = curr.offsetParent as HTMLElement | null;
    }
    const stickyRange = stickyWrapperRef.current.offsetHeight - window.innerHeight;
    const targetScroll = Math.round(wrapperTop + progress * stickyRange);

    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo(targetScroll, { duration: 0.6 });
    } else {
      window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, []);

  // Jump to card on mobile
  const handleJumpMobile = useCallback((index: number) => {
    setActiveIndex(index);
    activeIndexRef.current = index;
    const targetEl = mobileCardRefs.current[index];
    if (targetEl) {
      const lenis = getLenis();
      if (lenis) {
        const offset = -(window.innerHeight - targetEl.offsetHeight) / 2;
        lenis.scrollTo(targetEl, { offset, duration: 0.6 });
      } else {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, []);

  // Skip link handler
  const handleSkip = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!stickyWrapperRef.current) return;
    let wrapperTop = 0;
    let curr: HTMLElement | null = stickyWrapperRef.current;
    while (curr) {
      wrapperTop += curr.offsetTop;
      curr = curr.offsetParent as HTMLElement | null;
    }
    const wrapperHeight = stickyWrapperRef.current.offsetHeight;
    const targetScroll = wrapperTop + wrapperHeight + 16;

    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo(targetScroll, { immediate: true });
    } else {
      window.scrollTo({ top: targetScroll, behavior: 'instant' as any });
    }

    requestAnimationFrame(async () => {
      try {
        const { getGsapWithScrollTrigger } = await import('../landing/gsapConfig');
        const { ScrollTrigger } = getGsapWithScrollTrigger();
        ScrollTrigger.refresh();
      } catch {}
    });
  }, []);

  // In Urdu, nav is dir="rtl" and items are reversed so LinkedIn is far-right, Instagram far-left
  const displayPlatforms = isUrdu ? [...PLATFORMS].reverse() : PLATFORMS;

  return (
    <section id="field-guide" className="relative border-b border-[var(--color-border)]">
      {/* DESKTOP STICKY HORIZONTAL SCROLL (min-width: 1024px, non-reduced motion) */}
      <div
        ref={stickyWrapperRef}
        className={`${isReduced ? 'hidden' : 'hidden min-[1024px]:block'} sticky-wrapper`}
        style={{ height: '240vh', position: 'relative' }}
      >
        <div
          className="sticky-inner"
          style={{
            position: 'sticky',
            top: '56px',
            height: 'calc(100vh - 56px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* ZONE 1: HEADER */}
          <div className="header-row" style={{ flexShrink: 0, padding: '32px 8vw 24px' }}>
            <div
              dir={isUrdu ? 'rtl' : 'ltr'}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <div>
                <p className="eyebrow font-mono text-xs text-[var(--color-ink-faint)] tracking-widest uppercase mb-2">
                  {isUrdu ? '— / فیلڈ گائیڈ' : '— / FIELD GUIDE'}
                </p>
                <h2 className="section-title font-serif text-3xl sm:text-4xl text-[var(--color-ink)] tracking-tight">
                  {isUrdu ? 'ہر پلیٹ فارم کا طریقہ کار۔' : 'What each one does.'}
                </h2>
              </div>
              <a
                href="#how-it-works"
                className="skip-link font-sans text-xs sm:text-[13px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:underline transition-colors py-1 inline-flex items-center"
                onClick={handleSkip}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSkip(e as any);
                }}
              >
                {isUrdu ? 'فیلڈ گائیڈ چھوڑیں →' : 'Skip field guide →'}
              </a>
            </div>
          </div>

          {/* ZONE 2: INDEX ROW */}
          <nav
            className="index-row"
            aria-label="Platform index"
            dir={isUrdu ? 'rtl' : 'ltr'}
            style={{
              flexShrink: 0,
              padding: '0 8vw 24px',
              display: 'flex',
              gap: '32px',
              alignItems: 'flex-start',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            {displayPlatforms.map((p) => {
              const origIdx = PLATFORMS.findIndex((pl) => pl.id === p.id);
              const isActive = activeIndex === origIdx;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`index-item ${isActive ? 'active' : ''} group relative flex flex-col items-center bg-transparent border-0 cursor-pointer p-[6px_4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 transition-colors duration-150`}
                  aria-label={`Jump to ${p.name} card`}
                  onClick={() => handleJumpDesktop(origIdx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleJumpDesktop(origIdx);
                    }
                  }}
                >
                  {/* Logo wrapper forced to LTR so mark is not mirrored in RTL */}
                  <div
                    dir="ltr"
                    className="transition-opacity duration-150"
                    style={{
                      opacity: isActive ? 1.0 : undefined,
                    }}
                  >
                    <div
                      className={
                        isActive
                          ? 'opacity-100'
                          : 'opacity-55 group-hover:opacity-75 transition-opacity duration-150'
                      }
                    >
                      <PlatformLogo name={p.id} size={28} />
                    </div>
                  </div>
                  <span
                    className="index-label mt-2 text-[9px] font-sans font-medium uppercase tracking-[0.08em] transition-colors duration-150"
                    style={{
                      color: isActive ? 'var(--color-ink)' : 'var(--color-ink-muted)',
                    }}
                  >
                    {p.name}
                  </span>
                  {/* Underline: 1px solid var(--color-accent), 60% width, centered under label */}
                  {isActive && (
                    <span
                      className="h-[1px] w-[60%] mx-auto bg-[var(--color-accent)] pointer-events-none"
                      style={{ marginTop: '4px' }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* ZONE 3: CARD TRACK */}
          <div
            className="cards-viewport"
            style={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <div
              className="track"
              ref={trackRef}
              style={{
                display: 'flex',
                gap: '32px',
                paddingInline: 'calc((100vw - min(72vw, 880px)) / 2)',
                willChange: 'transform',
              }}
            >
              {PLATFORMS.map((p, i) => (
                <div
                  key={p.id}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  data-fieldguide-card
                  className="border border-[var(--color-border)] rounded-md p-10 bg-[var(--color-surface)] flex-shrink-0 flex items-center justify-between"
                  style={{
                    width: 'min(72vw, 880px)',
                    height: '380px',
                  }}
                >
                  {/* Left Column (40%): SVG logo 140px × 140px centered */}
                  <div
                    className="w-[40%] flex items-center justify-center shrink-0"
                    dir="ltr"
                  >
                    <div style={{ color: 'var(--color-ink)', opacity: 0.55 }}>
                      <PlatformLogo name={p.id} size={140} />
                    </div>
                  </div>

                  {/* Right Column (60%) */}
                  <div className={`w-[60%] ${isUrdu ? 'pr-8 pl-0 text-right' : 'pl-8 text-left'}`}>
                    <h3
                      className="font-serif italic text-[40px] text-[var(--color-ink)] leading-tight tracking-tight inline-block"
                      dir="ltr"
                    >
                      {p.name}
                    </h3>
                    <div
                      className={`border-t border-[var(--color-border)] w-[60%] ${
                        isUrdu ? 'mr-0 ml-auto' : 'ml-0 mr-auto'
                      }`}
                      style={{ marginBlock: '16px' }}
                      aria-hidden="true"
                    />
                    <span
                      className="font-mono uppercase text-[11px] tracking-[0.12em] text-[var(--color-ink-muted)] block mb-3"
                      dir="ltr"
                    >
                      {p.tag}
                    </span>
                    <p
                      className={`text-[17px] leading-[1.6] max-w-[55ch] text-[var(--color-ink)] ${
                        isUrdu ? 'font-urdu' : 'font-sans'
                      }`}
                      style={{ opacity: 0.85 }}
                    >
                      {isUrdu ? p.conUr : p.conEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE / REDUCED MOTION FALLBACK (Vertical Stack) */}
      <div
        className={`${
          isReduced ? 'block' : 'block min-[1024px]:hidden'
        } py-16 px-4 sm:px-8 max-w-[720px] mx-auto`}
      >
        {/* ZONE 1: HEADER (Skip link hidden) */}
        <div className="mb-8 text-center sm:text-left">
          <p className="eyebrow font-mono text-xs text-[var(--color-ink-faint)] tracking-widest uppercase mb-2">
            {isUrdu ? '— / فیلڈ گائیڈ' : '— / FIELD GUIDE'}
          </p>
          <h2 className="section-title font-serif text-3xl sm:text-4xl text-[var(--color-ink)] tracking-tight">
            {isUrdu ? 'ہر پلیٹ فارم کا طریقہ کار۔' : 'What each one does.'}
          </h2>
        </div>

        {/* ZONE 2: INDEX ROW - horizontal flex, wraps to 2 rows (3 + 3), centered */}
        <nav
          className="index-row mb-12 flex flex-wrap justify-center gap-x-8 gap-y-4 pb-6 border-b border-[var(--color-border)]"
          aria-label="Platform index"
          dir={isUrdu ? 'rtl' : 'ltr'}
        >
          {displayPlatforms.map((p) => {
            const origIdx = PLATFORMS.findIndex((pl) => pl.id === p.id);
            const isActive = activeIndex === origIdx;
            return (
              <button
                key={p.id}
                type="button"
                className={`index-item ${isActive ? 'active' : ''} group relative flex flex-col items-center bg-transparent border-0 cursor-pointer p-[6px_4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 transition-colors duration-150`}
                aria-label={`Jump to ${p.name} card`}
                onClick={() => handleJumpMobile(origIdx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleJumpMobile(origIdx);
                  }
                }}
              >
                <div
                  dir="ltr"
                  className="transition-opacity duration-150"
                  style={{ opacity: isActive ? 1.0 : undefined }}
                >
                  <div
                    className={
                      isActive
                        ? 'opacity-100'
                        : 'opacity-55 group-hover:opacity-75 transition-opacity duration-150'
                    }
                  >
                    <PlatformLogo name={p.id} size={28} />
                  </div>
                </div>
                <span
                  className="index-label mt-2 text-[9px] font-sans font-medium uppercase tracking-[0.08em] transition-colors duration-150"
                  style={{
                    color: isActive ? 'var(--color-ink)' : 'var(--color-ink-muted)',
                  }}
                >
                  {p.name}
                </span>
                {isActive && (
                  <span
                    className="h-[1px] w-[60%] mx-auto bg-[var(--color-accent)] pointer-events-none"
                    style={{ marginTop: '4px' }}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* ZONE 3: VERTICAL STACK: 6 cards, 24px gap */}
        <div className="flex flex-col gap-6">
          {PLATFORMS.map((p, i) => (
            <div
              key={p.id}
              ref={(el) => {
                mobileCardRefs.current[i] = el;
              }}
              data-index={i}
              data-fieldguide-card
              className="border border-[var(--color-border)] rounded-md p-8 bg-[var(--color-surface)] flex flex-col items-center text-center"
            >
              <div dir="ltr" className="mb-4" style={{ color: 'var(--color-ink)', opacity: 0.55 }}>
                <PlatformLogo name={p.id} size={80} />
              </div>
              <h3
                className="font-serif italic text-[28px] text-[var(--color-ink)] leading-tight tracking-tight mb-2"
                dir="ltr"
              >
                {p.name}
              </h3>
              <div className="border-t border-[var(--color-border)] w-[40%] my-3" aria-hidden="true" />
              <span
                className="font-mono uppercase text-[10px] tracking-[0.12em] text-[var(--color-ink-muted)] block mb-3"
                dir="ltr"
              >
                {p.tag}
              </span>
              <p
                className={`text-[15px] leading-[1.6] max-w-[55ch] text-[var(--color-ink)] ${
                  isUrdu ? 'font-urdu' : 'font-sans'
                }`}
                style={{ opacity: 0.85 }}
              >
                {isUrdu ? p.conUr : p.conEn}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
