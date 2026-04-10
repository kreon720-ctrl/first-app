'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLogin } from '@/hooks/query/useAuth';
import { ApiError } from '@/lib/apiClient';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const router = useRouter();
  const login = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const isFormValid = email.trim() !== '' && password.trim() !== '';

  const clearGeneralError = () => {
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }));
    }
  };

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) {
      setErrors((prev) => ({ ...prev, email: '이메일을 입력해주세요.' }));
      return false;
    }
    if (!emailRegex.test(value)) {
      setErrors((prev) => ({ ...prev, email: '올바른 이메일 형식이 아닙니다.' }));
      return false;
    }
    setErrors((prev) => ({ ...prev, email: undefined }));
    return true;
  };

  const validatePassword = (value: string): boolean => {
    if (!value) {
      setErrors((prev) => ({ ...prev, password: '비밀번호를 입력해주세요.' }));
      return false;
    }
    setErrors((prev) => ({ ...prev, password: undefined }));
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      await login.mutateAsync({ email: email.trim(), password });

      // Set auth cookie for middleware detection
      if (typeof window !== 'undefined') {
        document.cookie = 'auth-initialized=true; path=/; max-age=604800'; // 7 days
      }

      onSuccess?.();
      router.push('/');
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setErrors((prev) => ({
          ...prev,
          general: '이메일 또는 비밀번호가 올바르지 않습니다.',
        }));
      } else {
        const errorMessage = error instanceof Error ? error.message : undefined;
        // Only show generic Korean message if error message is not a raw API error
        if (errorMessage && !errorMessage.includes('HTTP error') && errorMessage !== 'Unauthorized') {
          setErrors((prev) => ({
            ...prev,
            general: errorMessage,
          }));
        } else {
          setErrors((prev) => ({
            ...prev,
            general: '로그인 중 오류가 발생했습니다.',
          }));
        }
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <Input
        type="email"
        label="이메일"
        placeholder="user@example.com"
        value={email}
        onChange={(e) => { setEmail(e.target.value); clearGeneralError(); }}
        onBlur={() => validateEmail(email)}
        error={errors.email}
        disabled={login.isPending}
        autoComplete="email"
      />

      <Input
        type="password"
        label="비밀번호"
        placeholder="••••••••"
        value={password}
        onChange={(e) => { setPassword(e.target.value); clearGeneralError(); }}
        onBlur={() => validatePassword(password)}
        error={errors.password}
        disabled={login.isPending}
        autoComplete="current-password"
      />

      {errors.general && (
        <div
          className="flex items-center gap-2 rounded-lg bg-error-50 p-3 text-sm text-error-500"
          role="alert"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {errors.general}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="md"
        fullWidth
        disabled={!isFormValid || login.isPending}
        loading={login.isPending}
      >
        {login.isPending ? '로그인 중...' : '로그인'}
      </Button>
    </form>
  );
}
