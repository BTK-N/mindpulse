import React, { useEffect, useRef, useState } from 'react';
import type { Language } from '../types';
import { getGsapWithScrollTrigger } from '../landing/gsapConfig';
import { isReducedMotion } from '../shell/smoothScroll';
import { Botanical } from './Botanical';
import { PlatformFieldGuide } from './PlatformFieldGuide';

interface LandingViewProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  onStartAssessment: () => void;
  onSignIn: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  language,
  setLanguage,
  onStartAssessment,
  onSignIn,
}) => {
  const isUrdu = language === 'Urdu';
  const [reducedMotion, setReducedMotion] = useState(false);

  // Container refs for animations
  const rootRef = useRef<HTMLDivElement>(null);
  const heroCtaRef = useRef<HTMLDivElement>(null);
  const stickyWrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rule0Ref = useRef<HTMLDivElement>(null);
  const rule1Ref = useRef<HTMLDivElement>(null);
  const rule2Ref = useRef<HTMLDivElement>(null);
  const card0Ref = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const bilingualEnglishRef = useRef<HTMLDivElement>(null);
  const bilingualUrduRef = useRef<HTMLDivElement>(null);
  const bilingualSectionRef = useRef<HTMLDivElement>(null);
  const privacySectionRef = useRef<HTMLDivElement>(null);
  const footerCurtainRef = useRef<HTMLElement>(null);
  const footerTriggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isRed = isReducedMotion();
    setReducedMotion(isRed);

    if (isRed || typeof window === 'undefined') {
      return;
    }

    const { gsap } = getGsapWithScrollTrigger();
    const ctx = gsap.context(() => {
      // 1. Hero masked line reveal: y 110% to 0, 0.8s, ease power4.out, stagger 0.06
      const heroLines = rootRef.current?.querySelectorAll('.hero-masked-line');
      if (heroLines && heroLines.length > 0) {
        gsap.fromTo(
          heroLines,
          { y: '110%' },
          {
            y: '0%',
            duration: 0.8,
            ease: 'power4.out',
            stagger: 0.06,
          }
        );
      }

      // 2. Hero CTA fade-up: 0.4s, power3.out, 0.3s delay after headline
      if (heroCtaRef.current) {
        gsap.fromTo(
          heroCtaRef.current,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.4,
            ease: 'power3.out',
            delay: 0.3,
          }
        );
      }

      // 3. Section 3 (Desktop min-width: 1024px): Snap-driven horizontal scroll with directional labels
      if (trackRef.current && stickyWrapperRef.current) {
        const track = trackRef.current;
        const firstCard = track.querySelector('[data-card]') as HTMLElement;
        const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 880;
        const gap = 32;
        const step = cardWidth + gap;
        const targets = [0, -step, -2 * step];

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: stickyWrapperRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.5,
            snap: {
              snapTo: 'labelsDirectional',
              duration: { min: 0.35, max: 0.6 },
              delay: 0.03,
              ease: 'power2.inOut',
            },
            fastScrollEnd: true,
            invalidateOnRefresh: true,
            onRefresh: () => {
              const fc = track.querySelector('[data-card]') as HTMLElement;
              if (fc) {
                const cw = fc.getBoundingClientRect().width;
                const s = cw + 32;
                targets[0] = 0;
                targets[1] = -s;
                targets[2] = -2 * s;
              }
            },
          },
        });

        tl.addLabel('card1')
          .to(trackRef.current, { x: () => targets[1], duration: 1, ease: 'none' }, 0)
          .to(rule0Ref.current, { width: '0%', duration: 1, ease: 'none' }, 0)
          .to(rule1Ref.current, { width: '100%', duration: 1, ease: 'none' }, 0)
          .addLabel('card2')
          .to(trackRef.current, { x: () => targets[2], duration: 1, ease: 'none' }, 1)
          .to(rule1Ref.current, { width: '0%', duration: 1, ease: 'none' }, 1)
          .to(rule2Ref.current, { width: '100%', duration: 1, ease: 'none' }, 1)
          .addLabel('card3');
      }

      // 4. Section 3 (Mobile / Fallback): Reveal animation for vertical stack
      const stepCards = [card0Ref.current, card1Ref.current, card2Ref.current];
      stepCards.forEach((card) => {
        if (card) {
          gsap.from(card, {
            y: 24,
            opacity: 0,
            duration: 0.6,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              once: true,
            },
          });
        }
      });

      // 5. Parallax Section Watermarks (Layer 2): Ghost numbers drift at 0.7x speed
      const watermarks = rootRef.current?.querySelectorAll('.section-watermark');
      if (watermarks && watermarks.length > 0) {
        watermarks.forEach((mark) => {
          gsap.to(mark, {
            yPercent: -18,
            ease: 'none',
            scrollTrigger: {
              trigger: mark.parentElement,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.8,
            },
          });
        });
      }

      // 6. Section headline mask reveals: once per section on enter, 0.6s power3.out
      const sectionHeadlines = rootRef.current?.querySelectorAll('.section-mask-headline');
      if (sectionHeadlines && sectionHeadlines.length > 0) {
        sectionHeadlines.forEach((hl) => {
          gsap.fromTo(
            hl,
            { y: '110%' },
            {
              y: '0%',
              duration: 0.6,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: hl,
                start: 'top 88%',
                once: true,
              },
            }
          );
        });
      }

      // 7. Bilingual split: English and Urdu lines cross-fade at scroll progress, scrub 0.6
      if (
        bilingualSectionRef.current &&
        bilingualEnglishRef.current &&
        bilingualUrduRef.current
      ) {
        const tlBilingual = gsap.timeline({
          scrollTrigger: {
            trigger: bilingualSectionRef.current,
            start: 'top 80%',
            end: 'bottom 20%',
            scrub: 0.6,
          },
        });

        tlBilingual
          .fromTo(
            bilingualEnglishRef.current,
            { opacity: 0.8 },
            { opacity: 1, ease: 'none' },
            0
          )
          .fromTo(
            bilingualUrduRef.current,
            { opacity: 0.8 },
            { opacity: 1, ease: 'none' },
            0
          );
      }

      // 8. Footer curtain: footer y 100% to 0 with scrub 0.8. Content above lifts -40px
      if (
        footerTriggerRef.current &&
        footerCurtainRef.current &&
        privacySectionRef.current
      ) {
        const tlFooter = gsap.timeline({
          scrollTrigger: {
            trigger: footerTriggerRef.current,
            start: 'top bottom',
            end: 'bottom bottom',
            scrub: 0.8,
          },
        });

        tlFooter
          .fromTo(
            footerCurtainRef.current,
            { y: '100%' },
            { y: '0%', ease: 'none' },
            0
          )
          .fromTo(
            privacySectionRef.current,
            { y: 0 },
            { y: -40, ease: 'none' },
            0
          );
      }
    }, rootRef);

    return () => {
      ctx.revert();
    };
  }, []);

  const scrollToHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById('how-it-works');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToPrivacy = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById('privacy-section');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      ref={rootRef}
      className={`min-h-screen text-[var(--color-ink)] selection:bg-[var(--color-accent-subtle)] ${
        isUrdu ? 'font-urdu' : ''
      }`}
    >
      {/* Top Pre-Auth Navigation Bar: z-index 50 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-paper)] border-b border-[var(--color-border)] px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/navbar-logo.png"
              alt=""
              width={26}
              height={26}
              className="brand-logo"
              aria-hidden="true"
            />
            <span className="font-editorial text-xl font-medium tracking-tight text-[var(--color-ink)]">
              {isUrdu ? 'مائنڈ پلس' : 'MindPulse'}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setLanguage(isUrdu ? 'English' : 'Urdu')}
              className="text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors px-2 py-1"
            >
              {isUrdu ? 'English' : 'اردو'}
            </button>
            <button
              onClick={onSignIn}
              className="inline-flex items-center justify-center h-9 px-4 text-[13px] font-medium tracking-[0.01em] text-[var(--color-ink)] bg-transparent border border-[var(--color-border-strong)] rounded-[4px] hover:bg-[var(--color-ink)]/[0.04] hover:border-[var(--color-ink)]/[0.25] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 cursor-pointer"
            >
              {isUrdu ? 'سائن ان کریں' : 'Sign in'}
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1 — HERO: Natural height so Section 2 peeks prominently at 1440x900 */}
      <section className="relative overflow-hidden px-4 sm:px-8 pt-24 sm:pt-28 pb-12 border-b border-[var(--color-border)]">
        {/* Botanical Specimen: Fern Frond */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
          <Botanical
            species="fern"
            className="absolute"
            style={{ bottom: '-30px', right: '-40px', width: 480, height: 480, transform: 'rotate(-15deg)' }}
            animate
          />
        </div>

        {/* Layer 2: Parallax Watermark "00" */}
        <span
          aria-hidden="true"
          className="section-watermark select-none pointer-events-none absolute font-serif italic text-[28vw] leading-none text-[var(--color-border)] opacity-[0.045] -top-12 -right-8 z-0"
        >
          00
        </span>

        {/* Layer 3: Hero Hairline Drift */}
        <div
          aria-hidden="true"
          className="hero-hairline"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '1px',
            background: 'var(--color-border)',
            opacity: 0.4,
            left: '50%',
            animation: 'heroDrift 30s ease-in-out infinite alternate',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div className="relative z-10 max-w-6xl w-full mx-auto">
          {/* Small Mono Label */}
          <div className="overflow-hidden mb-3 sm:mb-4">
            <span className="hero-masked-line inline-block font-mono text-xs text-[var(--color-ink-faint)] tracking-widest uppercase">
              {isUrdu ? '00 / ڈیجیٹل اسکرین وقت کا جائزہ' : '00 / DIGITAL SCREEN-TIME EVALUATION'}
            </span>
          </div>

          {/* Oversized Serif Title */}
          <div className="overflow-hidden">
            <h1 className="hero-masked-line font-serif italic text-6xl sm:text-7xl md:text-8xl lg:text-[112px] font-normal leading-[0.95] tracking-[-0.045em] text-[var(--color-ink)]">
              {isUrdu ? 'مائنڈ پلس' : 'MindPulse'}
            </h1>
          </div>

          {/* Plain Sub-line (Max 12 words) */}
          <div className="overflow-hidden mt-5 sm:mt-6 max-w-2xl">
            <p className="hero-masked-line text-sm sm:text-base text-[var(--color-ink-muted)] leading-relaxed">
              {isUrdu
                ? 'جانیں کہ آپ کا اسکرین وقت آپ کی توجہ اور موڈ پر کیا اثر ڈالتا ہے۔'
                : 'Check how your screen time affects your focus and mood in three minutes.'}
            </p>
          </div>

          {/* Hero CTAs */}
          <div ref={heroCtaRef} className="flex flex-wrap items-center gap-3 sm:gap-4 mt-7 sm:mt-8">
            <button
              onClick={onStartAssessment}
              className="py-2.5 sm:py-3 px-5 sm:px-6 rounded-md font-medium text-xs sm:text-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-paper)] transition-colors shadow-sm"
            >
              {isUrdu ? 'ٹیسٹ شروع کریں' : 'Start assessment'}
            </button>
            <a
              href="#how-it-works"
              onClick={scrollToHowItWorks}
              className="py-2.5 sm:py-3 px-5 sm:px-6 rounded-md font-medium text-xs sm:text-sm text-[var(--color-ink)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors"
            >
              {isUrdu ? 'یہ کیسے کام کرتا ہے' : 'How it works'}
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 2 — THE PROBLEM, HONESTLY: Visible at fold on 1440x900 */}
      <section className="relative overflow-hidden px-4 sm:px-8 py-16 sm:py-24 max-w-6xl mx-auto border-b border-[var(--color-border)]">
        {/* Botanical Specimen: Lavender Sprig */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
          <Botanical
            species="lavender"
            className="absolute"
            style={{ top: '30px', left: '60px', width: 140, height: 260 }}
            animate
          />
        </div>

        {/* Layer 2: Parallax Watermark "01" */}
        <span
          aria-hidden="true"
          className="section-watermark select-none pointer-events-none absolute font-serif italic text-[28vw] leading-none text-[var(--color-border)] opacity-[0.045] -top-16 -left-8 z-0"
        >
          01
        </span>

        <div className="relative z-10 max-w-[65ch]">
          <span className="font-mono text-xs text-[var(--color-ink-faint)] tracking-widest uppercase mb-3 block">
            {isUrdu ? '01 / مسئلہ' : '01 / THE PROBLEM'}
          </span>
          <div className="overflow-hidden mb-5">
            <h2 className="section-mask-headline font-serif text-3xl sm:text-4xl text-[var(--color-ink)] tracking-tight">
              {isUrdu ? 'مسئلہ، سچائی کے ساتھ۔' : 'The problem, honestly.'}
            </h2>
          </div>
          <p className="text-base sm:text-lg text-[var(--color-ink-muted)] leading-relaxed">
            {isUrdu
              ? 'اسکرین کے وقت سے متعلق زیادہ تر مشورے یا تو بے معنی ہوتے ہیں یا شرمندگی پر مبنی۔ یہ تین منٹ کا خود تشخیصی جائزہ ہے جو بتاتا ہے کہ آپ کی عادات آپ پر کیا اثر ڈال رہی ہیں۔'
              : 'Most screen-time advice is either obvious or shame-based. This is a three-minute self-check that tells you what your habits are actually doing.'}
          </p>
        </div>
      </section>

      {/* NEW SECTION — PLATFORM FIELD GUIDE */}
      <PlatformFieldGuide language={language} />

      {/* SECTION 3 — HOW IT WORKS: CSS position:sticky horizontal scroll on desktop, vertical on mobile/tablet/reduced */}
      <section id="how-it-works" className="relative border-b border-[var(--color-border)]">
        {/* Botanical Specimen: Eucalyptus Branch (relative to whole section, NOT inside sticky viewport) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
          <Botanical
            species="eucalyptus"
            className="absolute"
            style={{ top: '35%', right: '40px', width: 220, height: 340 }}
            animate
          />
        </div>

        {/* Layer 2: Parallax Watermark "02" wrapped in isolated clipping container */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <span
            aria-hidden="true"
            className="section-watermark select-none pointer-events-none absolute font-serif italic text-[28vw] leading-none text-[var(--color-border)] opacity-[0.045] top-8 right-0"
          >
            02
          </span>
        </div>

        {/* DESKTOP STICKY HORIZONTAL SCROLL (min-width: 1025px, non-reduced motion) */}
        <div
          ref={stickyWrapperRef}
          className={`${reducedMotion ? 'hidden' : 'hidden min-[1025px]:block'} sticky-wrapper relative`}
          style={{ height: '220vh', position: 'relative' }}
        >
          <div
            className="sticky-inner"
            dir="ltr"
            style={{
              position: 'sticky',
              top: '56px',
              height: 'calc(100vh - 56px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header stays visible at top of sticky viewport throughout scroll */}
            <div className="section-header flex-shrink-0 max-w-6xl w-full mx-auto px-4 sm:px-8 pt-8 pb-4">
              <span className="font-mono text-xs text-[var(--color-ink-faint)] tracking-widest uppercase mb-2 block">
                {isUrdu ? '02 / طریقہ کار' : '02 / PROCESS'}
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[var(--color-ink)] tracking-tight">
                {isUrdu ? 'یہ کیسے کام کرتا ہے۔' : 'How it works.'}
              </h2>

              {/* Step Progress Affordance: Three 24x2px rules */}
              <div className="flex items-center gap-2 mt-4" aria-label="Step progress" role="tablist">
                <div className="w-6 h-[2px] bg-[var(--color-border)] rounded-full overflow-hidden">
                  <div ref={rule0Ref} className="h-full bg-[var(--color-accent)]" style={{ width: '100%' }} />
                </div>
                <div className="w-6 h-[2px] bg-[var(--color-border)] rounded-full overflow-hidden">
                  <div ref={rule1Ref} className="h-full bg-[var(--color-accent)]" style={{ width: '0%' }} />
                </div>
                <div className="w-6 h-[2px] bg-[var(--color-border)] rounded-full overflow-hidden">
                  <div ref={rule2Ref} className="h-full bg-[var(--color-accent)]" style={{ width: '0%' }} />
                </div>
              </div>
            </div>

            {/* Cards Viewport: clips track without breaking sticky */}
            <div
              className="cards-viewport relative w-full flex-1 overflow-hidden flex items-center"
              style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {/* Horizontal Track */}
              <div
                className="track flex items-center"
                ref={trackRef}
                style={{
                  display: 'flex',
                  gap: '32px',
                  paddingLeft: 'calc((100vw - min(72vw, 880px)) / 2)',
                  paddingRight: 'calc((100vw - min(72vw, 880px)) / 2)',
                  willChange: 'transform',
                }}
              >
                {/* Card 1: Assess */}
                <div
                  data-card
                  dir={isUrdu ? 'rtl' : 'ltr'}
                  style={{ width: 'min(72vw, 880px)', flexShrink: 0 }}
                  className="border border-[var(--color-border)] rounded-md p-8 sm:p-10 bg-[var(--color-surface)] shadow-sm flex flex-col justify-between h-[320px] sm:h-[280px]"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-4">
                      <span className="font-mono tabular-nums text-xs font-semibold text-[var(--color-accent)]">
                        01
                      </span>
                      <span className="font-mono text-xs text-[var(--color-ink-faint)] uppercase">
                        {isUrdu ? 'مرحلہ ایک' : 'STEP 1'}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl font-bold text-[var(--color-ink)] mb-2">
                      {isUrdu ? 'تشخیص' : 'Assess'}
                    </h3>
                    <p className="text-[15px] text-[var(--color-ink-muted)] leading-relaxed max-w-[65ch]">
                      {isUrdu
                        ? 'اپنے روزانہ فون کے استعمال، توجہ اور جذباتی کیفیت سے متعلق اٹھارہ سوالات کے جواب دیں۔'
                        : 'Answer eighteen questions about your daily phone use, focus, and emotional patterns.'}
                    </p>
                  </div>
                </div>

                {/* Card 2: Understand */}
                <div
                  data-card
                  dir={isUrdu ? 'rtl' : 'ltr'}
                  style={{ width: 'min(72vw, 880px)', flexShrink: 0 }}
                  className="border border-[var(--color-border)] rounded-md p-8 sm:p-10 bg-[var(--color-surface)] shadow-sm flex flex-col justify-between h-[320px] sm:h-[280px]"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-4">
                      <span className="font-mono tabular-nums text-xs font-semibold text-[var(--color-accent)]">
                        02
                      </span>
                      <span className="font-mono text-xs text-[var(--color-ink-faint)] uppercase">
                        {isUrdu ? 'مرحلہ دو' : 'STEP 2'}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl font-bold text-[var(--color-ink)] mb-2">
                      {isUrdu ? 'تفہیم' : 'Understand'}
                    </h3>
                    <p className="text-[15px] text-[var(--color-ink-muted)] leading-relaxed max-w-[65ch]">
                      {isUrdu
                        ? 'اپنا حسابی اسکور دیکھیں اور جانیں کہ ہر عادت آپ کی ذہنی حالت پر کیا اثر ڈالتی ہے۔'
                        : 'Review your calculated risk score and view how each habit affects your well-being.'}
                    </p>
                  </div>
                </div>

                {/* Card 3: Act */}
                <div
                  data-card
                  dir={isUrdu ? 'rtl' : 'ltr'}
                  style={{ width: 'min(72vw, 880px)', flexShrink: 0 }}
                  className="border border-[var(--color-border)] rounded-md p-8 sm:p-10 bg-[var(--color-surface)] shadow-sm flex flex-col justify-between h-[320px] sm:h-[280px]"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-4">
                      <span className="font-mono tabular-nums text-xs font-semibold text-[var(--color-accent)]">
                        03
                      </span>
                      <span className="font-mono text-xs text-[var(--color-ink-faint)] uppercase">
                        {isUrdu ? 'مرحلہ تین' : 'STEP 3'}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl font-bold text-[var(--color-ink)] mb-2">
                      {isUrdu ? 'عمل' : 'Act'}
                    </h3>
                    <p className="text-[15px] text-[var(--color-ink-muted)] leading-relaxed max-w-[65ch]">
                      {isUrdu
                        ? 'اپنی روزمرہ عادات کے مطابق بنائے گئے تین مرحلہ وار عملی منصوبے پر عمل کریں۔'
                        : 'Follow a three-step practical plan tailored to your actual habits.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE & TABLET (max-width: 1024px) OR REDUCED-MOTION STATIC VERTICAL STACK */}
        <div
          className={`${
            reducedMotion ? 'block' : 'block min-[1025px]:hidden'
          } relative z-10 px-4 sm:px-8 py-20 max-w-6xl mx-auto`}
        >
          <div className="max-w-[720px] mx-auto mb-8">
            <span className="font-mono text-xs text-[var(--color-ink-faint)] tracking-widest uppercase mb-2 block">
              {isUrdu ? '02 / طریقہ کار' : '02 / PROCESS'}
            </span>
            <div className="overflow-hidden">
              <h2 className="section-mask-headline font-serif text-3xl sm:text-4xl text-[var(--color-ink)] tracking-tight">
                {isUrdu ? 'یہ کیسے کام کرتا ہے۔' : 'How it works.'}
              </h2>
            </div>
          </div>

          {/* Plain static vertical flow of 3 cards */}
          <div className="space-y-6 max-w-[720px] mx-auto">
            {/* Card 0: Assess */}
            <div
              ref={card0Ref}
              className="border border-[var(--color-border)] rounded-md p-6 bg-[var(--color-surface)] shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-4">
                <span className="font-mono tabular-nums text-xs font-semibold text-[var(--color-accent)]">
                  01
                </span>
                <span className="font-mono text-xs text-[var(--color-ink-faint)] uppercase">
                  {isUrdu ? 'مرحلہ ایک' : 'STEP 1'}
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[var(--color-ink)] mb-2">
                {isUrdu ? 'تشخیص' : 'Assess'}
              </h3>
              <p className="text-[15px] text-[var(--color-ink-muted)] leading-relaxed max-w-[65ch]">
                {isUrdu
                  ? 'اپنے روزانہ فون کے استعمال، توجہ اور جذباتی کیفیت سے متعلق اٹھارہ سوالات کے جواب دیں۔'
                  : 'Answer eighteen questions about your daily phone use, focus, and emotional patterns.'}
              </p>
            </div>

            {/* Card 1: Understand */}
            <div
              ref={card1Ref}
              className="border border-[var(--color-border)] rounded-md p-6 bg-[var(--color-surface)] shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-4">
                <span className="font-mono tabular-nums text-xs font-semibold text-[var(--color-accent)]">
                  02
                </span>
                <span className="font-mono text-xs text-[var(--color-ink-faint)] uppercase">
                  {isUrdu ? 'مرحلہ دو' : 'STEP 2'}
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[var(--color-ink)] mb-2">
                {isUrdu ? 'تفہیم' : 'Understand'}
              </h3>
              <p className="text-[15px] text-[var(--color-ink-muted)] leading-relaxed max-w-[65ch]">
                {isUrdu
                  ? 'اپنا حسابی اسکور دیکھیں اور جانیں کہ ہر عادت آپ کی ذہنی حالت پر کیا اثر ڈالتی ہے۔'
                  : 'Review your calculated risk score and view how each habit affects your well-being.'}
              </p>
            </div>

            {/* Card 2: Act */}
            <div
              ref={card2Ref}
              className="border border-[var(--color-border)] rounded-md p-6 bg-[var(--color-surface)] shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-4">
                <span className="font-mono tabular-nums text-xs font-semibold text-[var(--color-accent)]">
                  03
                </span>
                <span className="font-mono text-xs text-[var(--color-ink-faint)] uppercase">
                  {isUrdu ? 'مرحلہ تین' : 'STEP 3'}
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[var(--color-ink)] mb-2">
                {isUrdu ? 'عمل' : 'Act'}
              </h3>
              <p className="text-[15px] text-[var(--color-ink-muted)] leading-relaxed max-w-[65ch]">
                {isUrdu
                  ? 'اپنی روزمرہ عادات کے مطابق بنائے گئے تین مرحلہ وار عملی منصوبے پر عمل کریں۔'
                  : 'Follow a three-step practical plan tailored to your actual habits.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — THE MODEL, IN THE OPEN: Full-bleed Deep Pine band */}
      <section className="relative overflow-hidden bg-[var(--color-accent)] text-[var(--color-paper)] py-20 sm:py-28 px-4 sm:px-8">
        {/* Botanical Specimen: Fern Frond (Mirrored, Paper Color) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
          <Botanical
            species="fern"
            className="absolute"
            style={{ bottom: '-30px', left: '-30px', width: 400, height: 400, transform: 'rotate(15deg)' }}
            animate
            usePaperColor
            mirrored
          />
        </div>

        {/* Layer 2: Parallax Watermark "03" */}
        <span
          aria-hidden="true"
          className="section-watermark select-none pointer-events-none absolute font-serif italic text-[28vw] leading-none text-[var(--color-accent-border)] opacity-[0.08] -top-16 -left-12 z-0"
        >
          03
        </span>

        <div className="relative z-10 max-w-6xl mx-auto">
          <span className="font-mono text-xs text-[var(--color-accent-border)] tracking-widest uppercase mb-3 block">
            {isUrdu ? '03 / ماڈل کی بنیاد' : '03 / THE MODEL'}
          </span>

          <div className="overflow-hidden mb-8">
            <h2 className="section-mask-headline font-serif text-3xl sm:text-5xl text-[var(--color-paper)] tracking-tight">
              {isUrdu ? 'ماڈل، کھلے عام۔' : 'The model, in the open.'}
            </h2>
          </div>

          {/* Three Tabular Numerals */}
          <div className="py-6 border-y border-[var(--color-accent-hover)] font-mono tabular-nums text-base sm:text-2xl tracking-tight text-[var(--color-paper)]">
            {isUrdu
              ? '447 طلباء · 75.18% کراس ویلیڈیشن · لاجسٹک ریگریشن'
              : '447 students · 75.18% cross-validation · Logistic Regression'}
          </div>

          {/* Sub-sentence */}
          <p className="text-xs sm:text-sm text-[var(--color-accent-border)] mt-6 max-w-[65ch] leading-relaxed">
            {isUrdu
              ? 'ہر پیشن گوئی آپ کے جوابات کی بنیاد پر سیدھے حسابی عمل سے ہوتی ہے۔ کوئی ڈھکا چھپا ماڈل نہیں۔'
              : 'Every prediction is a linear combination of your answers. No black box.'}
          </p>
        </div>
      </section>

      {/* SECTION 5 — BILINGUAL, FOR REAL: Production labels without QA annotations */}
      <section
        ref={bilingualSectionRef}
        className="relative overflow-hidden px-4 sm:px-8 py-20 sm:py-28 max-w-6xl mx-auto border-b border-[var(--color-border)]"
      >
        {/* Botanical Specimen: Bay Leaf Sprig */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
          <Botanical
            species="bay"
            className="absolute"
            style={{ bottom: '20px', left: '60px', width: 160, height: 220 }}
            animate
          />
        </div>

        {/* Layer 2: Parallax Watermark "04" */}
        <span
          aria-hidden="true"
          className="section-watermark select-none pointer-events-none absolute font-serif italic text-[28vw] leading-none text-[var(--color-border)] opacity-[0.045] -top-12 -right-12 z-0"
        >
          04
        </span>

        <div className="relative z-10 mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs text-[var(--color-ink-faint)] tracking-widest uppercase mb-3 block">
              {isUrdu ? '04 / دو لسانی' : '04 / BILINGUAL'}
            </span>
            <div className="overflow-hidden">
              <h2 className="section-mask-headline font-serif text-3xl sm:text-4xl text-[var(--color-ink)] tracking-tight">
                {isUrdu ? 'بامقصد دو لسانی معاونت۔' : 'Bilingual, for real.'}
              </h2>
            </div>
          </div>

          {/* Interactive Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage('English')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                !isUrdu
                  ? 'bg-[var(--color-accent)] text-[var(--color-paper)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] border border-[var(--color-border)]'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('Urdu')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                isUrdu
                  ? 'bg-[var(--color-accent)] text-[var(--color-paper)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] border border-[var(--color-border)]'
              }`}
            >
              اردو
            </button>
          </div>
        </div>

        {/* Side-by-Side Live Demo: Plain production labels "English" and "اردو" */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* English Column */}
          <div
            ref={bilingualEnglishRef}
            dir="ltr"
            className={`p-6 sm:p-8 rounded-lg border transition-colors ${
              !isUrdu
                ? 'border-[var(--color-accent)] bg-[var(--color-surface)] shadow-sm'
                : 'border-[var(--color-border)] bg-[var(--color-surface-hover)]'
            }`}
          >
            <span className="font-mono text-xs text-[var(--color-ink-faint)] uppercase block mb-3">
              English
            </span>
            <p className="text-lg sm:text-xl font-serif text-[var(--color-ink)] leading-snug">
              Check how your screen time affects your focus and mood.
            </p>
          </div>

          {/* Urdu Column */}
          <div
            ref={bilingualUrduRef}
            dir="rtl"
            className={`p-6 sm:p-8 rounded-lg border font-urdu transition-colors ${
              isUrdu
                ? 'border-[var(--color-accent)] bg-[var(--color-surface)] shadow-sm'
                : 'border-[var(--color-border)] bg-[var(--color-surface-hover)]'
            }`}
          >
            <span className="font-mono text-xs text-[var(--color-ink-faint)] uppercase block mb-3" dir="ltr">
              اردو
            </span>
            <p className="text-lg sm:text-xl text-[var(--color-ink)] leading-relaxed">
              جانیں کہ آپ کا اسکرین وقت آپ کی توجہ اور موڈ پر کیا اثر ڈالتا ہے۔
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 6 — PRIVACY, PLAINLY (NO MOTION) */}
      <section
        id="privacy-section"
        ref={privacySectionRef}
        className="relative overflow-hidden px-4 sm:px-8 py-20 sm:py-28 max-w-6xl mx-auto border-b border-[var(--color-border)]"
      >
        {/* Layer 2: Parallax Watermark "05" */}
        <span
          aria-hidden="true"
          className="section-watermark select-none pointer-events-none absolute font-serif italic text-[28vw] leading-none text-[var(--color-border)] opacity-[0.045] -top-12 -left-8 z-0"
        >
          05
        </span>

        <div className="relative z-10 max-w-[65ch]">
          <span className="font-mono text-xs text-[var(--color-ink-faint)] tracking-widest uppercase mb-3 block">
            {isUrdu ? '05 / رازداری' : '05 / PRIVACY'}
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-[var(--color-ink)] tracking-tight mb-6">
            {isUrdu ? 'رازداری، واضح انداز میں۔' : 'Privacy, plainly.'}
          </h2>
          <p className="text-base text-[var(--color-ink-muted)] leading-relaxed">
            {isUrdu
              ? 'ساتھی ایکسٹینشن صرف آپ کے فعال ٹیب کے ہوسٹ نام کو ٹریک کرتی ہے — نہ صفحے کا پاتھ، نہ مواد۔ جب تک آپ اسے اپنے اکاؤنٹ کے ساتھ واضح طور پر جوڑ نہیں لیتے، تب تک کوئی بھی ڈیٹا کہیں نہیں بھیجا جاتا، اور اس کے بعد بھی، سنک کرنے کا اختیار آپ کے پاس ہے۔ آپ کا منصوبہ تیار کرنے کے لیے جوابات اے آئی کو بھیجے جاتے ہیں۔ یہ ایک ابتدائی اسکریننگ ٹول ہے، طبی تشخیص نہیں۔ اگر آپ بے چینی محسوس کریں تو ڈاکٹر یا مشیر سے رجوع کریں۔'
              : 'The companion extension tracks the hostname of your active tab — not the page path, not the content. Nothing is sent anywhere until you explicitly pair it with your account, and even then, you control when it syncs. Your answers are sent to an AI assistant to generate your plan. This is a screening tool, not a diagnosis. If you feel unwell, talk to a doctor or counselor.'}
          </p>
        </div>
      </section>

      {/* Anchor Trigger for Footer Curtain */}
      <div ref={footerTriggerRef} className="h-1" />

      {/* SECTION 7 — FOOTER (CURTAIN REVEAL) */}
      <footer
        ref={footerCurtainRef}
        className="relative z-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] py-12 px-4 sm:px-8 text-xs text-[var(--color-ink-muted)]"
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <span className="font-editorial text-lg font-semibold text-[var(--color-ink)]">
              {isUrdu ? 'مائنڈ پلس' : 'MindPulse'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--color-ink-muted)]">
            <button
              onClick={onStartAssessment}
              className="hover:text-[var(--color-ink)] transition-colors"
            >
              {isUrdu ? 'ٹیسٹ' : 'Assessment'}
            </button>
            <a
              href="#privacy-section"
              onClick={scrollToPrivacy}
              className="hover:text-[var(--color-ink)] transition-colors"
            >
              {isUrdu ? 'رازداری' : 'Privacy'}
            </a>
            <button
              onClick={onSignIn}
              className="hover:text-[var(--color-ink)] transition-colors"
            >
              {isUrdu ? 'ماڈل تفصیلات' : 'Model details'}
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 text-[11px] text-[var(--color-ink-faint)] leading-normal">
          {isUrdu
            ? 'یہ ایک اسکریننگ ٹول ہے، تشخیص نہیں۔ اگر آپ خود کو بیمار محسوس کریں تو ڈاکٹر یا کونسلر سے بات کریں۔'
            : 'This is a screening tool, not a diagnosis. If you feel unwell, talk to a doctor or counselor.'}
        </div>
      </footer>
    </div>
  );
};

export default LandingView;
