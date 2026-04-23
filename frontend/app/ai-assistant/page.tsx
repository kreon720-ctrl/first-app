'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { tokenManager } from '@/lib/tokenManager';

interface Source {
  source_file: string;
  section_path: string;
  score: number;
}

interface PendingAction {
  tool: string;
  args: Record<string, unknown>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'error' | 'system';
  content: string;
  sources?: Source[];
  pendingAction?: PendingAction;
  preview?: string;
  // Once the user confirms or cancels, we flip this so the card stops
  // rendering its action buttons.
  actionResolved?: 'confirmed' | 'cancelled';
}

type Mode = 'guide' | 'agent';

const EXAMPLE_QUESTIONS_GUIDE = [
  '업무보고 어떻게 보내?',
  '팀에 어떻게 가입해?',
  '포스트잇 색깔 종류 알려줘',
  '프로젝트 삭제하면 하위 일정 어떻게 돼?',
];

const EXAMPLE_QUESTIONS_AGENT = [
  '내 팀 목록 보여줘',
  '오늘 일정 알려줘',
  '내일 오후 3시 주간회의 일정 등록해줘',
  '다음 주 월요일 회의 일정 있는지 확인해줘',
];

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AIAssistantPage() {
  const searchParams = useSearchParams();
  const teamId = searchParams.get('teamId') ?? '';
  const teamName = searchParams.get('teamName') ?? '';
  const userHint = useMemo(() => {
    if (!teamId) return undefined;
    return `현재 사용자가 선택한 기본 팀: "${teamName}" (teamId=${teamId}). 사용자가 별도의 팀을 지정하지 않으면 이 팀을 대상으로 조회/등록하세요.`;
  }, [teamId, teamName]);

  const [mode, setMode] = useState<Mode>('guide');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '안녕하세요! AI 버틀러 찰떡입니다. 팀웍스 사용법에 대해 편하게 물어봐 주세요. (실행 모드로 바꾸면 팀·일정 조회·등록도 부탁할 수 있어요.)',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { id: newId(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
      };
      if (mode === 'agent') {
        const token = tokenManager.getAccessToken();
        if (!token) {
          throw new Error(
            '실행 모드는 로그인이 필요합니다. 메인 화면에서 먼저 로그인해 주세요.'
          );
        }
        headers['authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/ai-assistant/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ question: trimmed, mode, userHint }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `요청 실패 (${res.status})`);
      }

      if (data?.kind === 'confirm' && data.pendingAction) {
        const assistantMsg: Message = {
          id: newId(),
          role: 'assistant',
          content: data.answer || '아래 내용으로 실행할까요?',
          pendingAction: data.pendingAction,
          preview: data.preview,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const assistantMsg: Message = {
          id: newId(),
          role: 'assistant',
          content:
            typeof data.answer === 'string' ? data.answer.trim() : '',
          sources: Array.isArray(data.sources) ? data.sources : [],
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: 'error', content: message },
      ]);
    } finally {
      setIsLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  async function confirmPendingAction(msgId: string) {
    const target = messages.find((m) => m.id === msgId);
    if (!target?.pendingAction || target.actionResolved) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, actionResolved: 'confirmed' } : m))
    );
    setIsLoading(true);
    try {
      const token = tokenManager.getAccessToken();
      if (!token) throw new Error('로그인이 필요합니다.');
      const res = await fetch('/api/ai-assistant/execute', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(target.pendingAction),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `실행 실패 (${res.status})`);
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          content: '완료했어요.',
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: 'error', content: message },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function cancelPendingAction(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, actionResolved: 'cancelled' } : m))
    );
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: 'system', content: '실행을 취소했어요.' },
    ]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendQuestion(input);
    }
  }

  const examples =
    mode === 'agent' ? EXAMPLE_QUESTIONS_AGENT : EXAMPLE_QUESTIONS_GUIDE;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-dark-base">
      {/* Header */}
      <header className="flex items-center justify-center gap-2 h-14 px-4 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-elevated text-gray-900 dark:text-[#FFB800] shrink-0">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="6" x2="12" y2="3" />
            <circle cx="12" cy="2.5" r="0.8" fill="currentColor" stroke="none" />
            <rect x="5" y="6" width="14" height="11" rx="2" />
            <circle cx="9" cy="11" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="15" cy="11" r="1.2" fill="currentColor" stroke="none" />
            <path d="M9 14.5h6" strokeLinecap="round" />
            <path d="M5 11H3M19 11h2" />
          </svg>
        </div>
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <h1 className="text-base font-semibold text-gray-900 dark:text-[#FFB800]">AI 버틀러 찰떡이</h1>
          {teamName ? (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-700 dark:bg-[#FFB800]/15 dark:text-[#FFB800]">
              {teamName}
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-dark-text-disabled">TEAM WORKS</span>
          )}
        </div>
      </header>

      {/* Mode toggle */}
      <div className="flex items-center justify-center gap-1 px-3 py-2 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border shrink-0">
        <ModeTab label="안내 모드" desc="사용법 Q&A" active={mode === 'guide'} onClick={() => setMode('guide')} />
        <ModeTab label="실행 모드" desc="팀·일정 조회/등록" active={mode === 'agent'} onClick={() => setMode('agent')} />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onConfirm={() => confirmPendingAction(msg.id)}
            onCancel={() => cancelPendingAction(msg.id)}
          />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-muted">
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-dark-text-disabled animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-dark-text-disabled animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-dark-text-disabled animate-bounce" />
            </span>
            <span>{mode === 'agent' ? '처리 중…' : '답변 생성 중…'}</span>
          </div>
        )}

        {messages.length <= 1 && !isLoading && (
          <div className="pt-2">
            <p className="text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-2">예시 질문</p>
            <div className="flex flex-wrap gap-2">
              {examples.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendQuestion(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-700 dark:text-dark-text-muted hover:border-primary-300 dark:hover:border-dark-accent hover:text-primary-700 dark:hover:text-dark-accent transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 pt-3 pb-16 shrink-0">
        <div className="flex items-stretch gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder={
              mode === 'agent'
                ? '팀·일정을 조회하거나 일정을 등록해 달라고 말씀해 주세요. (Enter 전송, Shift+Enter 줄바꿈)'
                : 'TEAM WORKS 사용법을 물어보세요. (Enter 전송, Shift+Enter 줄바꿈)'
            }
            className="flex-1 resize-none max-h-56 min-h-[88px] rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-base px-4 py-2.5 text-sm font-normal text-gray-800 dark:text-dark-text leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-accent focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-dark-text-disabled transition-colors duration-150 disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => sendQuestion(input)}
            disabled={!input.trim() || isLoading}
            className="inline-flex items-center justify-center gap-1 rounded-lg py-[9px] px-3 text-xs font-medium transition-colors duration-150 bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed dark:bg-dark-accent-strong dark:text-gray-900 dark:hover:bg-white dark:disabled:bg-dark-elevated dark:disabled:text-dark-text-disabled self-start"
          >
            {isLoading ? (
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : '전송'}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400 dark:text-dark-text-disabled text-center">
          {mode === 'agent'
            ? 'Powered by gemma2:9b + MCP · 등록·수정 전에 확인 카드로 알려드려요.'
            : 'Answered by gemma2:9b · 기능 외 질문에는 답하지 않습니다.'}
        </p>
      </div>
    </div>
  );
}

function ModeTab({
  label,
  desc,
  active,
  onClick,
}: {
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 max-w-[200px] flex flex-col items-center rounded-lg px-3 py-1.5 text-xs transition-colors ${
        active
          ? 'bg-primary-50 text-primary-700 dark:bg-dark-elevated dark:text-[#FFB800]'
          : 'text-gray-500 dark:text-dark-text-muted hover:bg-gray-50 dark:hover:bg-dark-elevated'
      }`}
    >
      <span className="font-semibold">{label}</span>
      <span className="text-[10px] opacity-70">{desc}</span>
    </button>
  );
}

function MessageBubble({
  message,
  onConfirm,
  onCancel,
}: {
  message: Message;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary-500 dark:bg-dark-accent-strong text-white dark:text-gray-900 px-3.5 py-2 text-sm whitespace-pre-wrap break-words shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }
  if (message.role === 'error') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-error-50 dark:bg-dark-error-container border border-error-200 dark:border-transparent text-error-700 dark:text-dark-error px-3.5 py-2 text-sm whitespace-pre-wrap break-words">
          <p className="font-medium mb-1">오류가 발생했어요</p>
          <p className="text-xs">{message.content}</p>
        </div>
      </div>
    );
  }
  if (message.role === 'system') {
    return (
      <div className="flex justify-center">
        <span className="text-[11px] text-gray-400 dark:text-dark-text-disabled">
          {message.content}
        </span>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-2">
        <div className="rounded-2xl rounded-bl-sm bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border px-3.5 py-2.5 text-sm text-gray-800 dark:text-dark-text whitespace-pre-wrap break-words shadow-sm dark:shadow-none">
          {message.content || '(빈 응답)'}
        </div>

        {message.pendingAction && !message.actionResolved && (
          <div className="flex gap-2 pl-2">
            <button
              type="button"
              onClick={onConfirm}
              className="px-3 py-1 rounded-md bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 dark:bg-[#FFB800] dark:text-gray-900 dark:hover:bg-[#E6A600]"
            >
              승인
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 dark:bg-dark-surface dark:text-dark-text-muted dark:hover:bg-dark-elevated"
            >
              취소
            </button>
          </div>
        )}
        {message.pendingAction && message.actionResolved && (
          <p className="text-[11px] text-gray-500 dark:text-dark-text-muted pl-2">
            {message.actionResolved === 'confirmed' ? '승인됨' : '취소됨'}
          </p>
        )}

        {message.sources && message.sources.length > 0 && (
          <details className="text-xs text-gray-500 dark:text-dark-text-muted pl-1">
            <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-dark-text select-none">
              참고한 문서 {message.sources.length}건
            </summary>
            <ul className="mt-1.5 space-y-0.5 pl-3">
              {message.sources.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="tabular-nums text-gray-400 dark:text-dark-text-disabled">
                    {s.score.toFixed(2)}
                  </span>
                  <span className="truncate">
                    <span className="text-gray-600 dark:text-dark-text-muted">{s.source_file}</span>
                    <span className="text-gray-400 dark:text-dark-text-disabled"> :: </span>
                    <span className="text-gray-700 dark:text-dark-text">{s.section_path}</span>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
