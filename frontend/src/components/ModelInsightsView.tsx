import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { Language } from '../types';
import { translations } from '../i18n';
import { Botanical } from './Botanical';

interface ModelInsightsViewProps {
  language: Language;
}

interface AlgorithmBenchmark {
  name: string;
  accuracy: number;
  isUsed: boolean;
}

interface FeatureInfluence {
  name: string;
  weight: number;
}

export const ModelInsightsView: React.FC<ModelInsightsViewProps> = ({ language }) => {
  const t = translations[language];
  const isUrdu = language === 'Urdu';

  // Chart 1 Data: 6 algorithms sorted descending
  const algorithmData: AlgorithmBenchmark[] = [
    { name: 'Logistic Regression', accuracy: 79.52, isUsed: true },
    { name: 'Random Forest', accuracy: 78.31, isUsed: false },
    { name: 'XGBoost', accuracy: 77.11, isUsed: false },
    { name: 'Gradient Boosting', accuracy: 75.90, isUsed: false },
    { name: 'Decision Tree', accuracy: 71.08, isUsed: false },
    { name: 'SVM', accuracy: 62.65, isUsed: false },
  ];

  // Chart 2 Data: Top 5 extracted feature weights
  const featureData: FeatureInfluence[] = [
    { name: isUrdu ? 'ذہنی کیفیت کا اسکور' : 'Mental well-being score', weight: 29.8 },
    { name: isUrdu ? 'مجموعی اثر کا اسکور' : 'Overall screen impact', weight: 10.1 },
    { name: isUrdu ? 'توجہ میں دشواری' : 'Concentration difficulty', weight: 9.5 },
    { name: isUrdu ? 'توجہ کا بھٹکنا' : 'Focus disruption', weight: 5.5 },
    { name: isUrdu ? 'سوشل میڈیا پر موازنہ' : 'Social comparison', weight: 4.3 },
  ];

  const renderAlgorithmTick = (props: any) => {
    const { x, y, payload } = props;
    const isLR = payload.value === 'Logistic Regression';
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={isLR ? -92 : -8}
          y={4}
          textAnchor="end"
          fill="var(--color-ink-muted)"
          fontSize={11}
          fontFamily="sans-serif"
        >
          {payload.value}
        </text>
        {isLR && (
          <g transform="translate(-86, -7)">
            <rect
              x={0}
              y={0}
              width={80}
              height={16}
              rx={4}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={1}
            />
            <text
              x={40}
              y={11.5}
              textAnchor="middle"
              fill="var(--color-accent)"
              fontSize={9}
              fontWeight={500}
              fontFamily="sans-serif"
            >
              {t.insights.usedInApp}
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <div className={`max-w-[880px] mx-auto space-y-10 pb-16 ${isUrdu ? 'font-urdu' : ''}`}>
      
      {/* View Header with Botanical Chapter Ornament */}
      <div className="relative">
        <div className="relative inline-block">
          <h1 className="text-2xl font-serif font-bold text-[var(--color-ink)] tracking-tight">
            {t.insights.title}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] mt-1">
            {t.insights.subtitle}
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

      {/* KPI Strip: Tabular, muted, one line, zero cards */}
      <div className="text-xs font-mono text-[var(--color-ink-muted)] py-2 border-y border-[var(--color-border)] tabular-nums">
        {t.insights.kpiStrip}
      </div>

      {/* Chart 1: Algorithm Comparison */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">
          {t.insights.chart1Title}
        </h2>

        <div className="w-full h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={algorithmData}
              margin={{ top: 8, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="0"
                stroke="var(--color-border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 70, 80, 100]}
                unit="%"
                stroke="var(--color-ink-faint)"
                tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={220}
                stroke="var(--color-ink-faint)"
                tick={renderAlgorithmTick}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
              />
              <ReferenceLine
                x={70}
                stroke="var(--color-ink-muted)"
                strokeDasharray="3 3"
                label={{
                  value: t.insights.baseline70,
                  position: 'top',
                  fill: 'var(--color-ink-faint)',
                  fontSize: 10,
                }}
              />
              <Tooltip
                isAnimationActive={true}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as AlgorithmBenchmark;
                    return (
                      <div className="bg-[var(--color-ink)] text-[var(--color-paper)] px-2.5 py-1.5 rounded-[4px] text-xs space-y-0.5 shadow-none border-none">
                        <div className="font-semibold">{d.name}</div>
                        <div className="font-mono text-[11px] opacity-90">
                          {d.accuracy.toFixed(2)}%
                        </div>
                        {d.isUsed && (
                          <div className="text-[10px] text-[var(--color-accent)] font-medium">
                            {t.insights.usedInApp}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="accuracy"
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
                animationBegin={200}
                barSize={14}
              >
                {algorithmData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isUsed ? 'var(--color-accent)' : 'var(--color-border)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Captions */}
        <div className="space-y-0.5 pt-1">
          <p className="text-xs text-[var(--color-ink-muted)]">
            {t.insights.chart1Caption1}
          </p>
          <p className="text-[11px] font-mono text-[var(--color-ink-faint)]">
            {t.insights.chart1Caption2}
          </p>
        </div>
      </div>

      {/* Chart 2: Feature Weights / Influence */}
      <div className="space-y-3 pt-4 border-t border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">
          {t.insights.chart2Title}
        </h2>

        <div className="w-full h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={featureData}
              margin={{ top: 8, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="0"
                stroke="var(--color-border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, 35]}
                ticks={[0, 10, 20, 30]}
                unit="%"
                stroke="var(--color-ink-faint)"
                tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                stroke="var(--color-ink-faint)"
                tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
              />
              <Tooltip
                isAnimationActive={true}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as FeatureInfluence;
                    return (
                      <div className="bg-[var(--color-ink)] text-[var(--color-paper)] px-2.5 py-1.5 rounded-[4px] text-xs space-y-0.5 shadow-none border-none">
                        <div className="font-semibold">{d.name}</div>
                        <div className="font-mono text-[11px] opacity-90">
                          {d.weight.toFixed(1)}% influence
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="weight"
                fill="var(--color-accent)"
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
                animationBegin={200}
                barSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Caption */}
        <div className="space-y-0.5 pt-1">
          <p className="text-xs text-[var(--color-ink-muted)]">
            {t.insights.chart2Caption}
          </p>
          <p className="text-[11px] font-mono text-[var(--color-ink-faint)]">
            Source: extracted from .pkl
          </p>
        </div>
      </div>

      {/* Prose Section 1: Why Logistic Regression */}
      <section className="space-y-3 pt-6 border-t border-[var(--color-border)]">
        <h2 className="text-base font-semibold text-[var(--color-ink)]">
          {t.insights.whyTitle}
        </h2>
        <div className="space-y-3 text-xs sm:text-sm text-[var(--color-ink)] leading-relaxed max-w-[75ch]">
          <p>{t.insights.whyP1}</p>
          <p>{t.insights.whyP2}</p>
          <p>{t.insights.whyP3}</p>
        </div>
      </section>

      {/* Prose Section 2: Limitations */}
      <section className="space-y-3 pt-6 border-t border-[var(--color-border)]">
        <h2 className="text-base font-semibold text-[var(--color-ink)]">
          {t.insights.limitationsTitle}
        </h2>
        <p className="text-xs sm:text-sm text-[var(--color-ink)] leading-relaxed max-w-[75ch]">
          {t.insights.limitationsP}
        </p>
      </section>

      {/* Prose Section 3: Data */}
      <section className="space-y-3 pt-6 border-t border-[var(--color-border)]">
        <h2 className="text-base font-semibold text-[var(--color-ink)]">
          {t.insights.dataTitle}
        </h2>
        <p className="text-xs sm:text-sm text-[var(--color-ink)] leading-relaxed max-w-[75ch]">
          {t.insights.dataP}
        </p>
      </section>

    </div>
  );
};
