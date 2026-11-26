import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import type { Language } from '../types';
import { translations } from '../i18n';
import {
  createPairingToken,
  fetchUserScreentime,
  revokePairingToken,
  type ScreentimeSummaryResponse,
} from '../api';
import { getFriendlyPlatformName } from '../utils/platformNames';
import { BrainPulseIcon } from './BrainPulseIcon';

interface PairingCardProps {
  language: Language;
  username: string;
}

// Memoized 7-day sparkline to prevent re-renders on parent state changes
const Sparkline = React.memo(({ data }: { data: any[] }) => (
  <div dir="ltr" className="w-[180px] h-[40px] shrink-0">
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
        <Line
          type="monotone"
          dataKey="hours"
          stroke="var(--color-accent)"
          strokeWidth={1.75}
          connectNulls={false}
          isAnimationActive={false}
          dot={{ fill: 'var(--color-accent)', r: 2.5, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
));

export const PairingCard: React.FC<PairingCardProps> = ({ language, username }) => {
  const t = translations[language];

  const [screentime, setScreentime] = useState<ScreentimeSummaryResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const loadScreentime = useCallback(async () => {
    if (!username) return;
    try {
      const data = await fetchUserScreentime(username, 7);
      setScreentime(data);
      if (data?.token_active && modalOpen) {
        setModalOpen(false);
        setGeneratedToken(null);
      }
    } catch {
      // Quiet fallback if not available
    }
  }, [username, modalOpen]);

  useEffect(() => {
    loadScreentime();
  }, [loadScreentime]);

  const isConnected = !!screentime?.token_active;

  // Auto-close modal if token_active becomes true
  useEffect(() => {
    if (screentime?.token_active && modalOpen) {
      setModalOpen(false);
      setGeneratedToken(null);
    }
  }, [screentime?.token_active, modalOpen]);

  // Window focus refetch trigger
  useEffect(() => {
    const onFocus = () => {
      if (isConnected) {
        loadScreentime();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isConnected, loadScreentime]);

  // 60-second polling interval in State 3, paused when tab is hidden
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      loadScreentime();
    }, 60000);
    return () => clearInterval(interval);
  }, [isConnected, loadScreentime]);

  const handleGenerateToken = async () => {
    setGenerating(true);
    setTokenError(null);
    try {
      const res = await createPairingToken(username);
      setGeneratedToken(res.token);
    } catch (err: any) {
      setTokenError(err.message || 'Failed to generate pairing token');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedToken) return;
    try {
      await navigator.clipboard.writeText(generatedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
    }
  };

  const handleCloseModal = async () => {
    setModalOpen(false);
    setGeneratedToken(null);
    setTokenError(null);
    await loadScreentime();
    setTimeout(() => {
      loadScreentime();
    }, 3000);
  };

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await revokePairingToken(username);
      setConfirmingRevoke(false);
      setScreentime(null);
      await loadScreentime();
    } catch {
      setConfirmingRevoke(false);
    } finally {
      setRevoking(false);
    }
  };

  const formatRelativeTime = (isoString: string | null): string => {
    if (!isoString) return t.pairing.neverSynced;
    let s = isoString.trim();
    if (!s.endsWith('Z') && !s.includes('+')) {
      s = s.replace(' ', 'T') + 'Z';
    }
    const past = new Date(s).getTime();
    if (isNaN(past)) return t.pairing.neverSynced;
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

  // 7-day sparkline data mapping
  const sparklineData = useMemo(() => {
    if (!screentime?.by_day) return [];
    const list: { date: string; hours: number | null }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const sec = screentime.by_day[dateStr];
      const hours = typeof sec === 'number' ? Math.round((sec / 3600) * 10) / 10 : null;
      list.push({ date: dateStr, hours });
    }
    return list;
  }, [screentime?.by_day]);

  const validDataPointsCount = useMemo(() => {
    return sparklineData.filter((d) => d.hours !== null).length;
  }, [sparklineData]);

  // Today's total hours from by_day
  const todayHoursFormatted = useMemo(() => {
    if (!screentime?.by_day) return '0.0';
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    const todaySec = screentime.by_day[todayStr] || 0;
    return (todaySec / 3600).toFixed(1);
  }, [screentime?.by_day]);

  // Top 3 domains with friendly names
  const top3DomainsText = useMemo(() => {
    if (!screentime?.by_domain || screentime.by_domain.length === 0) {
      return t.pairing.noSitesTracked;
    }
    return screentime.by_domain
      .slice(0, 3)
      .map((item) => getFriendlyPlatformName(item.domain))
      .join(' · ');
  }, [screentime?.by_domain, t.pairing.noSitesTracked]);

  return (
    <>
      <div id="mindpulse-pairing-card" className="paper-card p-6 mt-8">
        {!isConnected ? (
          /* State 1: Unpaired */
          <div className="space-y-4">
            {/* Header / Badge */}
            <div className="flex items-center gap-2 text-xs font-mono font-medium tracking-wider text-[var(--color-ink-muted)] uppercase">
              <BrainPulseIcon size={20} className="w-5 h-5 text-[var(--color-ink-muted)]" />
              <span>{t.pairing.optionalBadge}</span>
            </div>

            {/* Title & Desc */}
            <div className="space-y-1.5">
              <h3 className="font-editorial text-[22px] font-semibold text-[var(--color-ink)] leading-snug">
                {t.pairing.trackTitle}
              </h3>
              <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
                {t.pairing.trackDesc}
              </p>
            </div>

            {/* 3 things it tracks mini-list */}
            <ul className="space-y-1 text-[13px] text-[var(--color-ink-muted)] list-none pl-0">
              <li>{t.pairing.trackList1}</li>
              <li>{t.pairing.trackList2}</li>
              <li>{t.pairing.trackList3}</li>
            </ul>

            {/* Connect Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-semibold text-[var(--color-ink)] transition-colors shadow-xs cursor-pointer"
              >
                <span>{t.pairing.connectBtn}</span>
              </button>
            </div>

            <p className="text-[11px] text-[var(--color-ink-faint)]">
              {t.pairing.helperText}
            </p>
            <p className="text-[12px] text-[var(--color-ink-muted)]/70 max-w-[55ch] leading-relaxed">
              {t.pairing.subdomainHonesty}
            </p>
          </div>
        ) : (
          /* State 3: Connected */
          <div className="space-y-4">
            {/* Row 1 — Header row: Icon + Label on left, Revoke link on right */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-medium tracking-wider text-[var(--color-accent)] uppercase">
                <BrainPulseIcon size={20} className="w-5 h-5 text-[var(--color-accent)]" />
                <span>{t.pairing.connectedBadge}</span>
              </div>
              {!confirmingRevoke ? (
                <button
                  type="button"
                  onClick={() => setConfirmingRevoke(true)}
                  className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-status-high)] hover:underline cursor-pointer bg-transparent border-0 p-0 transition-colors"
                >
                  {t.pairing.revokeLink}
                </button>
              ) : null}
            </div>

            {/* Row 2 — Heading */}
            <h3 className="font-editorial text-[22px] font-semibold text-[var(--color-ink)] leading-snug">
              {t.pairing.connectedTitle}
            </h3>

            {/* Row 3 — The important line (Last data received + Refresh) */}
            <div className="flex items-center gap-1.5 text-[15px] text-[var(--color-ink)]">
              <span>{t.pairing.lastDataReceived}</span>
              <span className="font-medium tabular-nums">
                {formatRelativeTime(screentime?.last_ingest_at || null)}
              </span>
              <button
                type="button"
                onClick={() => loadScreentime()}
                className="text-xs text-[var(--color-accent)] hover:underline cursor-pointer bg-transparent border-0 p-0 font-medium ml-1"
              >
                [{t.pairing.refresh}]
              </button>
            </div>

            {/* Row 4 — Activity summary: Sparkline + Stat block */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 pt-1 pb-1">
              {/* Sparkline column */}
              {validDataPointsCount === 0 ? (
                <div className="text-xs text-[var(--color-ink-faint)] italic py-1">
                  {t.pairing.noDataLast7Days}
                </div>
              ) : validDataPointsCount === 1 ? (
                <div
                  dir="ltr"
                  className="w-[180px] h-[40px] shrink-0 flex items-center justify-center bg-[var(--color-paper-subtle)] rounded-sm"
                  title="Single data point"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
                </div>
              ) : (
                <Sparkline data={sparklineData} />
              )}

              {/* Two-line stat block to the right */}
              <div className="flex flex-col justify-center space-y-0.5">
                <div className="font-editorial text-xl font-medium text-[var(--color-ink)] tabular-nums leading-none">
                  {t.pairing.todayHours(todayHoursFormatted)}
                </div>
                <div
                  dir="ltr"
                  className="text-xs text-[var(--color-ink-muted)] truncate max-w-[340px]"
                  title={top3DomainsText}
                >
                  {top3DomainsText}
                </div>
              </div>
            </div>

            {/* Revoke confirmation box if active */}
            {confirmingRevoke && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md bg-[var(--color-status-high-bg)] border border-[var(--color-status-high)]/30 text-xs">
                <span className="text-[var(--color-ink)] font-medium">
                  {t.pairing.revokeConfirm}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={revoking}
                    onClick={handleRevoke}
                    className="px-3 py-1 rounded bg-[var(--color-status-high)] hover:opacity-90 text-[var(--color-surface)] font-medium cursor-pointer transition-opacity disabled:opacity-50"
                  >
                    {revoking ? '…' : t.pairing.revokeYes}
                  </button>
                  <button
                    type="button"
                    disabled={revoking}
                    onClick={() => setConfirmingRevoke(false)}
                    className="px-3 py-1 rounded border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] font-medium cursor-pointer transition-colors"
                  >
                    {t.pairing.revokeCancel}
                  </button>
                </div>
              </div>
            )}

            {/* Row 5 — Sync status footer */}
            <div className="text-xs text-[var(--color-ink-muted)] pt-2 border-t border-[var(--color-border)] flex flex-wrap items-center gap-1.5">
              <span>{t.pairing.connectedSince}</span>
              <span className="tabular-nums">
                {formatRelativeTime(screentime?.token_created_at || null)}
              </span>
              <span className="text-[var(--color-ink-faint)]">·</span>
              <span>{t.pairing.lastSyncLabel}</span>
              <span className="tabular-nums">
                {formatRelativeTime(screentime?.last_ingest_at || null)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* State 2: Modal Open */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-ink)]/35"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-[640px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl p-6 relative">
            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] rounded hover:bg-[var(--color-paper-subtle)] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-editorial text-xl font-semibold text-[var(--color-ink)] mb-6">
              {t.pairing.modalTitle}
            </h3>

            <div className="space-y-5 text-xs text-[var(--color-ink-muted)]">
              {/* Step 1 */}
              <div className="p-4 rounded-md border border-[var(--color-border)] bg-[var(--color-paper-subtle)] space-y-1">
                <div className="font-semibold text-[var(--color-ink)] text-sm">
                  {t.pairing.step1Title}
                </div>
                <p className="leading-relaxed">
                  {t.pairing.step1Desc}
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-md border border-[var(--color-border)] bg-[var(--color-paper-subtle)] space-y-2">
                <div className="font-semibold text-[var(--color-ink)] text-sm">
                  {t.pairing.step2Title}
                </div>
                {!generatedToken ? (
                  <div>
                    <button
                      type="button"
                      disabled={generating}
                      onClick={handleGenerateToken}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-surface)] text-xs font-semibold tracking-wide transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {generating ? t.pairing.step2Generating : t.pairing.step2Btn}
                    </button>
                    {tokenError && (
                      <p className="text-xs text-[var(--color-status-high)] mt-2">
                        {tokenError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="font-mono text-xs bg-[var(--color-surface)] border border-[var(--color-border-strong)] p-2.5 rounded flex items-center justify-between gap-3">
                      <span className="truncate select-all text-[var(--color-ink)] font-semibold">
                        {generatedToken}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-surface)] text-[11px] font-medium transition-colors cursor-pointer shrink-0"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>{t.pairing.step2Copied}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{t.pairing.step2Copy}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-[var(--color-status-medium)] font-medium">
                      {t.pairing.step2Warning}
                    </p>
                  </div>
                )}
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-md border border-[var(--color-border)] bg-[var(--color-paper-subtle)] space-y-1">
                <div className="font-semibold text-[var(--color-ink)] text-sm">
                  {t.pairing.step3Title}
                </div>
                <p className="leading-relaxed">
                  {t.pairing.step3Desc}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2 rounded-md bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-surface)] text-xs font-semibold tracking-wide transition-colors cursor-pointer"
              >
                {t.pairing.modalDone}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
