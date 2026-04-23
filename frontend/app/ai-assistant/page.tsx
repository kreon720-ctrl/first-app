'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Source {
  source_file: string;
  section_path: string;
  score: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  sources?: Source[];
}

const EXAMPLE_QUESTIONS = [
  '업무보고 어떻게 보내?',
  '팀에 어떻게 가입해?',
  '포스트잇 색깔 종류 알려줘',
  '프로젝트 삭제하면 하위 일정 어떻게 돼?',
];

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '안녕하세요! AI 버틀러 찰떡입니다. 팀웍스 사용법에 대해 편하게 물어봐 주세요.',
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
      const res = await fetch('/api/ai-assistant/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `요청 실패 (${res.status})`);
      }
      const assistantMsg: Message = {
        id: newId(),
        role: 'assistant',
        content: typeof data.answer === 'string' ? data.answer.trim() : '',
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendQuestion(input);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-center gap-2 h-14 px-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-900 shrink-0">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* 안테나 */}
            <line x1="12" y1="6" x2="12" y2="3" />
            <circle cx="12" cy="2.5" r="0.8" fill="currentColor" stroke="none" />
            {/* 머리 */}
            <rect x="5" y="6" width="14" height="11" rx="2" />
            {/* 눈 */}
            <circle cx="9" cy="11" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="15" cy="11" r="1.2" fill="currentColor" stroke="none" />
            {/* 입 */}
            <path d="M9 14.5h6" strokeLinecap="round" />
            {/* 귀 */}
            <path d="M5 11H3M19 11h2" />
          </svg>
        </div>
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <h1 className="text-base font-semibold text-gray-900">AI 버틀러 찰떡</h1>
          <span className="text-xs text-gray-400">TEAM WORKS 사용 안내</span>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
            </span>
            <span>답변 생성 중…</span>
          </div>
        )}

        {messages.length <= 1 && !isLoading && (
          <div className="pt-2">
            <p className="text-xs font-medium text-gray-500 mb-2">예시 질문</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendQuestion(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 bg-white px-3 pt-3 pb-16 shrink-0">
        <div className="flex items-stretch gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="TEAM WORKS 사용법을 물어보세요. (Enter 전송, Shift+Enter 줄바꿈)"
            className="flex-1 resize-none max-h-56 min-h-[88px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent placeholder:text-gray-400"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => sendQuestion(input)}
            disabled={!input.trim() || isLoading}
            className="inline-flex items-center justify-center self-stretch px-5 rounded-lg bg-primary-500 text-white text-sm font-medium shadow-sm hover:bg-primary-600 active:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            전송
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400 text-center">
          Answered by gemma2:9b · 기능 외 질문에는 답하지 않습니다.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary-500 text-white px-3.5 py-2 text-sm whitespace-pre-wrap break-words shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }
  if (message.role === 'error') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-error-50 border border-error-200 text-error-700 px-3.5 py-2 text-sm whitespace-pre-wrap break-words">
          <p className="font-medium mb-1">오류가 발생했어요</p>
          <p className="text-xs">{message.content}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-2">
        <div className="rounded-2xl rounded-bl-sm bg-white border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 whitespace-pre-wrap break-words shadow-sm">
          {message.content || '(빈 응답)'}
        </div>
        {message.sources && message.sources.length > 0 && (
          <details className="text-xs text-gray-500 pl-1">
            <summary className="cursor-pointer hover:text-gray-700 select-none">
              참고한 문서 {message.sources.length}건
            </summary>
            <ul className="mt-1.5 space-y-0.5 pl-3">
              {message.sources.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="tabular-nums text-gray-400">
                    {s.score.toFixed(2)}
                  </span>
                  <span className="truncate">
                    <span className="text-gray-600">{s.source_file}</span>
                    <span className="text-gray-400"> :: </span>
                    <span className="text-gray-700">{s.section_path}</span>
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
