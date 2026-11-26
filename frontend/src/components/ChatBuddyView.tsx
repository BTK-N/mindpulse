import React, { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check } from 'lucide-react';
import type { Language, ChatMessageItem } from '../types';
import { translations } from '../i18n';
import { sendChatMessage } from '../api';
import { Botanical } from './Botanical';

interface ChatBuddyViewProps {
  language: Language;
  username: string;
}

export const ChatBuddyView: React.FC<ChatBuddyViewProps> = ({ language, username }) => {
  const t = translations[language];

  // Client-side session timeline starting empty
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 84)}px`;
    }
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessageItem = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setLoading(true);
    setError(null);
    setFailedMessage(null);

    try {
      const res = await sendChatMessage(textToSend, language, username);
      const botMsg: ChatMessageItem = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setError(t.chat.error);
      setFailedMessage(textToSend);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (failedMessage) {
      const msg = failedMessage;
      setFailedMessage(null);
      setError(null);
      handleSend(msg);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className={`flex flex-col h-[calc(100dvh-5.5rem)] max-w-3xl mx-auto ${language === 'Urdu' ? 'font-urdu' : ''}`}>
      
      {/* Header with Botanical Chapter Ornament */}
      <header className="border-b border-[var(--color-border)] pb-3 shrink-0 relative">
        <div className="relative inline-block">
          <h1 className="font-editorial text-2xl font-semibold text-[var(--color-ink)] tracking-tight">
            {t.chat.title}
          </h1>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
            {t.chat.subtitle}
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

      {/* Message Timeline or Empty State */}
      <div data-lenis-prevent className="flex-1 overflow-y-auto py-6 space-y-1 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-md mx-auto space-y-5">
            <p className="text-xs text-[var(--color-ink-muted)]">
              {t.chat.emptyNotice}
            </p>
            <div className="flex flex-col gap-2 w-full">
              {t.chat.starterChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(chip)}
                  className="h-8 px-3 border border-[var(--color-border-strong)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] text-[var(--color-ink-muted)] text-[13px] rounded transition-colors text-left flex items-center justify-between"
                >
                  <span className="truncate">{chip}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isSameRoleAsPrev = idx > 0 && messages[idx - 1].role === msg.role;
              const spacingClass = isSameRoleAsPrev ? 'mt-2' : 'mt-4';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} ${spacingClass} group`}
                >
                  {isUser ? (
                    <div className="max-w-[85%] sm:max-w-[70%]">
                      <div
                        dir="auto"
                        className="bg-[var(--color-ink)] text-[var(--color-paper)] px-4 py-2.5 rounded-lg text-[15px] leading-6 whitespace-pre-wrap break-words"
                      >
                        {msg.content}
                      </div>
                      <div className="text-[12px] text-[var(--color-ink-faint)] mt-1 text-right tabular-nums">
                        {msg.timestamp}
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[85%] sm:max-w-[65ch]">
                      <div
                        dir="auto"
                        className="text-[var(--color-ink)] text-[15px] leading-6 whitespace-pre-wrap break-words"
                      >
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[12px] text-[var(--color-ink-faint)] tabular-nums">{msg.timestamp}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="inline-flex items-center gap-1 text-[11px] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-opacity sm:opacity-0 group-hover:opacity-100"
                          title={t.chat.copy}
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                              <span className="text-[var(--color-accent)] font-medium">{t.chat.copied}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{t.chat.copy}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="text-xs text-[var(--color-ink-faint)] italic py-2">
                {t.chat.typing}
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error State with Retry Button */}
      {error && (
        <div className="flex items-center justify-between text-xs px-3 py-2 bg-[var(--color-status-high-bg)] border border-[var(--color-status-high)] text-[var(--color-status-high)] rounded-md mb-2 shrink-0">
          <span>{error}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="underline font-semibold hover:opacity-80 shrink-0 ml-2"
          >
            {t.chat.retry}
          </button>
        </div>
      )}

      {/* Message Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 shrink-0 rounded-t-lg shadow-sm"
      >
        <div className="flex items-end gap-2.5">
          <textarea
            ref={textareaRef}
            dir="auto"
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t.chat.placeholder}
            data-lenis-prevent
            className="flex-1 max-h-24 min-h-[40px] px-3 py-2 bg-[var(--color-paper)] border border-[var(--color-border)] rounded-md text-xs sm:text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] resize-none overflow-y-auto leading-5"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-md bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-paper)] flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

    </div>
  );
};
