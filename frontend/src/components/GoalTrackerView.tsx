import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Language, GoalItem } from '../types';
import { translations } from '../i18n';
import { fetchUserGoals, addUserGoal, toggleUserGoal, deleteUserGoal } from '../api';
import { Botanical } from './Botanical';

interface GoalTrackerViewProps {
  language: Language;
  username: string;
}

type FilterType = 'all' | 'active' | 'completed';

export const GoalTrackerView: React.FC<GoalTrackerViewProps> = ({ language, username }) => {
  const t = translations[language];

  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [initialLoading, setInitialLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [toggleErrorId, setToggleErrorId] = useState<number | null>(null);

  const loadGoals = async () => {
    try {
      setListError(null);
      const data = await fetchUserGoals(username);
      setGoals(data);
    } catch {
      setListError(t.goals.errorLoad);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, [username]);

  const handleAdd = async (textToAdd?: string) => {
    const text = (textToAdd || inputText).trim();
    if (!text || isAdding) return;

    setAddError(null);
    setIsAdding(true);
    try {
      await addUserGoal(username, text);
      if (!textToAdd) setInputText('');
      await loadGoals();
    } catch {
      setAddError(t.goals.errorAdd);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggle = async (goalId: number, currentCompleted: boolean) => {
    const nextStatus = !currentCompleted;
    setToggleErrorId(null);

    // Optimistic update without layout shift
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, completed: nextStatus } : g))
    );

    try {
      await toggleUserGoal(goalId, nextStatus);
    } catch {
      // Revert on failure and flag row
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, completed: currentCompleted } : g))
      );
      setToggleErrorId(goalId);
    }
  };

  const handleDelete = async (goalId: number) => {
    // Optimistic removal
    const previous = goals;
    setGoals((prev) => prev.filter((g) => g.id !== goalId));

    try {
      await deleteUserGoal(goalId);
    } catch {
      setGoals(previous);
    }
  };

  const activeGoalsCount = goals.filter((g) => !g.completed).length;
  const completedGoalsCount = goals.filter((g) => g.completed).length;
  const showMicroHabits = activeGoalsCount <= 2;

  const filteredGoals = goals.filter((g) => {
    if (filter === 'active') return !g.completed;
    if (filter === 'completed') return g.completed;
    return true;
  });

  const isRtl = language === 'Urdu';

  return (
    <div className={`max-w-[720px] mx-auto space-y-6 ${isRtl ? 'font-urdu' : ''}`}>
      
      {/* Page Header with Botanical Chapter Ornament */}
      <header className="border-b border-[var(--color-border)] pb-4 relative">
        <div className="relative inline-block">
          <h1 className="font-editorial text-3xl font-semibold text-[var(--color-ink)] tracking-tight mb-1.5">
            {t.goals.title}
          </h1>
          <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
            {t.goals.subtitle}
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

      {/* Goal Creation Bar */}
      <div className="space-y-2">
        {addError && (
          <div className="text-xs text-[var(--color-status-high)] bg-[var(--color-status-high-bg)] border border-[var(--color-status-high)] px-3 py-2 rounded">
            {addError}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t.goals.addPlaceholder}
            className="flex-1 h-10 px-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-xs sm:text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-faint)] focus:outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isAdding}
            className="h-10 px-4 rounded bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-paper)] text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {t.goals.addBtn}
          </button>
        </form>
      </div>

      {/* Micro-habit Chips (Visible when <= 2 active goals) */}
      {showMicroHabits && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {t.goals.microHabits.map((habit, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAdd(habit)}
                disabled={isAdding}
                className="h-8 px-3 border border-[var(--color-border-strong)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] text-[var(--color-ink-muted)] text-xs rounded transition-colors text-start"
              >
                {habit}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Counters & Filter Navigation */}
      {!initialLoading && (
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2 text-xs">
          
          {/* KPI Counter in Tabular Numerals */}
          <div className="text-[var(--color-ink-muted)] tabular-nums">
            <span className="font-medium text-[var(--color-ink)]">{activeGoalsCount}</span> {t.goals.kpiActive} · <span className="font-medium text-[var(--color-ink)]">{completedGoalsCount}</span> {t.goals.kpiDone}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`transition-colors py-1 ${
                filter === 'all'
                  ? 'text-[var(--color-ink)] font-semibold border-b-2 border-[var(--color-accent)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {t.goals.filterAll}
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`transition-colors py-1 ${
                filter === 'active'
                  ? 'text-[var(--color-ink)] font-semibold border-b-2 border-[var(--color-accent)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {t.goals.filterActive}
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`transition-colors py-1 ${
                filter === 'completed'
                  ? 'text-[var(--color-ink)] font-semibold border-b-2 border-[var(--color-accent)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {t.goals.filterCompleted}
            </button>
          </div>

        </div>
      )}

      {/* Goal Items List or Feedback States */}
      <div className="space-y-0">
        
        {/* Initial Loading */}
        {initialLoading && (
          <div className="py-8 text-center text-xs text-[var(--color-ink-faint)]">
            {t.goals.loadingText}
          </div>
        )}

        {/* List Fetch Error */}
        {!initialLoading && listError && (
          <div className="py-6 text-center space-y-2">
            <p className="text-xs text-[var(--color-status-high)]">{listError}</p>
            <button
              type="button"
              onClick={loadGoals}
              className="text-xs font-medium text-[var(--color-accent)] underline"
            >
              {t.goals.retry}
            </button>
          </div>
        )}

        {/* Empty States */}
        {!initialLoading && !listError && filteredGoals.length === 0 && (
          <div className="py-12 text-center text-xs text-[var(--color-ink-muted)]">
            {filter === 'all' && t.goals.emptyNotice}
            {filter === 'active' && t.goals.emptyTodo}
            {filter === 'completed' && t.goals.emptyDone}
          </div>
        )}

        {/* Goal Rows (Clean list with hairline dividers, 56px height, no layout shift) */}
        {!initialLoading &&
          !listError &&
          filteredGoals.map((goal) => (
            <div key={goal.id} className="border-b border-[var(--color-border)]">
              {toggleErrorId === goal.id && (
                <div className="text-[11px] text-[var(--color-status-high)] py-1">
                  {t.goals.errorToggle}
                </div>
              )}
              <div className="flex items-center justify-between gap-3 min-h-[56px] h-[56px] px-1 group">
                
                {/* Custom Single-Path Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggle(goal.id, goal.completed)}
                  className={`w-5 h-5 rounded-[var(--radius-sm)] border-[1.5px] flex items-center justify-center shrink-0 transition-colors duration-200 ease-out ${
                    goal.completed
                      ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                      : 'border-[var(--color-border-strong)] bg-transparent hover:border-[var(--color-ink-muted)]'
                  }`}
                  aria-label={goal.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {goal.completed && (
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.5 6L5 8.5L9.5 3.5" className="goal-check-path" />
                    </svg>
                  )}
                </button>

                {/* Goal Text with Strikethrough on Complete */}
                <span
                  className={`flex-1 text-xs sm:text-sm text-[var(--color-ink)] select-none truncate ${
                    goal.completed
                      ? 'line-through opacity-40 transition-opacity duration-200'
                      : 'transition-opacity duration-200'
                  }`}
                >
                  {goal.goal_text}
                </span>

                {/* Delete Action (hover desktop, visible mobile) */}
                <button
                  type="button"
                  onClick={() => handleDelete(goal.id)}
                  className="p-1 rounded text-[var(--color-ink-faint)] hover:text-[var(--color-status-high)] transition-opacity sm:opacity-0 group-hover:opacity-100 shrink-0"
                  title="Delete goal"
                  aria-label="Delete goal"
                >
                  <X className="w-4 h-4" />
                </button>

              </div>
            </div>
          ))}

      </div>

    </div>
  );
};
