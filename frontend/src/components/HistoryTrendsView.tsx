import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Download, X } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { Language, HistoryItem, RescoreResult } from '../types';
import { translations } from '../i18n';
import {
  fetchUserHistory,
  getPdfDownloadUrl,
  fetchUserScreentime,
  rescoreAssessment,
} from '../api';
import type { ScreentimeSummaryResponse } from '../api';
import { Botanical } from './Botanical';

interface HistoryTrendsViewProps {
  language: Language;
  username: string;
  onStartAssessment?: () => void;
}

const PAGE_SIZE = 20;

import { KNOWN_PLATFORMS } from '../utils/platformNames';


interface AssessmentTrendChartProps {
  chartData: Array<{ id: number; date: string; formattedDate: string; score: number; risk: string }>;
  isUrdu: boolean;
  legendText: string;
}

const AssessmentTrendChart = React.memo<AssessmentTrendChartProps>(({ chartData, isUrdu, legendText }) => (
  <div className="space-y-2">
    <div data-lenis-prevent className="w-full overflow-x-auto">
      <div className="min-w-[500px] h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, bottom: 4 }}>
            <CartesianGrid
              strokeDasharray="0"
              stroke="var(--color-border)"
              vertical={false}
            />
            <XAxis
              dataKey="formattedDate"
              stroke="var(--color-ink-faint)"
              tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              domain={[0, 5]}
              ticks={[1, 2, 3, 4, 5]}
              orientation={isUrdu ? 'right' : 'left'}
              stroke="var(--color-ink-faint)"
              tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-[var(--color-ink)] text-[var(--color-paper)] px-3 py-2 rounded-[var(--radius-sm)] text-xs space-y-0.5 shadow-none border-none">
                      <div className="font-mono text-[11px] opacity-75" dir="ltr">
                        {item.formattedDate}
                      </div>
                      <div className="font-medium">
                        {isUrdu ? 'اثر کا اسکور' : 'Impact score'}:{' '}
                        <span className="font-mono">{item.score}</span> / 5.0
                      </div>
                      <div className="text-[11px] opacity-90">{item.risk}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="score"
              stroke="var(--color-accent)"
              strokeWidth={1.5}
              dot={{
                r: 3.5,
                fill: 'var(--color-accent)',
                stroke: 'var(--color-paper)',
                strokeWidth: 1.5,
              }}
              activeDot={{
                r: 5,
                fill: 'var(--color-accent)',
                stroke: 'var(--color-paper)',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
    <p className="text-xs text-[var(--color-ink-muted)] text-center">
      {legendText}
    </p>
  </div>
));

interface ScreentimeTrendChartProps {
  chartDaysData: Array<{ rawDate: string; dateDisplay: string; hours: number | null; seconds: number | null }>;
  period: number;
  yMax: number;
  yTicks: number[];
  isUrdu: boolean;
  captionText: string;
  formatDuration: (sec: number) => string;
}

const ScreentimeTrendChart = React.memo<ScreentimeTrendChartProps>(({
  chartDaysData,
  period,
  yMax,
  yTicks,
  isUrdu,
  captionText,
  formatDuration,
}) => (
  <div className="min-h-[320px] flex flex-col justify-between mt-4 space-y-2">
    <div dir="ltr" data-lenis-prevent className="w-full overflow-x-auto">
      <div className="min-w-[500px] h-[260px] w-full">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartDaysData} margin={{ top: 12, right: 12, left: -16, bottom: 4 }}>
            <CartesianGrid
              strokeDasharray="0"
              stroke="var(--color-border)"
              vertical={false}
            />
            <XAxis
              dataKey="dateDisplay"
              interval={period === 7 ? 0 : period === 14 ? 1 : 2}
              stroke="var(--color-ink-faint)"
              tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              domain={[0, yMax]}
              ticks={yTicks}
              tickFormatter={(v) => `${v}h`}
              orientation="left"
              stroke="var(--color-ink-faint)"
              tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-[var(--color-ink)] text-[var(--color-paper)] px-3 py-2 rounded-[var(--radius-sm)] text-xs space-y-0.5 shadow-none border-none">
                      <div className="font-mono text-[11px] opacity-75" dir="ltr">
                        {item.rawDate}
                      </div>
                      <div className="font-medium">
                        {item.seconds !== null && item.seconds !== undefined ? (
                          <span>{formatDuration(item.seconds)}</span>
                        ) : (
                          <span className="opacity-75">
                            {isUrdu ? 'کوئی ڈیٹا نہیں' : 'No data synced'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="hours"
              stroke="var(--color-accent)"
              strokeWidth={1.5}
              dot={{
                r: 3.5,
                fill: 'var(--color-accent)',
                stroke: 'var(--color-paper)',
                strokeWidth: 1.5,
              }}
              activeDot={{
                r: 5,
                fill: 'var(--color-accent)',
                stroke: 'var(--color-paper)',
                strokeWidth: 2,
              }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
    <p className="text-xs text-[var(--color-ink-muted)] text-center">
      {captionText}
    </p>
  </div>
));

export const HistoryTrendsView: React.FC<HistoryTrendsViewProps> = ({
  language,
  username,
  onStartAssessment,
}) => {
  const t = translations[language];
  const isUrdu = language === 'Urdu';

  // Subtab navigation state: Assessments · Screen time · Combined
  const [activeSubTab, setActiveSubTab] = useState<'assessments' | 'screentime' | 'combined'>('assessments');

  // --- Assessments State ---
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Modal State
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [pdfErrorRowId, setPdfErrorRowId] = useState<number | null>(null);
  const [modalPdfError, setModalPdfError] = useState(false);

  // Focus Return Ref
  const triggerButtonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});
  const activeTriggerIdRef = useRef<number | null>(null);
  const modalPanelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // --- Screen Time State ---
  const [period, setPeriod] = useState<7 | 14 | 30>(7);
  const [screentimeData, setScreentimeData] = useState<ScreentimeSummaryResponse | null>(null);
  const [screentimeLoading, setScreentimeLoading] = useState(false);
  const [screentimeUpdating, setScreentimeUpdating] = useState(false);
  const [screentimeError, setScreentimeError] = useState<string | null>(null);

  // --- Rescore State ---
  const [rescoreLoading, setRescoreLoading] = useState(false);
  const [rescoreResult, setRescoreResult] = useState<RescoreResult | null>(null);
  const [rescoreError, setRescoreError] = useState<string | null>(null);

  const screentimeCacheRef = useRef<Map<number, { data: ScreentimeSummaryResponse; fetchedAt: number }>>(
    new Map()
  );
  const hasActivatedScreentimeRef = useRef(false);

  const loadHistoryData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await fetchUserHistory(username);
      setHistory(data);
    } catch {
      setFetchError(t.history.errorLoad);
    } finally {
      setLoading(false);
    }
  }, [username, t.history.errorLoad]);

  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  // Load Screen Time Data with 30s client-side cache
  const loadScreentimeData = useCallback(
    async (targetPeriod: 7 | 14 | 30, isSilent = false) => {
      const cached = screentimeCacheRef.current.get(targetPeriod);
      const now = Date.now();
      if (cached && now - cached.fetchedAt < 30000) {
        setScreentimeData(cached.data);
        setScreentimeError(null);
        return;
      }

      if (isSilent) {
        setScreentimeUpdating(true);
      } else {
        setScreentimeLoading(true);
      }
      setScreentimeError(null);

      try {
        const data = await fetchUserScreentime(username, targetPeriod);
        screentimeCacheRef.current.set(targetPeriod, { data, fetchedAt: Date.now() });
        setScreentimeData(data);
      } catch (err: unknown) {
        setScreentimeError(t.history.errorLoading);
      } finally {
        setScreentimeLoading(false);
        setScreentimeUpdating(false);
      }
    },
    [username, t.history.errorLoading]
  );

  // On first activation of Screen time or Combined tab: fetch with default period
  useEffect(() => {
    if ((activeSubTab === 'screentime' || activeSubTab === 'combined') && !hasActivatedScreentimeRef.current) {
      hasActivatedScreentimeRef.current = true;
      loadScreentimeData(period, false);
    }
  }, [activeSubTab, loadScreentimeData, period]);

  // On window focus: refetch silently (no visible loading state)
  useEffect(() => {
    const handleFocus = () => {
      if ((activeSubTab === 'screentime' || activeSubTab === 'combined') && hasActivatedScreentimeRef.current) {
        loadScreentimeData(period, true);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeSubTab, period, loadScreentimeData]);

  const handlePeriodChange = (newPeriod: 7 | 14 | 30) => {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
    loadScreentimeData(newPeriod, true);
  };

  // Duration formatter matching extension popup
  const formatDuration = (totalSec: number): string => {
    if (!totalSec || totalSec <= 0) return '0s';
    if (totalSec < 60) return `${totalSec}s`;
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m < 60) {
      return s > 0 ? `${m}m ${s}s` : `${m}m`;
    }
    const h = Math.floor(m / 60);
    const remainingM = m % 60;
    return remainingM > 0 ? `${h}h ${remainingM}m` : `${h}h`;
  };

  // Relative time formatter
  const formatRelativeTime = (isoString: string | null): string => {
    if (!isoString) return t.history.noDataSynced;
    let s = isoString.trim();
    if (!s.endsWith('Z') && !s.includes('+')) {
      s = s.replace(' ', 'T') + 'Z';
    }
    const past = new Date(s).getTime();
    if (isNaN(past)) return t.history.noDataSynced;
    const diffSec = Math.max(0, Math.floor((Date.now() - past) / 1000));
    if (diffSec < 60) return t.pairing.justNow;
    if (diffSec < 3600) {
      const m = Math.floor(diffSec / 60);
      return m === 1 ? `1 ${t.pairing.minAgo}` : `${m} ${t.pairing.minsAgo}`;
    }
    if (diffSec < 86400) {
      const h = Math.floor(diffSec / 3600);
      return h === 1 ? `1 ${t.pairing.hourAgo}` : `${h} ${t.pairing.hoursAgo}`;
    }
    const d = Math.floor(diffSec / 86400);
    return d === 1 ? `1 ${t.pairing.dayAgo}` : `${d} ${t.pairing.daysAgo}`;
  };

  // Handle ESC key and focus trapping for modal
  useEffect(() => {
    if (!selectedItem) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }

      if (e.key === 'Tab' && modalPanelRef.current) {
        const focusableElements = modalPanelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedItem]);

  const openModal = (item: HistoryItem) => {
    activeTriggerIdRef.current = item.id;
    setSelectedItem(item);
    setModalPdfError(false);
  };

  const closeModal = () => {
    const triggerId = activeTriggerIdRef.current;
    setSelectedItem(null);
    setModalPdfError(false);
    if (triggerId !== null && triggerButtonRefs.current[triggerId]) {
      triggerButtonRefs.current[triggerId]?.focus();
    }
  };

  const handleDownloadPdf = async (item: HistoryItem, isModal = false) => {
    try {
      if (isModal) {
        setModalPdfError(false);
      } else {
        setPdfErrorRowId(null);
      }
      const url = getPdfDownloadUrl(
        item.username,
        item.risk_level,
        item.impact_score,
        item.ai_consult
      );
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('PDF download failed');
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Report_${item.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      if (isModal) {
        setModalPdfError(true);
      } else {
        setPdfErrorRowId(item.id);
      }
    }
  };

  // Helper to format localized dates
  const formatDate = (rawDate: string) => {
    try {
      const parts = rawDate.split(' ')[0].split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        return `${year}-${month}-${day}`;
      }
      return rawDate;
    } catch {
      return rawDate;
    }
  };

  // Helper to strip markdown bold from AI plan
  const cleanPlanText = (rawText: string) => {
    if (!rawText) return '';
    return rawText.replace(/\*\*(.*?)\*\*/g, '$1').trim();
  };

  // Prepare assessments chart data (reverse chronological to forward chronological)
  const chartData = [...history].reverse().map((item) => ({
    id: item.id,
    date: item.date.split(' ')[0],
    formattedDate: formatDate(item.date),
    score: Number(item.impact_score),
    risk: item.risk_level,
  }));

  const visibleHistory = history.slice(0, visibleCount);
  const hasMore = visibleCount < history.length;

  // Prepare Screen Time Chart Data
  const chartDaysData = useMemo(() => {
    if (!screentimeData) return [];
    const byDay = screentimeData.by_day || {};
    const dates: { rawDate: string; dateDisplay: string; hours: number | null; seconds: number | null }[] = [];

    let refDate = new Date();
    const dayKeys = Object.keys(byDay);
    if (dayKeys.length > 0) {
      const maxKey = [...dayKeys].sort().reverse()[0];
      const keyDate = new Date(maxKey + 'T12:00:00Z');
      if (keyDate.getTime() > refDate.getTime()) {
        refDate = keyDate;
      }
    }

    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const isoDate = `${yyyy}-${mm}-${dd}`;

      let display = `${mm}/${dd}`;
      try {
        if (isUrdu) {
          display = `${d.getDate()} ${d.toLocaleDateString('ur-PK', { month: 'short' })}`;
        } else {
          display = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      } catch {
        display = `${mm}/${dd}`;
      }

      const sec = byDay[isoDate];
      if (sec !== undefined && sec !== null) {
        dates.push({
          rawDate: isoDate,
          dateDisplay: display,
          hours: Number((sec / 3600).toFixed(2)),
          seconds: sec,
        });
      } else {
        dates.push({
          rawDate: isoDate,
          dateDisplay: display,
          hours: null,
          seconds: null,
        });
      }
    }
    return dates;
  }, [screentimeData, period, isUrdu]);

  const { yMax, yTicks } = useMemo(() => {
    if (!chartDaysData || chartDaysData.length === 0) return { yMax: 4, yTicks: [1, 2, 3, 4] };
    let maxH = 0;
    for (const item of chartDaysData) {
      if (item.hours !== null && item.hours > maxH) {
        maxH = item.hours;
      }
    }
    const calculatedMax = Math.max(4, Math.ceil(maxH));
    const ticks = Array.from({ length: calculatedMax }, (_, i) => i + 1);
    return { yMax: calculatedMax, yTicks: ticks };
  }, [chartDaysData]);

  const topDomains = useMemo(() => {
    if (!screentimeData?.by_domain) return [];
    return [...screentimeData.by_domain]
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 5);
  }, [screentimeData]);

  const isScreentimeEmpty =
    !screentimeData ||
    (screentimeData.total_seconds === 0 &&
      (!screentimeData.by_domain || screentimeData.by_domain.length === 0) &&
      (!screentimeData.by_day || Object.keys(screentimeData.by_day).length === 0));

  // --- Combined Tab Helpers & Calculations ---
  const latestAssessment = history.length > 0 ? history[0] : null;

  const reportedHours: number | null =
    rescoreResult?.original?.usage_hours ??
    (typeof latestAssessment?.usage_hours === 'number' ? latestAssessment.usage_hours : null);

  const measuredHoursAvg: number = useMemo(() => {
    if (!screentimeData || screentimeData.total_seconds <= 0) return 0;
    return Number(((screentimeData.total_seconds / 3600) / period).toFixed(1));
  }, [screentimeData, period]);

  const currentSubtitle = useMemo(() => {
    if (activeSubTab === 'screentime') {
      return t.history.subtitleScreentime;
    }
    if (activeSubTab === 'combined') {
      return t.history.subtitleCombined;
    }
    return t.history.subtitleAssessments;
  }, [activeSubTab, t.history]);

  const diffInfo = useMemo(() => {
    if (reportedHours === null || measuredHoursAvg === 0) return null;
    const diff = Number((measuredHoursAvg - reportedHours).toFixed(1));
    const absDiff = Math.abs(diff);
    const base = reportedHours > 0 ? reportedHours : 1;
    const pctDiff = absDiff / base;
    const isClose = pctDiff <= 0.05;
    const isReportedMore = !isClose && measuredHoursAvg < reportedHours;
    const isMeasuredMore = !isClose && measuredHoursAvg > reportedHours;
    return {
      diff,
      absDiff,
      isClose,
      isReportedMore,
      isMeasuredMore,
    };
  }, [reportedHours, measuredHoursAvg]);

  const handleRescore = async () => {
    if (!latestAssessment || measuredHoursAvg <= 0) return;
    setRescoreLoading(true);
    setRescoreError(null);
    try {
      const res = await rescoreAssessment(latestAssessment.id, measuredHoursAvg, username);
      setRescoreResult(res);
    } catch (err: any) {
      setRescoreError(err?.message || t.history.rescoreError);
    } finally {
      setRescoreLoading(false);
    }
  };

  const getRiskBadgeClass = (riskLevel: string) => {
    const rl = (riskLevel || '').toLowerCase();
    if (rl === 'high') {
      return 'text-[var(--color-status-high)] bg-[var(--color-status-high-bg)] border-[var(--color-status-high-border)]';
    }
    if (rl === 'medium') {
      return 'text-[var(--color-status-med)] bg-[var(--color-status-med-bg)] border-[var(--color-status-med-border)]';
    }
    return 'text-[var(--color-status-low)] bg-[var(--color-status-low-bg)] border-[var(--color-status-low-border)]';
  };

  return (
    <div data-lenis-prevent className={`max-w-[880px] mx-auto space-y-6 pb-16 ${isUrdu ? 'font-urdu' : ''}`}>
      {/* Subtab Header Row (32px gap between tabs, 1px Deep Pine underline on active) */}
      <div
        className="border-b border-[var(--color-border)] flex items-center gap-8 mb-6"
        dir={isUrdu ? 'rtl' : 'ltr'}
      >
        <button
          type="button"
          data-testid="subtab-assessments"
          onClick={() => setActiveSubTab('assessments')}
          className={`relative py-3 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer bg-transparent border-0 ${
            activeSubTab === 'assessments'
              ? 'text-[var(--color-ink)] font-semibold'
              : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
          style={{ transition: 'color 0.15s ease' }}
        >
          <span>{t.history.subtabAssessments}</span>
          {activeSubTab === 'assessments' && (
            <span className="absolute bottom-0 inset-x-0 h-[1px] bg-[var(--color-accent)]" />
          )}
        </button>
        <button
          type="button"
          data-testid="subtab-screentime"
          onClick={() => setActiveSubTab('screentime')}
          className={`relative py-3 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer bg-transparent border-0 ${
            activeSubTab === 'screentime'
              ? 'text-[var(--color-ink)] font-semibold'
              : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
          style={{ transition: 'color 0.15s ease' }}
        >
          <span>{t.history.subtabScreentime}</span>
          {activeSubTab === 'screentime' && (
            <span className="absolute bottom-0 inset-x-0 h-[1px] bg-[var(--color-accent)]" />
          )}
        </button>
        <button
          type="button"
          data-testid="subtab-combined"
          onClick={() => setActiveSubTab('combined')}
          className={`relative py-3 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer bg-transparent border-0 ${
            activeSubTab === 'combined'
              ? 'text-[var(--color-ink)] font-semibold'
              : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
          style={{ transition: 'color 0.15s ease' }}
        >
          <span>{t.history.subtabCombined}</span>
          {activeSubTab === 'combined' && (
            <span className="absolute bottom-0 inset-x-0 h-[1px] bg-[var(--color-accent)]" />
          )}
        </button>
      </div>

      {/* Header with Botanical Chapter Ornament - Page Title: "Your report" */}
      <div className="relative mb-6">
        <div className="relative inline-block">
          <h1 className="text-2xl font-serif font-bold text-[var(--color-ink)] tracking-tight">
            {t.history.title}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] mt-1">
            {currentSubtitle}
          </p>
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ insetInlineStart: 'calc(100% + 40px)', width: 120, height: 120, opacity: 0.04 }}
            aria-hidden="true"
          >
            <Botanical species="bay" style={{ width: 120, height: 120 }} />
          </div>
        </div>
      </div>

      {/* --- ASSESSMENTS SUBTAB PANEL --- */}
      <div
        style={{ display: activeSubTab === 'assessments' ? 'block' : 'none' }}
        className="space-y-8"
      >

        {/* Loading State: Text-only */}
        {loading && (
          <div className="py-12 text-center text-xs text-[var(--color-ink-faint)]">
            {t.history.loadingText}
          </div>
        )}

        {/* Error State */}
        {!loading && fetchError && (
          <div className="py-10 text-center space-y-3">
            <p className="text-xs text-[var(--color-status-high)]">{fetchError}</p>
            <button
              type="button"
              onClick={loadHistoryData}
              className="text-xs font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              {t.history.retry}
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !fetchError && history.length === 0 && (
          <div className="py-16 text-center space-y-4 border-y border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-ink-muted)]">{t.history.empty}</p>
            {onStartAssessment && (
              <button
                type="button"
                onClick={onStartAssessment}
                className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-paper)] text-xs font-medium rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity cursor-pointer"
              >
                {t.history.runAssessment}
              </button>
            )}
          </div>
        )}

        {/* Populated Content */}
        {!loading && !fetchError && history.length > 0 && (
          <div className="space-y-8">
            {/* Trend Chart (Memoized) */}
            <AssessmentTrendChart
              chartData={chartData}
              isUrdu={isUrdu}
              legendText={t.history.chartLegend}
            />

            {/* Historical Log List */}
            <div className="space-y-0 border-t border-[var(--color-border)]">
              {/* List Header Row */}
              <div className="py-2.5 border-b border-[var(--color-border)] text-[11px] text-[var(--color-ink-faint)] flex items-center justify-between">
                <span>{t.history.listHeader}</span>
                <span className="font-mono text-[11px]">
                  {history.length} {history.length === 1 ? t.history.entrySingular : t.history.entryPlural}
                </span>
              </div>

              {/* List Rows */}
              {visibleHistory.map((item) => {
                const cleanedExcerpt = cleanPlanText(item.ai_consult);
                const riskLower = (item.risk_level || '').toLowerCase();
                const badgeClass =
                  riskLower === 'high'
                    ? 'text-[var(--color-status-high)] bg-[var(--color-status-high-bg)] border-[var(--color-status-high-border)]'
                    : riskLower === 'medium'
                    ? 'text-[var(--color-status-med)] bg-[var(--color-status-med-bg)] border-[var(--color-status-med-border)]'
                    : 'text-[var(--color-status-low)] bg-[var(--color-status-low-bg)] border-[var(--color-status-low-border)]';

                return (
                  <div
                    key={item.id}
                    className="min-h-[72px] h-[72px] border-b border-[var(--color-border)] flex flex-col justify-center gap-1"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Date + Risk Badge + Score + Excerpt */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs text-[var(--color-ink-muted)] font-mono shrink-0" dir="ltr">
                          {formatDate(item.date)}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-medium shrink-0 ${badgeClass}`}>
                          {item.risk_level}
                        </span>
                        <span className="text-xs font-mono text-[var(--color-ink)] shrink-0" dir="ltr">
                          {Number(item.impact_score).toFixed(2)}
                        </span>
                        <span className="text-xs text-[var(--color-ink-muted)] truncate hidden sm:inline flex-1">
                          <span dir="auto" className="inline-block truncate max-w-full">
                            {cleanedExcerpt || t.history.modalUnavailable}
                          </span>
                        </span>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          ref={(el) => {
                            triggerButtonRefs.current[item.id] = el;
                          }}
                          type="button"
                          onClick={() => openModal(item)}
                          className="text-xs font-medium text-[var(--color-accent)] hover:underline whitespace-nowrap cursor-pointer"
                        >
                          {t.history.viewBtn}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(item, false)}
                          title={t.history.pdfBtn}
                          aria-label={t.history.pdfBtn}
                          className="p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {pdfErrorRowId === item.id && (
                      <p className="text-[11px] text-[var(--color-status-high)]">{t.history.pdfError}</p>
                    )}
                  </div>
                );
              })}

              {hasMore && (
                <div className="py-4 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className="text-xs font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
                  >
                    {t.history.loadMore}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* "View plan" Modal */}
        {selectedItem && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(28,27,24,0.35)] transition-opacity duration-150"
          >
            <div
              ref={modalPanelRef}
              className="max-w-[640px] max-h-[80vh] w-full bg-[var(--color-paper)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-lg flex flex-col overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[var(--color-ink-muted)]" dir="ltr">
                    {formatDate(selectedItem.date)}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border font-mono font-medium ${
                      (selectedItem.risk_level || '').toLowerCase() === 'high'
                        ? 'text-[var(--color-status-high)] bg-[var(--color-status-high-bg)] border-[var(--color-status-high-border)]'
                        : (selectedItem.risk_level || '').toLowerCase() === 'medium'
                        ? 'text-[var(--color-status-med)] bg-[var(--color-status-med-bg)] border-[var(--color-status-med-border)]'
                        : 'text-[var(--color-status-low)] bg-[var(--color-status-low-bg)] border-[var(--color-status-low-border)]'
                    }`}
                  >
                    {selectedItem.risk_level}
                  </span>
                  <span className="text-xs font-mono text-[var(--color-ink)]" dir="ltr">
                    {Number(selectedItem.impact_score).toFixed(2)} / 5.0
                  </span>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeModal}
                  aria-label="Close plan"
                  className="w-8 h-8 rounded flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div data-lenis-prevent className="p-6 overflow-y-auto flex-1 space-y-4">
                <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                  {t.history.modalTitle.replace('{date}', formatDate(selectedItem.date))}
                </h2>
                {selectedItem.ai_consult ? (
                  <div className="space-y-3 font-sans" dir="auto">
                    {(() => {
                      const cleaned = cleanPlanText(selectedItem.ai_consult);
                      const parts = cleaned.split(/(?=\d+\.\s)/).map((p) => p.trim()).filter(Boolean);
                      if (parts.length > 1) {
                        return parts.map((para, idx) => (
                          <p key={idx} className="text-xs sm:text-sm text-[var(--color-ink)] leading-relaxed max-w-[65ch]">
                            {para}
                          </p>
                        ));
                      }
                      return (
                        <p className="text-xs sm:text-sm text-[var(--color-ink)] leading-relaxed max-w-[65ch] whitespace-pre-wrap">
                          {cleaned}
                        </p>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-ink-muted)] italic">
                    {t.history.modalUnavailable}
                  </p>
                )}
              </div>

              <div className="px-6 py-3.5 border-t border-[var(--color-border)] flex items-center justify-end gap-3 bg-[var(--color-paper-muted)]">
                {modalPdfError && (
                  <span className="text-xs text-[var(--color-status-high)] me-auto">
                    {t.history.pdfError}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedItem, true)}
                  className="text-xs font-medium text-[var(--color-accent)] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.history.modalDownload}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- SCREEN TIME SUBTAB PANEL --- */}
      <div
        style={{ display: activeSubTab === 'screentime' ? 'block' : 'none' }}
        className="space-y-6"
      >
        {/* 4a. Period Selector Row (top right of panel, above chart, flips in RTL) */}
        <div
          className="flex items-center justify-end gap-3 text-xs"
          dir={isUrdu ? 'rtl' : 'ltr'}
        >
          {screentimeUpdating && (
            <span className="text-[11px] text-[var(--color-ink-faint)] italic transition-opacity duration-200">
              {t.history.updating}
            </span>
          )}
          <div className="inline-flex items-center gap-2 text-xs">
            {([7, 14, 30] as const).map((d, idx) => {
              const active = period === d;
              const label =
                d === 7 ? t.history.period7 : d === 14 ? t.history.period14 : t.history.period30;
              return (
                <React.Fragment key={d}>
                  {idx > 0 && <span className="text-[var(--color-ink-faint)] select-none">·</span>}
                  <button
                    type="button"
                    data-testid={`period-${d}`}
                    onClick={() => handlePeriodChange(d)}
                    className={`relative py-1 transition-colors cursor-pointer bg-transparent border-0 p-0 ${
                      active
                        ? 'text-[var(--color-ink)] font-semibold'
                        : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <span>{label}</span>
                    {active && (
                      <span className="absolute bottom-0 inset-x-0 h-[2px] bg-[var(--color-accent)]" />
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* 4g. Loading State: Initial fetch only */}
        {screentimeLoading && (
          <div className="py-12 text-center text-xs text-[var(--color-ink-faint)]">
            {t.history.loadingScreentime}
          </div>
        )}

        {/* 4f. Error State: Centered panel */}
        {!screentimeLoading && screentimeError && (
          <div className="py-12 text-center space-y-3 max-w-md mx-auto">
            <p className="text-xs text-[var(--color-status-high)]">{screentimeError}</p>
            <button
              type="button"
              onClick={() => loadScreentimeData(period, false)}
              className="text-xs font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              {t.history.retry}
            </button>
          </div>
        )}

        {/* Populated / Empty Content (kept visible when updating=true) */}
        {!screentimeLoading && !screentimeError && (
          <>
            {/* 4e / 4h. Empty State: Centered panel, no card border */}
            {isScreentimeEmpty ? (
              <div className="py-16 text-center space-y-4 max-w-xl mx-auto">
                <div className="text-xs font-mono font-medium tracking-wider text-[var(--color-ink-muted)] uppercase">
                  {t.history.emptyNoDataBadge}
                </div>
                <h3 className="font-serif text-[22px] font-semibold text-[var(--color-ink)] leading-snug">
                  {t.history.emptyTitle}
                </h3>
                {screentimeData?.token_active === false && (
                  <p className="text-xs text-[var(--color-ink-muted)] font-medium">
                    {t.history.notConnectedYet}
                  </p>
                )}
                <p className="text-[15px] font-sans text-[var(--color-ink-muted)] leading-relaxed max-w-[55ch] mx-auto">
                  {t.history.emptyDesc}
                </p>
                {onStartAssessment && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onStartAssessment}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-semibold text-[var(--color-ink)] transition-colors shadow-sm cursor-pointer"
                    >
                      <span>{t.history.connectBtn}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* 4b. Header row (left-aligned under selector, above chart) */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1 pb-2">
                  <div>
                    <div className="text-3xl font-serif font-bold tracking-tight text-[var(--color-ink)] tabular-nums">
                      {formatDuration(screentimeData?.total_seconds ?? 0)}
                    </div>
                    <div className="text-[13px] text-[var(--color-ink-muted)] mt-1">
                      {t.history.totalAcrossDays(period)}
                    </div>
                  </div>

                  {/* Right-aligned sync status block */}
                  <div className="text-start sm:text-end space-y-1 text-xs">
                    <div className="flex items-center sm:justify-end gap-1.5 text-[var(--color-ink-muted)]">
                      {screentimeData?.last_ingest_at ? (
                        <>
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-[var(--color-status-low)] inline-block shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            {t.history.lastDataReceived}{' '}
                            <span className="tabular-nums font-mono text-[var(--color-ink)]">
                              {formatRelativeTime(screentimeData.last_ingest_at)}
                            </span>
                          </span>
                        </>
                      ) : (
                        <span className="text-[var(--color-ink-faint)]">
                          {t.history.noDataSynced}
                        </span>
                      )}
                    </div>
                    {screentimeData?.token_created_at && (
                      <div className="text-[11px] text-[var(--color-ink-faint)]">
                        {t.history.connectedSince}{' '}
                        <span className="tabular-nums font-mono">
                          {formatRelativeTime(screentimeData.token_created_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4c. Trend Chart (Memoized) */}
                <ScreentimeTrendChart
                  chartDaysData={chartDaysData}
                  period={period}
                  yMax={yMax}
                  yTicks={yTicks}
                  isUrdu={isUrdu}
                  captionText={t.history.chartCaption}
                  formatDuration={formatDuration}
                />

                {/* 4d. Top Domains Table (top 5 by seconds descending, row height 44px, hairline divider) */}
                {topDomains.length > 0 && (
                  <div className="space-y-0 border-t border-[var(--color-border)] mt-8">
                    {/* Header Row */}
                    <div className="h-[44px] border-b border-[var(--color-border)] text-[11px] uppercase tracking-[0.08em] text-[var(--color-ink-muted)] flex items-center justify-between">
                      <span className="text-start">{t.history.colDomain}</span>
                      <div className="flex items-center gap-6 sm:gap-10">
                        <span className="w-20 text-end">{t.history.colTime}</span>
                        <span className="w-20 text-end">{t.history.colDaysActive}</span>
                      </div>
                    </div>

                    {/* Table Rows */}
                    {topDomains.map((item) => {
                      const cleanDomain = item.domain.toLowerCase().trim();
                      const friendly = KNOWN_PLATFORMS[cleanDomain];
                      return (
                        <div
                          key={item.domain}
                          className="h-[44px] border-b border-[var(--color-border)] flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 truncate me-4">
                            {friendly ? (
                              <>
                                <span className="font-medium text-[var(--color-ink)] shrink-0">
                                  {friendly}
                                </span>
                                <span
                                  className="text-[11px] text-[var(--color-ink-muted)] font-mono truncate"
                                  dir="ltr"
                                >
                                  · {item.domain}
                                </span>
                              </>
                            ) : (
                              <span
                                className="font-mono text-xs text-[var(--color-ink)] truncate"
                                dir="ltr"
                              >
                                {item.domain}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-6 sm:gap-10 shrink-0 tabular-nums">
                            <span className="w-20 text-end font-mono text-[var(--color-ink)]" dir="ltr">
                              {formatDuration(item.seconds)}
                            </span>
                            <span className="w-20 text-end text-[var(--color-ink-muted)]" dir="ltr">
                              {item.days_active}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* --- COMBINED SUBTAB PANEL --- */}
      <div
        style={{ display: activeSubTab === 'combined' ? 'block' : 'none' }}
        className="space-y-8"
        dir={isUrdu ? 'rtl' : 'ltr'}
      >
        {/* Loading state: Text-only */}
        {(loading || screentimeLoading) && (
          <div className="py-12 text-center text-xs text-[var(--color-ink-faint)]">
            {t.history.loadingText}
          </div>
        )}

        {!loading && !screentimeLoading && (
          <>
            {/* Empty State 1: Nothing to combine (no assessments AND no screen time) */}
            {history.length === 0 && isScreentimeEmpty && (
              <div
                data-testid="combined-empty-nothing"
                className="p-8 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-center space-y-4"
              >
                <span className="inline-block text-[10px] font-mono uppercase tracking-[0.12em] px-2.5 py-1 rounded border border-[var(--color-border)] text-[var(--color-ink-muted)] bg-[var(--color-paper)]">
                  {t.history.emptyNoDataBadge}
                </span>
                <h2 className="text-base font-serif font-bold text-[var(--color-ink)]">
                  {t.history.emptyNothingTitle}
                </h2>
                <p className="text-xs text-[var(--color-ink-muted)] max-w-md mx-auto leading-relaxed">
                  {t.history.emptyNothingDesc}
                </p>
                {onStartAssessment && (
                  <div>
                    <button
                      type="button"
                      onClick={onStartAssessment}
                      className="inline-flex items-center text-xs font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
                    >
                      {t.history.takeAssessmentBtn}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Empty State 2: Assessment only (assessments exist, but no screen time data) */}
            {history.length > 0 && isScreentimeEmpty && (
              <div
                data-testid="combined-empty-screentime"
                className="p-8 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-center space-y-4"
              >
                <span className="inline-block text-[10px] font-mono uppercase tracking-[0.12em] px-2.5 py-1 rounded border border-[var(--color-border)] text-[var(--color-ink-muted)] bg-[var(--color-paper)]">
                  {t.history.emptyNoDataBadge}
                </span>
                <h2 className="text-base font-serif font-bold text-[var(--color-ink)]">
                  {t.history.emptyNoScreentimeTitle}
                </h2>
                <p className="text-xs text-[var(--color-ink-muted)] max-w-md mx-auto leading-relaxed">
                  {t.history.emptyNoScreentimeDesc}
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('screentime')}
                    className="inline-flex items-center text-xs font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
                  >
                    {t.history.connectBtn}
                  </button>
                </div>
              </div>
            )}

            {/* Empty State 3: Screen time only (screen time synced, but no assessments taken) */}
            {history.length === 0 && !isScreentimeEmpty && (
              <div
                data-testid="combined-empty-assessment"
                className="p-8 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-center space-y-4"
              >
                <span className="inline-block text-[10px] font-mono uppercase tracking-[0.12em] px-2.5 py-1 rounded border border-[var(--color-border)] text-[var(--color-ink-muted)] bg-[var(--color-paper)]">
                  {t.history.emptyNoDataBadge}
                </span>
                <h2 className="text-base font-serif font-bold text-[var(--color-ink)]">
                  {t.history.emptyNoAssessmentTitle}
                </h2>
                <p className="text-xs text-[var(--color-ink-muted)] max-w-md mx-auto leading-relaxed">
                  {t.history.emptyNoAssessmentDesc}
                </p>
                {onStartAssessment && (
                  <div>
                    <button
                      type="button"
                      onClick={onStartAssessment}
                      className="inline-flex items-center text-xs font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
                    >
                      {t.history.takeAssessmentBtn}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* State 4: Both present */}
            {history.length > 0 && !isScreentimeEmpty && (
              <div className="space-y-8" data-testid="combined-both-present">
                {/* SECTION A: Comparison Table */}
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                    {t.history.comparisonTitle}
                  </h2>
                  <div className="border border-[var(--color-border)] rounded overflow-hidden">
                    <table className="w-full text-xs text-start border-collapse">
                      <thead>
                        <tr className="bg-[var(--color-surface)] border-b border-[var(--color-border)] text-[11px] uppercase tracking-[0.08em] text-[var(--color-ink-muted)]">
                          <th className="py-3 px-4 text-start font-medium">{t.history.colMetric}</th>
                          <th className="py-3 px-4 text-end font-medium">{t.history.colReported}</th>
                          <th className="py-3 px-4 text-end font-medium">{t.history.colMeasured}</th>
                          <th className="py-3 px-4 text-end font-medium">{t.history.colDiff}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-paper)]">
                          <td className="py-3.5 px-4 font-medium text-[var(--color-ink)]">
                            {t.history.metricDailyUsage}
                          </td>
                          <td className="py-3.5 px-4 text-end font-mono text-[var(--color-ink)] tabular-nums" dir="ltr">
                            {reportedHours !== null ? `${reportedHours.toFixed(1)} hrs/day` : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-end font-mono text-[var(--color-ink)] tabular-nums" dir="ltr">
                            {`${measuredHoursAvg.toFixed(1)} hrs/day`}
                          </td>
                          <td className="py-3.5 px-4 text-end font-mono tabular-nums" dir="ltr">
                            {diffInfo ? (
                              <span className="font-medium text-[var(--color-ink)]">
                                {diffInfo.diff > 0
                                  ? `+${diffInfo.diff.toFixed(1)} hrs/day`
                                  : diffInfo.diff < 0
                                  ? `-${diffInfo.absDiff.toFixed(1)} hrs/day`
                                  : '0.0 hrs/day'}
                              </span>
                            ) : (
                              <span className="text-[var(--color-ink-muted)]">—</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Three-case difference line (honest, non-judgmental) */}
                  {diffInfo && (
                    <div className="space-y-1 pt-1" data-testid="combined-diff-lines">
                      {diffInfo.isReportedMore && (
                        <>
                          <p className="text-xs text-[var(--color-ink-muted)]">
                            {t.history.diffReportedMore(diffInfo.absDiff.toFixed(1))}
                          </p>
                          <p className="text-[11px] text-[var(--color-ink-faint)] leading-relaxed">
                            {t.history.diffReportedMoreDesc}
                          </p>
                        </>
                      )}
                      {diffInfo.isMeasuredMore && (
                        <>
                          <p className="text-xs text-[var(--color-ink-muted)]">
                            {t.history.diffMeasuredMore(diffInfo.absDiff.toFixed(1))}
                          </p>
                          <p className="text-[11px] text-[var(--color-ink-faint)] leading-relaxed">
                            {t.history.diffMeasuredMoreDesc}
                          </p>
                        </>
                      )}
                      {diffInfo.isClose && (
                        <p className="text-xs text-[var(--color-ink-muted)]">
                          {t.history.diffClose}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                    {t.history.comparisonCaption}
                  </p>
                </div>

                {/* SECTION B: Corrected prediction card */}
                {latestAssessment && latestAssessment.can_rescore === false ? (
                  <div
                    data-testid="combined-no-rescore-card"
                    className="p-6 rounded border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3"
                  >
                    <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                      {t.history.emptyPredatesTitle}
                    </h3>
                    <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                      {t.history.emptyPredatesDesc}
                    </p>
                    {onStartAssessment && (
                      <div>
                        <button
                          type="button"
                          onClick={onStartAssessment}
                          className="inline-flex items-center text-xs font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
                        >
                          {t.history.takeAssessmentBtn}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded border border-[var(--color-border)] bg-[var(--color-surface)] space-y-5">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                        {t.history.rescoreTitle}
                      </h3>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                        {t.history.rescoreSubtitle}
                      </p>
                    </div>

                    {rescoreResult ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Original box */}
                          <div className="p-4 rounded border border-[var(--color-border)] bg-[var(--color-paper)] space-y-2">
                            <div className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                              {t.history.rescoreOriginal}
                            </div>
                            <div className="flex items-center justify-between">
                              <span
                                className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded border ${getRiskBadgeClass(
                                  rescoreResult.original.risk_level
                                )}`}
                              >
                                {rescoreResult.original.risk_level}
                              </span>
                              <span className="font-mono text-xs text-[var(--color-ink)]" dir="ltr">
                                {rescoreResult.original.usage_hours.toFixed(1)} hrs/day
                              </span>
                            </div>
                            <div className="text-xs text-[var(--color-ink-muted)]">
                              {t.history.rescoreImpact}:{' '}
                              <span className="font-mono font-semibold text-[var(--color-ink)]" dir="ltr">
                                {rescoreResult.original.impact_score.toFixed(2)}
                              </span>{' '}
                              / 5.0
                            </div>
                          </div>

                          {/* Corrected box */}
                          <div className="p-4 rounded border border-[var(--color-accent)] bg-[var(--color-paper)] space-y-2">
                            <div className="text-[11px] uppercase tracking-wider text-[var(--color-accent)] font-semibold">
                              {t.history.rescoreCorrected}
                            </div>
                            <div className="flex items-center justify-between">
                              <span
                                className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded border ${getRiskBadgeClass(
                                  rescoreResult.corrected.risk_level
                                )}`}
                              >
                                {rescoreResult.corrected.risk_level}
                              </span>
                              <span className="font-mono text-xs font-semibold text-[var(--color-ink)]" dir="ltr">
                                {rescoreResult.corrected.usage_hours.toFixed(1)} hrs/day
                              </span>
                            </div>
                            <div className="text-xs text-[var(--color-ink-muted)]">
                              {t.history.rescoreImpact}:{' '}
                              <span className="font-mono font-semibold text-[var(--color-ink)]" dir="ltr">
                                {rescoreResult.corrected.impact_score.toFixed(2)}
                              </span>{' '}
                              / 5.0
                            </div>
                          </div>
                        </div>

                        {/* Score delta indicator */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[var(--color-ink-muted)]">Shift:</span>
                          <span
                            className={`font-mono font-semibold px-2 py-0.5 rounded border ${
                              rescoreResult.delta_impact > 0
                                ? 'text-[var(--color-status-high)] bg-[var(--color-status-high-bg)] border-[var(--color-status-high-border)]'
                                : rescoreResult.delta_impact < 0
                                ? 'text-[var(--color-status-low)] bg-[var(--color-status-low-bg)] border-[var(--color-status-low-border)]'
                                : 'text-[var(--color-ink-muted)] bg-[var(--color-surface)] border-[var(--color-border)]'
                            }`}
                            dir="ltr"
                          >
                            {rescoreResult.delta_impact > 0 ? '+' : ''}
                            {rescoreResult.delta_impact.toFixed(2)} impact score
                          </span>
                          <span className="font-mono text-[var(--color-ink-muted)]" dir="ltr">
                            ({rescoreResult.delta_hours > 0 ? '+' : ''}
                            {rescoreResult.delta_hours.toFixed(1)} hrs)
                          </span>
                        </div>

                        <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                          {t.history.rescoreCaption}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {latestAssessment && (
                          <div className="p-4 rounded border border-[var(--color-border)] bg-[var(--color-paper)] flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                                {t.history.rescoreOriginal}
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded border ${getRiskBadgeClass(
                                    latestAssessment.risk_level
                                  )}`}
                                >
                                  {latestAssessment.risk_level}
                                </span>
                                <span className="text-xs text-[var(--color-ink-muted)]">
                                  {t.history.rescoreImpact}:{' '}
                                  <span className="font-mono font-semibold text-[var(--color-ink)]" dir="ltr">
                                    {Number(latestAssessment.impact_score).toFixed(2)}
                                  </span>
                                </span>
                              </div>
                            </div>
                            {reportedHours !== null && (
                              <div className="font-mono text-xs text-[var(--color-ink-muted)]" dir="ltr">
                                {reportedHours.toFixed(1)} hrs/day
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <button
                            type="button"
                            data-testid="rescore-button"
                            onClick={handleRescore}
                            disabled={rescoreLoading || measuredHoursAvg <= 0}
                            className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-[var(--color-paper)] bg-[var(--color-accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded cursor-pointer transition-opacity"
                          >
                            {rescoreLoading ? t.history.rescoreLoading : t.history.rescoreBtn}
                          </button>
                          {rescoreError && (
                            <span className="text-xs text-[var(--color-status-high)]">
                              {rescoreError}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION C: Educational paragraph */}
                <div className="p-6 rounded border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
                  <h3 className="text-sm font-serif font-bold text-[var(--color-ink)]">
                    {t.history.whyMattersTitle}
                  </h3>
                  <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                    {t.history.whyMattersP1}
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                    {t.history.whyMattersP2}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
