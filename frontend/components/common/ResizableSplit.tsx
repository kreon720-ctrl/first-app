'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizableSplitProps {
  left: React.ReactNode;
  right: React.ReactNode;
  initialLeftPercent?: number;
  minLeftPercent?: number;
  maxLeftPercent?: number;
}

export function ResizableSplit({
  left,
  right,
  initialLeftPercent = 60,
  minLeftPercent = 25,
  maxLeftPercent = 80,
}: ResizableSplitProps) {
  const [leftPercent, setLeftPercent] = useState(initialLeftPercent);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPercent(Math.min(maxLeftPercent, Math.max(minLeftPercent, pct)));
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [minLeftPercent, maxLeftPercent]);

  return (
    <div ref={containerRef} className="flex-1 flex overflow-hidden">
      {/* Left panel */}
      <div
        className="overflow-hidden flex flex-col"
        style={{ width: `${leftPercent}%` }}
      >
        {left}
      </div>

      {/* Divider */}
      <div
        onMouseDown={onMouseDown}
        className="w-1 flex-shrink-0 bg-gray-200 dark:bg-dark-border hover:bg-primary-400 dark:hover:bg-dark-accent active:bg-primary-500 dark:active:bg-dark-accent-strong cursor-col-resize transition-colors duration-150 relative group"
      >
        {/* 드래그 핸들 표시 */}
        <div className="absolute inset-y-0 -left-1 -right-1" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none">
          <div className="w-0.5 h-3 bg-gray-500 dark:bg-dark-text-muted rounded-full" />
          <div className="w-0.5 h-3 bg-gray-500 dark:bg-dark-text-muted rounded-full" />
          <div className="w-0.5 h-3 bg-gray-500 dark:bg-dark-text-muted rounded-full" />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {right}
      </div>
    </div>
  );
}
