import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Download, RotateCcw, ArrowRight } from 'lucide-react';
import { gsap } from 'gsap';
import type { Language, DiagnosisInput, DiagnosisResult } from '../types';
import { translations } from '../i18n';
import { submitDiagnosis, getPdfDownloadUrl } from '../api';
import { Botanical } from './Botanical';
const PairingCard = React.lazy(() => import('./PairingCard').then(m => ({ default: m.PairingCard })));

const shouldAnimate = () => {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const SECTIONS = [
  { id: 'sec-about', en: '1 · About you', ur: '1 · آپ کے بارے میں', mEn: 'About', mUr: 'تعارف' },
  { id: 'sec-time', en: '2 · Your screen time', ur: '2 · آپ کا اسکرین ٹائم', mEn: 'Screen time', mUr: 'اسکرین' },
  { id: 'sec-focus', en: '3 · Focus and attention', ur: '3 · توجہ اور یکسوئی', mEn: 'Focus', mUr: 'توجہ' },
  { id: 'sec-social', en: '4 · Social media and mood', ur: '4 · سوشل میڈیا اور موڈ', mEn: 'Social', mUr: 'سوشل' },
];

interface DiagnosisViewProps {
  language: Language;
  username: string;
}

const AVAILABLE_PLATFORMS = [
  'Instagram',
  'TikTok',
  'YouTube',
  'Facebook',
  'X (Twitter)',
  'Snapchat',
  'Reddit',
  'WhatsApp',
  'Discord',
  'LinkedIn',
];

export const DiagnosisView: React.FC<DiagnosisViewProps> = ({ language, username }) => {
  const t = translations[language];

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'Instagram',
    'TikTok',
    'YouTube',
    'WhatsApp',
  ]);

  const [formData, setFormData] = useState<DiagnosisInput>({
    age: 22,
    gender: 1,
    relationship: 0,
    occupation: 1,
    org_type: 1,
    platforms: 4,
    usage_hours: 5.5,
    purposeless: 4,
    distracted: 4,
    restless: 3,
    concentration: 2,
    focus_issue: 4,
    comparison: 4,
    comparison_feelings: 3,
    validation: 4,
    interest_fluctuation: 3,
    username: username,
    language: language,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Section Indicator State & Refs
  const sectionRefs = useRef<(HTMLFieldSetElement | null)[]>([]);
  const activeSectionRef = useRef(0);
  const [activeSection, setActiveSection] = useState(0);

  // Results Reveal State & Refs
  const resultsPanelRef = useRef<HTMLElement | null>(null);
  const planItemsRef = useRef<(HTMLParagraphElement | null)[]>([]);
  const [displayScore, setDisplayScore] = useState<number>(0);

  // Instrument Assessment Active State Fire Count
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__assessmentActiveFireCount = 1;
    }
  }, []);

  // Section Indicator IntersectionObserver
  useEffect(() => {
    const entriesMap = new Map<number, IntersectionObserverEntry>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.getAttribute('data-section-index'));
          if (!isNaN(idx)) {
            entriesMap.set(idx, entry);
          }
        });

        const candidates: { idx: number; ratio: number }[] = [];
        entriesMap.forEach((entry, idx) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
            candidates.push({ idx, ratio: entry.intersectionRatio });
          }
        });

        if (candidates.length > 0) {
          candidates.sort((a, b) => b.ratio - a.ratio);
          const best = candidates[0].idx;
          if (best !== activeSectionRef.current) {
            activeSectionRef.current = best;
            setActiveSection(best);
            if (typeof window !== 'undefined') {
              (window as any).__assessmentActiveFireCount =
                ((window as any).__assessmentActiveFireCount || 0) + 1;
            }
          }
        }
      },
      { threshold: [0.25, 0.5, 0.75] }
    );

    sectionRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Results Reveal Animation
  useEffect(() => {
    if (!result) return;
    if (shouldAnimate()) {
      if (resultsPanelRef.current) {
        gsap.from(resultsPanelRef.current, {
          opacity: 0,
          y: 8,
          duration: 0.3,
          ease: 'power2.out',
          delay: 0.1,
        });
      }
      const scoreObj = { val: 0 };
      setDisplayScore(0);
      gsap.to(scoreObj, {
        val: result.ml_results.overall_score,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: () => {
          setDisplayScore(scoreObj.val);
        },
      });
      planItemsRef.current.forEach((el, i) => {
        if (el) {
          gsap.from(el, {
            opacity: 0,
            y: 8,
            duration: 0.4,
            ease: 'power2.out',
            delay: 0.2 + i * 0.05,
          });
        }
      });
    } else {
      setDisplayScore(result.ml_results.overall_score);
    }
  }, [result]);

  // Cleanup tweens on unmount
  useEffect(() => {
    return () => {
      if (resultsPanelRef.current) gsap.killTweensOf(resultsPanelRef.current);
      planItemsRef.current.forEach((el) => {
        if (el) gsap.killTweensOf(el);
      });
    };
  }, []);

  const handleJumpToSection = (index: number) => {
    const el = sectionRefs.current[index];
    if (!el) return;
    const lenis = (window as any).__lenis;
    if (lenis) {
      lenis.scrollTo(el, { offset: -88, duration: 0.6 });
    } else {
      const top = el.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  // Live Score Calculator
  const liveScores = useMemo(() => {
    const addiction = Number(((formData.purposeless + formData.distracted + formData.restless + formData.validation) / 4).toFixed(2));
    const behavior = Number(((formData.comparison + formData.comparison_feelings) / 2).toFixed(2));
    const mental = Number(((formData.concentration + formData.interest_fluctuation) / 2).toFixed(2));
    const overall = Number(((addiction + behavior + mental) / 3).toFixed(2));
    
    let estimatedRisk = 'Low';
    if (overall >= 3.5) estimatedRisk = 'High';
    else if (overall >= 2.5) estimatedRisk = 'Medium';

    return { addiction, behavior, mental, overall, estimatedRisk };
  }, [formData]);

  const handleChange = (field: keyof DiagnosisInput, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const togglePlatform = (plat: string) => {
    setSelectedPlatforms((prev) => {
      const exists = prev.includes(plat);
      const next = exists ? prev.filter((p) => p !== plat) : [...prev, plat];
      setFormData((f) => ({ ...f, platforms: Math.max(1, next.length) }));
      return next;
    });
  };

  const handleRunDiagnosis = async () => {
    if (resultsPanelRef.current) gsap.killTweensOf(resultsPanelRef.current);
    planItemsRef.current.forEach((el) => {
      if (el) gsap.killTweensOf(el);
    });
    setLoading(true);
    setError(null);
    try {
      const payload: DiagnosisInput = {
        ...formData,
        platforms: Math.max(1, selectedPlatforms.length),
        username,
        language,
      };
      const res = await submitDiagnosis(payload);
      setResult(res);
      setTimeout(() => {
        document.getElementById('diagnosis-results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch {
      setError(t.diag.errorCalc);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (resultsPanelRef.current) gsap.killTweensOf(resultsPanelRef.current);
    planItemsRef.current.forEach((el) => {
      if (el) gsap.killTweensOf(el);
    });
    setResult(null);
    setDisplayScore(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`space-y-8 pb-16 max-w-5xl mx-auto ${language === 'Urdu' ? 'font-urdu' : ''}`}>
      
      {/* Title Header with Botanical Chapter Ornament */}
      <header className="border-b border-[var(--color-border)] pb-6 relative">
        <div className="relative inline-block">
          <h1 className="font-editorial text-3xl font-semibold text-[var(--color-ink)] tracking-tight mb-1.5">
            {t.diag.title}
          </h1>
          <p className="text-xs text-[var(--color-ink-muted)]">
            {t.diag.subtitle}
          </p>
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ insetInlineStart: 'calc(100% + 40px)', width: 120, height: 120, opacity: 0.04 }}
            aria-hidden="true"
          >
            <Botanical species="bay" style={{ width: 120, height: 120 }} />
          </div>
        </div>
      </header>

      {/* Live Estimated Scores Box (Quiet document box, no glowing ribbon) */}
      <div className="paper-card-subtle p-5 border border-[var(--color-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--color-border)] gap-1">
          <span className="text-xs font-semibold text-[var(--color-ink)]">{t.diag.scoresTitle}</span>
          <span className="text-[11px] text-[var(--color-ink-muted)]">{t.diag.scoresHelper}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 text-xs">
          <div>
            <span className="text-[var(--color-ink-muted)] block mb-0.5">{t.diag.addictionMetric}</span>
            <span dir="ltr" className="font-semibold tabular-nums text-sm text-[var(--color-ink)]">
              {liveScores.addiction} <span className="text-[10px] text-[var(--color-ink-faint)] font-normal">/ 5</span>
            </span>
          </div>

          <div>
            <span className="text-[var(--color-ink-muted)] block mb-0.5">{t.diag.behaviorMetric}</span>
            <span dir="ltr" className="font-semibold tabular-nums text-sm text-[var(--color-ink)]">
              {liveScores.behavior} <span className="text-[10px] text-[var(--color-ink-faint)] font-normal">/ 5</span>
            </span>
          </div>

          <div>
            <span className="text-[var(--color-ink-muted)] block mb-0.5">{t.diag.mentalMetric}</span>
            <span dir="ltr" className="font-semibold tabular-nums text-sm text-[var(--color-ink)]">
              {liveScores.mental} <span className="text-[10px] text-[var(--color-ink-faint)] font-normal">/ 5</span>
            </span>
          </div>

          <div>
            <span className="text-[var(--color-ink-muted)] block mb-0.5">{t.diag.overallMetric}</span>
            <span dir="ltr" className={`font-bold tabular-nums text-sm ${
              liveScores.overall >= 3.5 ? 'text-[var(--color-status-high)]' : liveScores.overall >= 2.5 ? 'text-[var(--color-status-medium)]' : 'text-[var(--color-status-low)]'
            }`}>
              {liveScores.overall} <span className="text-[10px] text-[var(--color-ink-faint)] font-normal">/ 5</span>
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Section Bar (max-width: 1023px) */}
      <div className="lg:hidden sticky top-[56px] z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-[var(--color-paper)]/95 backdrop-blur-sm border-b border-[var(--color-border)] mb-6 overflow-x-auto scrollbar-none">
        <nav className="flex items-center gap-2 min-w-max" aria-label="Assessment section index">
          {SECTIONS.map((sec, idx) => {
            const isActive = activeSection === idx;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleJumpToSection(idx)}
                className={`px-3 py-1.5 rounded-full text-xs font-sans whitespace-nowrap transition-colors duration-150 cursor-pointer border focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 ${
                  isActive
                    ? 'bg-[var(--color-surface)] border-[var(--color-accent)] text-[var(--color-ink)] font-medium'
                    : 'bg-transparent border-[var(--color-border)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                {language === 'Urdu' ? sec.mUr : sec.mEn}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Form Layout with Desktop Sticky Section Index */}
      <div className="lg:flex lg:gap-8 items-start relative">
        {/* Desktop Sticky Section Index (min-width: 1024px) */}
        <aside
          className="hidden lg:block w-[200px] shrink-0 sticky top-[80px]"
          aria-label="Assessment sections"
        >
          <nav className="flex flex-col gap-3" aria-label="Section index">
            {SECTIONS.map((sec, idx) => {
              const isActive = activeSection === idx;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleJumpToSection(idx)}
                  className={`relative text-left font-sans text-[13px] leading-snug transition-colors duration-150 py-1 cursor-pointer bg-transparent border-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 ${
                    isActive
                      ? 'text-[var(--color-ink)] font-medium'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {isActive && (
                    <span
                      className="absolute top-1 bottom-1 w-[2px] bg-[var(--color-accent)] pointer-events-none"
                      style={{ insetInlineStart: '-12px' }}
                      aria-hidden="true"
                    />
                  )}
                  <span>{language === 'Urdu' ? sec.ur : sec.en}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Form Content */}
        <div className="flex-1 min-w-0">
          <form onSubmit={(e) => { e.preventDefault(); handleRunDiagnosis(); }} className="space-y-8">

            {/* SECTION 1: About you */}
            <fieldset
              ref={(el) => {
                sectionRefs.current[0] = el;
              }}
              data-section-index={0}
              className="paper-card p-6 space-y-5"
            >
          <legend className="font-editorial text-xl font-semibold text-[var(--color-ink)] px-1 mb-2">
            {t.diag.secDemo}
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Age */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1.5">
                {t.diag.age} <span dir="ltr" className="text-[var(--color-ink-muted)] font-normal">(10–80)</span>
              </label>
              <input
                type="number"
                dir="ltr"
                min="10"
                max="80"
                value={formData.age}
                onChange={(e) => handleChange('age', parseInt(e.target.value) || 20)}
                className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-md text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1.5">{t.diag.gender}</label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--color-paper)] border border-[var(--color-border)] rounded text-xs text-[var(--color-ink)] font-sans focus:outline-none focus:border-[var(--color-accent)]"
              >
                {t.diag.genderOpts.map((opt, idx) => (
                  <option key={idx} value={idx}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Relationship */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1.5">{t.diag.relationship}</label>
              <select
                value={formData.relationship}
                onChange={(e) => handleChange('relationship', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--color-paper)] border border-[var(--color-border)] rounded text-xs text-[var(--color-ink)] font-sans focus:outline-none focus:border-[var(--color-accent)]"
              >
                {t.diag.relOpts.map((opt, idx) => (
                  <option key={idx} value={idx}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Occupation */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1.5">{t.diag.occupation}</label>
              <select
                value={formData.occupation}
                onChange={(e) => handleChange('occupation', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--color-paper)] border border-[var(--color-border)] rounded text-xs text-[var(--color-ink)] font-sans focus:outline-none focus:border-[var(--color-accent)]"
              >
                {t.diag.occOpts.map((opt, idx) => (
                  <option key={idx} value={idx}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Organization Type */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1.5">{t.diag.orgType}</label>
              <select
                value={formData.org_type}
                onChange={(e) => handleChange('org_type', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--color-paper)] border border-[var(--color-border)] rounded text-xs text-[var(--color-ink)] font-sans focus:outline-none focus:border-[var(--color-accent)]"
              >
                {t.diag.orgOpts.map((opt, idx) => (
                  <option key={idx} value={idx}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Restored Multi-Select Checkbox Group: Apps you use daily */}
            <div className="sm:col-span-2 pt-1">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-[var(--color-ink)]">
                  {t.diag.platforms}
                </label>
                <span className="text-[11px] text-[var(--color-ink-muted)]">
                  <span dir="ltr" className="font-semibold">{selectedPlatforms.length}</span> {t.diag.platformsSelected}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_PLATFORMS.map((plat) => {
                  const isChecked = selectedPlatforms.includes(plat);
                  return (
                    <button
                      type="button"
                      key={plat}
                      onClick={() => togglePlatform(plat)}
                      className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-[var(--color-accent)] text-[var(--color-paper)] border-[var(--color-accent)]'
                          : 'bg-transparent text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[10px] leading-none ${
                        isChecked ? 'border-[var(--color-paper)] bg-[var(--color-paper)] text-[var(--color-accent)]' : 'border-[var(--color-border-strong)] bg-transparent'
                      }`}>
                        {isChecked ? '✓' : ''}
                      </span>
                      <span>{plat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </fieldset>

        {/* SECTION 2: Your screen time */}
        <fieldset
          ref={(el) => {
            sectionRefs.current[1] = el;
          }}
          data-section-index={1}
          className="paper-card p-6 space-y-6"
        >
          <legend className="font-editorial text-xl font-semibold text-[var(--color-ink)] px-1 mb-2">
            {t.diag.secHabits}
          </legend>

          {/* Daily Screen Time */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs items-center">
              <span className="font-medium text-[var(--color-ink)]">{t.diag.usageHours}</span>
              <div className="text-xs text-[var(--color-ink)] font-medium flex items-center gap-1">
                <span dir="ltr" className="font-semibold tabular-nums">{formData.usage_hours}</span>
                <span>{t.diag.hoursPerDay}</span>
                <span dir="ltr" className="text-[var(--color-ink-muted)] font-normal">(0.5–18)</span>
              </div>
            </div>
            <input
              type="range"
              min="0.5"
              max="18"
              step="0.5"
              value={formData.usage_hours}
              onChange={(e) => handleChange('usage_hours', parseFloat(e.target.value))}
              className="setting-slider"
            />
          </div>

          {/* Purposeless Scrolling Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[var(--color-ink)]">{t.diag.purposeless}</span>
              <span dir="ltr" className="font-semibold text-[var(--color-ink)] tabular-nums">{formData.purposeless} / 5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={formData.purposeless}
              onChange={(e) => handleChange('purposeless', parseInt(e.target.value))}
              className="setting-slider"
            />
            <div className="flex justify-between text-[11px] text-[var(--color-ink-muted)]">
              <span><strong>{t.diag.scaleNever}</strong></span>
              <span><strong>{t.diag.scaleAlways}</strong></span>
            </div>
          </div>

          {/* Distraction Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[var(--color-ink)]">{t.diag.distracted}</span>
              <span dir="ltr" className="font-semibold text-[var(--color-ink)] tabular-nums">{formData.distracted} / 5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={formData.distracted}
              onChange={(e) => handleChange('distracted', parseInt(e.target.value))}
              className="setting-slider"
            />
            <div className="flex justify-between text-[11px] text-[var(--color-ink-muted)]">
              <span><strong>{t.diag.scaleNever}</strong></span>
              <span><strong>{t.diag.scaleAlways}</strong></span>
            </div>
          </div>

          {/* Restlessness Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[var(--color-ink)]">{t.diag.restless}</span>
              <span dir="ltr" className="font-semibold text-[var(--color-ink)] tabular-nums">{formData.restless} / 5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={formData.restless}
              onChange={(e) => handleChange('restless', parseInt(e.target.value))}
              className="setting-slider"
            />
            <div className="flex justify-between text-[11px] text-[var(--color-ink-muted)]">
              <span><strong>{t.diag.scaleNever}</strong></span>
              <span><strong>{t.diag.scaleAlways}</strong></span>
            </div>
          </div>

        </fieldset>

        {/* SECTION 3: Focus and attention */}
        <fieldset
          ref={(el) => {
            sectionRefs.current[2] = el;
          }}
          data-section-index={2}
          id="focus-slider-fieldset"
          className="paper-card p-6 space-y-6"
        >
          <legend className="font-editorial text-xl font-semibold text-[var(--color-ink)] px-1 mb-2">
            {t.diag.secFocus}
          </legend>

          {/* Concentration Slider - Reworded to "I lose focus easily" */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[var(--color-ink)]">{t.diag.concentration}</span>
              <span dir="ltr" className="font-semibold text-[var(--color-ink)] tabular-nums">{formData.concentration} / 5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={formData.concentration}
              onChange={(e) => handleChange('concentration', parseInt(e.target.value))}
              className="setting-slider"
            />
            <div className="flex justify-between text-[11px] text-[var(--color-ink-muted)]">
              <span><strong>{t.diag.scaleNever}</strong></span>
              <span><strong>{t.diag.scaleAlways}</strong></span>
            </div>
          </div>

          {/* Focus Issue Frequency Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[var(--color-ink)]">{t.diag.focusIssue}</span>
              <span dir="ltr" className="font-semibold text-[var(--color-ink)] tabular-nums">{formData.focus_issue} / 5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={formData.focus_issue}
              onChange={(e) => handleChange('focus_issue', parseInt(e.target.value))}
              className="setting-slider"
            />
            <div className="flex justify-between text-[11px] text-[var(--color-ink-muted)]">
              <span><strong>{t.diag.scaleNever}</strong></span>
              <span><strong>{t.diag.scaleAlways}</strong></span>
            </div>
          </div>

          {/* Interest Fluctuation Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[var(--color-ink)]">{t.diag.interestFluctuation}</span>
              <span dir="ltr" className="font-semibold text-[var(--color-ink)] tabular-nums">{formData.interest_fluctuation} / 5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={formData.interest_fluctuation}
              onChange={(e) => handleChange('interest_fluctuation', parseInt(e.target.value))}
              className="setting-slider"
            />
            <div className="flex justify-between text-[11px] text-[var(--color-ink-muted)]">
              <span><strong>{t.diag.scaleNever}</strong></span>
              <span><strong>{t.diag.scaleAlways}</strong></span>
            </div>
          </div>

        </fieldset>

        {/* SECTION 4: Social media and mood */}
        <fieldset
          ref={(el) => {
            sectionRefs.current[3] = el;
          }}
          data-section-index={3}
          className="paper-card p-6 space-y-6"
        >
          <legend className="font-editorial text-xl font-semibold text-[var(--color-ink)] px-1 mb-2">
            {t.diag.secSocial}
          </legend>

          {/* Comparison Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[var(--color-ink)]">{t.diag.comparison}</span>
              <span dir="ltr" className="font-semibold text-[var(--color-ink)] tabular-nums">{formData.comparison} / 5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={formData.comparison}
              onChange={(e) => handleChange('comparison', parseInt(e.target.value))}
              className="setting-slider"
            />
            <div className="flex justify-between text-[11px] text-[var(--color-ink-muted)]">
              <span><strong>{t.diag.scaleNever}</strong></span>
              <span><strong>{t.diag.scaleAlways}</strong></span>
            </div>
          </div>

          {/* Comparison Feelings Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[var(--color-ink)]">{t.diag.comparisonFeelings}</span>
              <span dir="ltr" className="font-semibold text-[var(--color-ink)] tabular-nums">{formData.comparison_feelings} / 5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={formData.comparison_feelings}
              onChange={(e) => handleChange('comparison_feelings', parseInt(e.target.value))}
              className="setting-slider"
            />
            <div className="flex justify-between text-[11px] text-[var(--color-ink-muted)]">
              <span><strong>{t.diag.scaleNever}</strong></span>
              <span><strong>{t.diag.scaleAlways}</strong></span>
            </div>
          </div>

          {/* Validation Seeking Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[var(--color-ink)]">{t.diag.validation}</span>
              <span dir="ltr" className="font-semibold text-[var(--color-ink)] tabular-nums">{formData.validation} / 5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={formData.validation}
              onChange={(e) => handleChange('validation', parseInt(e.target.value))}
              className="setting-slider"
            />
            <div className="flex justify-between text-[11px] text-[var(--color-ink-muted)]">
              <span><strong>{t.diag.scaleNever}</strong></span>
              <span><strong>{t.diag.scaleAlways}</strong></span>
            </div>
          </div>

        </fieldset>

        {/* Action Button & Disclaimer */}
        <div className="space-y-3 pt-2">
          {error && (
            <div className="p-3 text-xs text-[var(--color-status-high)] bg-[var(--color-status-high-bg)] border border-[var(--color-status-high)] rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
          >
            <span>{loading ? t.diag.analyzing : t.diag.btnRun}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
          
          <p className="text-[11px] text-[var(--color-ink-muted)]">
            {t.diag.btnHelper}
          </p>
        </div>

      </form>

      <React.Suspense fallback={null}>
        <PairingCard language={language} username={username} />
      </React.Suspense>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* RESULTS DOCUMENT SECTION                                                        */}
      {/* ============================================================================== */}
      {result && (
        <section id="diagnosis-results" ref={resultsPanelRef} className="pt-10 space-y-6">
          
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
            <div>
              <h2 className="font-editorial text-2xl font-semibold text-[var(--color-ink)]">
                {t.diag.resultsTitle}
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)]">Evaluated for {username}</p>
            </div>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-white text-xs font-medium text-[var(--color-ink)] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
              <span>{t.diag.retest}</span>
            </button>
          </div>

          {/* Medical / Stripe Invoice Style Document Card */}
          <div className="paper-card p-6 sm:p-8 space-y-6">
            
            {/* Top Verdict Line */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-[var(--color-border)]">
              
              {/* Risk Level */}
              <div>
                <span className="text-[11px] text-[var(--color-ink-muted)] uppercase tracking-wider block mb-1">
                  {t.diag.riskLevel}
                </span>
                <span className={`text-2xl font-semibold ${
                  result.ml_results.predicted_risk === 'High' ? 'text-[var(--color-status-high)]' :
                  result.ml_results.predicted_risk === 'Medium' ? 'text-[var(--color-status-medium)]' : 'text-[var(--color-status-low)]'
                }`}>
                  {result.ml_results.predicted_risk}
                </span>
              </div>

              {/* Impact Score with Lower is Better Caption */}
              <div>
                <span className="text-[11px] text-[var(--color-ink-muted)] uppercase tracking-wider block mb-1">
                  {t.diag.impactScore}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span dir="ltr" className="text-2xl font-semibold text-[var(--color-ink)] tabular-nums">
                    {displayScore.toFixed(2)}
                  </span>
                  <span className="text-xs text-[var(--color-ink-muted)]">out of 5</span>
                </div>
                <span className="text-[11px] text-[var(--color-ink-muted)]">{t.diag.impactCaption}</span>
              </div>

              {/* Class Probability Breakdown */}
              <div>
                <span className="text-[11px] text-[var(--color-ink-muted)] uppercase tracking-wider block mb-2">
                  {t.diag.probTitle}
                </span>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(result.ml_results.probabilities || {}).map(([cName, prob]) => (
                    <div key={cName} className="flex justify-between items-center text-[11px]">
                      <span className="text-[var(--color-ink-muted)]">{cName} risk:</span>
                      <span dir="ltr" className="font-medium text-[var(--color-ink)] tabular-nums">
                        {Math.round(prob * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Typeset Plan Prose */}
            <div className="space-y-3">
              <h3 className="font-editorial text-xl font-semibold text-[var(--color-ink)]">
                {t.diag.planTitle}
              </h3>
              <div className="text-xs sm:text-sm text-[var(--color-ink)] leading-relaxed bg-[var(--color-paper)] p-5 rounded-md border border-[var(--color-border)] space-y-3">
                {result.ai_consultation.split('\n').filter(Boolean).map((para, i) => {
                  const parts = para.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <p
                      key={i}
                      ref={(el) => {
                        planItemsRef.current[i] = el;
                      }}
                    >
                      {parts.map((p, j) => {
                        if (p.startsWith('**') && p.endsWith('**')) {
                          return <strong key={j} className="font-semibold text-[var(--color-ink)]">{p.slice(2, -2)}</strong>;
                        }
                        return p;
                      })}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* PDF Report Secondary Link */}
            <div className="pt-2 flex justify-end">
              <a
                href={getPdfDownloadUrl(username, result.ml_results.predicted_risk, result.ml_results.overall_score, result.ai_consultation)}
                download
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-white text-xs font-medium text-[var(--color-ink)] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                <span>{t.diag.downloadPdf}</span>
              </a>
            </div>

          </div>

        </section>
      )}

      {/* Persistent Medical Disclaimer */}
      <div className="pt-4 text-center">
        <p className="text-[11px] text-[var(--color-ink-faint)] leading-relaxed max-w-xl mx-auto">
          {translations[language].disclaimer}
        </p>
      </div>

    </div>
  );
};
