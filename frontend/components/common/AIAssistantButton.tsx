'use client';

import React from 'react';

interface AIAssistantButtonProps {
  className?: string;
  teamId: string;
  teamName: string;
}

export function AIAssistantButton({ className = '', teamId, teamName }: AIAssistantButtonProps) {
  const openAssistant = () => {
    const width = 480;
    const height = 720;
    const left = Math.max(0, window.screen.availWidth - width - 40);
    const top = 80;
    const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`;
    const url = `/ai-assistant?teamId=${encodeURIComponent(teamId)}&teamName=${encodeURIComponent(teamName)}`;
    window.open(url, 'teamworks-ai-assistant', features);
  };

  return (
    <button
      type="button"
      onClick={openAssistant}
      aria-label="AI 버틀러"
      title={`AI 버틀러 찰떡 — ${teamName} 팀 컨텍스트`}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 dark:text-dark-text-muted dark:hover:bg-dark-surface dark:hover:text-dark-text dark:active:bg-dark-elevated transition-colors duration-150 cursor-pointer ${className}`}
    >
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3 13.7 8.3 19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />
        <path d="M18 14 18.7 16 21 16.7 18.7 17.3 18 19.3 17.3 17.3 15.3 16.7 17.3 16z" />
        <path d="M5 4 5.5 5.5 7 6 5.5 6.5 5 8 4.5 6.5 3 6 4.5 5.5z" />
      </svg>
      <span className="hidden sm:inline">AI 버틀러</span>
    </button>
  );
}
