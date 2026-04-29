'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { tokenManager } from '@/lib/tokenManager';

interface Source {
  // RAG 결과 (TEAM WORKS 공식 문서)
  source_file?: string;
  section_path?: string;
  score?: number;
  // Open WebUI 웹 검색 결과
  title?: string;
  url?: string;
  // 일정(schedule) 결과 — startAt/endAt 은 ISO 8601
  startAt?: string;
  endAt?: string;
}

type AnswerSource = 'rag' | 'web' | 'schedule' | 'blocked';

interface PendingAction {
  tool: string;
  args: Record<string, unknown>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'error' | 'system';
  content: string;
  sources?: Source[];
  // 답변 출처 — 'rag'(TEAM WORKS 공식 문서) 또는 'web'(Open WebUI 웹검색)
  answerSource?: AnswerSource;
  pendingAction?: PendingAction;
  preview?: string;
  // Once the user confirms or cancels, we flip this so the card stops
  // rendering its action buttons.
  actionResolved?: 'confirmed' | 'cancelled';
  // 다중 턴 일정 등록 — 직전 user 질문이 정보 부족이라 후속 답변을 기다리는 상태.
  // 다음 user 입력이 들어오면 previousQuestion 과 합쳐 재요청.
  awaitingInput?: { needs: string; previousQuestion: string };
}

// 단일 진입점 — 사용자가 자유롭게 묻고, 시스템이 자동으로 의도를 분류.
const EXAMPLE_QUESTIONS = [
  '포스트잇 색깔 종류 알려줘',
  '오늘 뉴스 검색해줘',
  '오늘 일정 알려줘',
  '내일 오후 3시 주간회의 등록해줘',
];

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// 스트리밍 첫 토큰 도착 전까지 보일 placeholder. 실제 토큰이 들어오면 swap 됨.
const THINKING_PLACEHOLDER = 'Thinking...';

// content 가 placeholder 상태인지 판정. progress(🔎)·Thinking·완전 빈 문자열 모두 placeholder.
function isPlaceholderContent(content: string): boolean {
  if (!content) return true;
  if (content === THINKING_PLACEHOLDER) return true;
  if (content.startsWith('🔎')) return true;
  return false;
}

interface AIAssistantPanelProps {
  teamId: string;
  teamName: string;
  // 팀 페이지 우측 탭 안에 임베드될 땐 헤더가 탭에 흡수되어 false. 직접 URL(/ai-assistant?...) fallback 일 땐 true.
  showHeader?: boolean;
}

export function AIAssistantPanel({ teamId, teamName, showHeader = false }: AIAssistantPanelProps) {
  const queryClient = useQueryClient();
  const userHint = useMemo(() => {
    if (!teamId) return undefined;
    return `현재 사용자가 선택한 기본 팀: "${teamName}" (teamId=${teamId}). 사용자가 별도의 팀을 지정하지 않으면 이 팀을 대상으로 조회/등록하세요.`;
  }, [teamId, teamName]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '안녕하세요! AI 버틀러 찰떡입니다.\n팀웍스 사용법(📚 공식 문서)·일반 질문(🌐 웹 검색)·우리 팀 일정 조회·등록(📅) 모두 자유롭게 물어봐 주세요. 시스템이 자동으로 적절한 경로로 답변합니다.\n(일정 수정·삭제, 프로젝트·채팅 작업은 화면에서 직접 처리해 주세요.)',
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

    // 다중 턴 — 직전 assistant 메시지가 awaitingInput 이면 두 turn 을 합쳐 재요청.
    // (서버는 stateless — 합친 한 question 으로 새 parse 시도.)
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    const pendingTurn = lastAssistant?.awaitingInput;
    const effectiveQuestion = pendingTurn
      ? `${pendingTurn.previousQuestion}\n그리고 ${trimmed}`
      : trimmed;

    // 사용자 화면에는 사용자가 입력한 그대로 표시.
    const userMsg: Message = { id: newId(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
      };
      // 일정 조회·등록 의도는 서버에서 JWT 강제. 토큰이 있으면 항상 동봉해 backend 권한 검증을 거치게 함.
      const token = tokenManager.getAccessToken();
      if (token) headers['authorization'] = `Bearer ${token}`;

      // 모든 의도를 SSE 로 처리 — token / pending-action / blocked 모두 stream 안에서 분기.
      const useStream = true;

      const res = await fetch('/api/ai-assistant/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: effectiveQuestion,
          teamId,
          teamName,
          userHint,
          stream: useStream,
        }),
      });

      if (!res.ok) {
        // 에러는 JSON 으로 옴 (stream 시작 전)
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `요청 실패 (${res.status})`);
      }

      // === SSE stream — 모든 의도(usage / general / schedule_query / schedule_create / blocked) ===
      const msgId = newId();
      // placeholder 메시지 추가. 첫 실제 토큰 도착 시 swap.
      setMessages((prev) => [
        ...prev,
        { id: msgId, role: 'assistant', content: THINKING_PLACEHOLDER },
      ]);

      if (!res.body) throw new Error('스트림 응답을 받지 못했습니다.');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let streamError: string | null = null;

      // SSE meta 의 source(rag/web/schedule/blocked)를 메시지의 answerSource 로 매핑.
      const mapSource = (s: unknown): AnswerSource | undefined => {
        if (s === 'rag' || s === 'web' || s === 'schedule' || s === 'blocked') return s;
        return undefined;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const t = line.trim();
          if (!t || !t.startsWith('data:')) continue;
          const data = t.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const evt = JSON.parse(data);
            if (evt.type === 'meta') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgId ? { ...m, answerSource: mapSource(evt.source) } : m
                )
              );
            } else if (evt.type === 'progress' && typeof evt.text === 'string') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgId && isPlaceholderContent(m.content)
                    ? { ...m, content: evt.text }
                    : m
                )
              );
            } else if (evt.type === 'token' && typeof evt.text === 'string') {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== msgId) return m;
                  const swap = isPlaceholderContent(m.content);
                  return {
                    ...m,
                    content: swap ? evt.text : m.content + evt.text,
                  };
                })
              );
            } else if (evt.type === 'sources' && Array.isArray(evt.sources)) {
              setMessages((prev) =>
                prev.map((m) => (m.id === msgId ? { ...m, sources: evt.sources } : m))
              );
            } else if (evt.type === 'awaiting-input' && typeof evt.previousQuestion === 'string') {
              // 다중 턴 — 정보 부족. 다음 user 입력에서 합쳐 재요청.
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgId
                    ? {
                        ...m,
                        awaitingInput: {
                          needs: typeof evt.needs === 'string' ? evt.needs : 'unknown',
                          previousQuestion: evt.previousQuestion,
                        },
                      }
                    : m
                )
              );
            } else if (evt.type === 'pending-action' && evt.pendingAction) {
              // schedule_create — 사용자 승인 카드. content 는 evt.text(요약), pendingAction 부착.
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgId
                    ? {
                        ...m,
                        content:
                          typeof evt.text === 'string' && evt.text
                            ? evt.text
                            : '아래 내용으로 일정 등록할까요?',
                        pendingAction: evt.pendingAction,
                        preview: evt.preview,
                      }
                    : m
                )
              );
            } else if (evt.type === 'error') {
              streamError = String(evt.message || '스트림 오류');
            }
          } catch {
            // JSON 파싱 실패 라인 무시
          }
        }
      }

      if (streamError) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, role: 'error', content: streamError! } : m
          )
        );
      } else {
        // content 가 placeholder 인 채로 끝났으면 안내 문구로 교체.
        // 단 pendingAction 이 부착되어 있으면 content 가 placeholder 라도 그대로 둠 (confirm 카드).
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId &&
            !m.pendingAction &&
            (isPlaceholderContent(m.content) || !m.content.trim())
              ? { ...m, content: '(빈 응답)' }
              : m
          )
        );
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
      // 일정 등록 후 좌측 캘린더 자동 갱신 — 모든 schedules 쿼리(view×date 조합) 무효화.
      // 도구가 createSchedule 인 경우만이지만, 향후 다른 도구도 같은 패턴으로 추가하면 됨.
      if (target.pendingAction.tool === 'createSchedule' && teamId) {
        queryClient.invalidateQueries({ queryKey: ['schedules', teamId] });
      }
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          content: '완료했어요. 캘린더에 반영됐어요. ✓',
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

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-base">
      {/* Header — 탭 임베드 시 비표시(showHeader=false), 직접 URL fallback 시 표시 */}
      {showHeader && (
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
      )}

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
            <span>답변 생성 중…</span>
          </div>
        )}

        {messages.length <= 1 && !isLoading && (
          <div className="pt-2">
            <p className="text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-2">예시 질문</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.map((q) => (
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
      <div className="border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 pt-3 pb-3 shrink-0">
        <div className="flex items-stretch gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder="사용법·일반 질문·우리 팀 일정 조회·등록 모두 자유롭게 물어보세요. (Enter 전송, Shift+Enter 줄바꿈)"
            className="flex-1 resize-none max-h-56 min-h-[88px] rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-base px-4 py-2.5 text-sm font-normal text-gray-800 dark:text-dark-text leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-accent focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-dark-text-disabled transition-colors duration-150 disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed dark:disabled:bg-dark-elevated dark:disabled:border-dark-border dark:disabled:text-dark-text-disabled"
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
          Answered by gemma4:26b · 사용법은 공식 문서, 일정은 팀 DB, 그 외엔 웹 검색으로 답해요.
        </p>
      </div>
    </div>
  );
}

// 답변 카드 하단의 출처 뱃지 — RAG(공식 문서) vs Web(웹검색) 색상·아이콘 분리
function SourceBadge({ source, sources }: { source: AnswerSource; sources: Source[] }) {
  if (source === 'rag') {
    if (sources.length === 0) {
      return (
        <p className="text-[11px] text-amber-700 dark:text-[#FFB800] pl-1">
          📚 TEAM WORKS 공식 문서 기반
        </p>
      );
    }
    return (
      <details className="text-xs text-amber-800 dark:text-[#FFB800] pl-1">
        <summary className="cursor-pointer hover:text-amber-900 dark:hover:text-amber-300 select-none">
          📚 TEAM WORKS 공식 문서 {sources.length}건 참조
        </summary>
        <ul className="mt-1.5 space-y-0.5 pl-3">
          {sources.map((s, i) => (
            <li key={i} className="flex gap-2 text-gray-600 dark:text-dark-text-muted">
              {typeof s.score === 'number' && (
                <span className="tabular-nums text-gray-400 dark:text-dark-text-disabled">
                  {s.score.toFixed(2)}
                </span>
              )}
              <span className="truncate">
                <span>{s.source_file}</span>
                <span className="text-gray-400 dark:text-dark-text-disabled"> :: </span>
                <span className="text-gray-700 dark:text-dark-text">{s.section_path}</span>
              </span>
            </li>
          ))}
        </ul>
      </details>
    );
  }

  if (source === 'schedule') {
    return (
      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 pl-1">
        📅 우리 팀 일정 {sources.length}건
      </p>
    );
  }

  if (source === 'blocked') {
    return (
      <p className="text-[11px] text-gray-500 dark:text-dark-text-muted pl-1">
        🚫 지원하지 않는 요청
      </p>
    );
  }

  // source === 'web'
  if (sources.length === 0) {
    return (
      <p className="text-[11px] text-blue-700 dark:text-blue-400 pl-1">
        🌐 웹 검색 기반
      </p>
    );
  }
  return (
    <details className="text-xs text-blue-700 dark:text-blue-400 pl-1">
      <summary className="cursor-pointer hover:text-blue-900 dark:hover:text-blue-300 select-none">
        🌐 웹 검색 {sources.length}건 참조
      </summary>
      <ul className="mt-1.5 space-y-0.5 pl-3">
        {sources.map((s, i) => (
          <li key={i} className="truncate">
            {s.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 dark:text-blue-400 hover:underline"
              >
                {s.title || s.url}
              </a>
            ) : (
              <span className="text-gray-600 dark:text-dark-text-muted">{s.title || '(출처 미상)'}</span>
            )}
          </li>
        ))}
      </ul>
    </details>
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

        {message.answerSource && (
          <SourceBadge
            source={message.answerSource}
            sources={message.sources ?? []}
          />
        )}
        {/* answerSource 가 없는 과거(혹은 agent 모드) 메시지에 대한 폴백 표시 */}
        {!message.answerSource && message.sources && message.sources.length > 0 && (
          <details className="text-xs text-gray-500 dark:text-dark-text-muted pl-1">
            <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-dark-text select-none">
              참고한 문서 {message.sources.length}건
            </summary>
            <ul className="mt-1.5 space-y-0.5 pl-3">
              {message.sources.map((s, i) => (
                <li key={i} className="flex gap-2">
                  {typeof s.score === 'number' && (
                    <span className="tabular-nums text-gray-400 dark:text-dark-text-disabled">
                      {s.score.toFixed(2)}
                    </span>
                  )}
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
