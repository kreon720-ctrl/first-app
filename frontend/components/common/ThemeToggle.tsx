'use client';

import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="relative group">
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        onClick={toggle}
        aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
        className={`relative inline-flex h-5 w-8 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent
                    transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
                    ${isDark ? 'bg-gray-500' : 'bg-gray-200'}`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-md
                      transition-transform duration-200 ease-in-out
                      ${isDark ? 'translate-x-3.5' : 'translate-x-0'}`}
        />
      </button>
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
        {isDark ? '라이트 모드 전환' : '다크 모드 전환'}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800 dark:border-b-gray-700" />
      </div>
    </div>
  );
}
