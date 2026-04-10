import React from 'react';

type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: InputType;
  error?: string | boolean;
  label?: string;
  helperText?: string;
  maxLength?: number;
}

export function Input({
  type = 'text',
  error = false,
  label,
  helperText,
  className = '',
  id,
  maxLength,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const hasError = typeof error === 'string' ? true : error;
  const errorMessage = typeof error === 'string' ? error : undefined;

  const baseStyles =
    'w-full border rounded-xl bg-white px-4 py-2.5 text-base font-normal text-gray-900 placeholder:text-gray-400 shadow-sm transition-colors duration-150 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed';

  const defaultStyles = 'border-gray-300 focus:ring-primary-500';
  const errorStyles = 'border-error-500 bg-error-50 focus:ring-error-500';

  const inputStyles = hasError ? errorStyles : defaultStyles;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        type={type}
        id={inputId}
        className={`${baseStyles} ${inputStyles} ${className}`}
        maxLength={maxLength}
        {...props}
      />
      {errorMessage && (
        <p className="text-sm font-normal text-error-500" role="alert">
          {errorMessage}
        </p>
      )}
      {helperText && !errorMessage && (
        <p className={`text-sm font-normal ${hasError ? 'text-error-500' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
}
