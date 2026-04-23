import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-500 text-white shadow-sm hover:bg-primary-600 active:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none dark:disabled:bg-dark-elevated dark:disabled:text-dark-text-disabled',
  secondary:
    'bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-muted shadow-sm hover:bg-gray-50 dark:hover:bg-dark-elevated hover:border-gray-400 dark:hover:border-dark-border active:bg-gray-100 dark:active:bg-dark-elevated',
  ghost:
    'bg-transparent text-gray-600 dark:text-dark-text-muted hover:bg-gray-100 dark:hover:bg-dark-surface hover:text-gray-900 dark:hover:text-dark-text active:bg-gray-200 dark:active:bg-dark-elevated',
  danger:
    'bg-error-500 text-white shadow-sm hover:bg-error-700 active:bg-red-800',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-sm font-medium',
  md: 'inline-flex items-center justify-center gap-2 rounded-lg py-2 px-4 text-base font-medium',
  lg: 'inline-flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-base font-semibold',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  children,
  className = '',
  disabled = false,
  ...props
}: ButtonProps) {
  const baseStyles = 'transition-colors duration-150 motion-reduce:transition-none cursor-pointer';
  const disabledStyles = 'disabled:cursor-not-allowed';
  const widthStyles = fullWidth ? 'w-full' : '';

  const combinedClassName = [
    baseStyles,
    disabledStyles,
    widthStyles,
    variantStyles[variant],
    sizeStyles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={combinedClassName} disabled={disabled || loading} {...props}>
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
