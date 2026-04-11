'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSignup } from '@/hooks/query/useAuth';
import { ApiError } from '@/lib/apiClient';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';

interface SignupFormProps {
  onSuccess?: () => void;
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const router = useRouter();
  const signup = useSignup();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; general?: string }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isFormValid = name.trim() !== '' && email.trim() !== '' && password.trim() !== '';

  // Clear messages when inputs change
  useEffect(() => {
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }));
    }
    if (successMessage) {
      setSuccessMessage(null);
    }
  }, [name, email, password]);

  const validateName = (value: string): boolean => {
    if (!value.trim()) {
      setErrors((prev) => ({ ...prev, name: '이름을 입력해주세요.' }));
      return false;
    }
    if (value.length > 50) {
      setErrors((prev) => ({ ...prev, name: '이름은 최대 50자까지 입력 가능합니다.' }));
      return false;
    }
    setErrors((prev) => ({ ...prev, name: undefined }));
    return true;
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
    if (value.length < 8) {
      setErrors((prev) => ({ ...prev, password: '비밀번호는 최소 8자 이상이어야 합니다.' }));
      return false;
    }
    const hasLetter = /[a-zA-Z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    if (!hasLetter || !hasNumber) {
      setErrors((prev) => ({ ...prev, password: '비밀번호는 영문과 숫자를 포함해야 합니다.' }));
      return false;
    }
    setErrors((prev) => ({ ...prev, password: undefined }));
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isNameValid || !isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      await signup.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      // Set auth cookie for middleware detection
      if (typeof window !== 'undefined') {
        document.cookie = 'auth-initialized=true; path=/; max-age=604800'; // 7 days
      }

      onSuccess?.();
      router.push('/');
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        setErrors((prev) => ({
          ...prev,
          general: '이미 사용 중인 이메일입니다.',
        }));
      } else if (error instanceof ApiError && error.status === 400) {
        setErrors((prev) => ({
          ...prev,
          general: error.message || '입력 정보를 확인해주세요.',
        }));
      } else {
        const errorMessage = error instanceof Error ? error.message : undefined;
        // Only show generic Korean message if error message is not a raw API error
        if (errorMessage && !errorMessage.includes('HTTP error')) {
          setErrors((prev) => ({
            ...prev,
            general: errorMessage,
          }));
        } else {
          setErrors((prev) => ({
            ...prev,
            general: '회원가입 중 오류가 발생했습니다.',
          }));
        }
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <Input
        type="text"
        label="이름"
        placeholder="홍길동"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => validateName(name)}
        error={errors.name}
        disabled={signup.isPending}
        maxLength={50}
        autoComplete="name"
      />

      <Input
        type="email"
        label="이메일"
        placeholder="user@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => validateEmail(email)}
        error={errors.email}
        disabled={signup.isPending}
        autoComplete="email"
      />

      <Input
        type="password"
        label="비밀번호"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={() => validatePassword(password)}
        error={errors.password}
        disabled={signup.isPending}
        autoComplete="new-password"
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

      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-success-50 p-3 text-sm text-success-500" role="status">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {successMessage}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="md"
        fullWidth
        disabled={!isFormValid || signup.isPending}
        loading={signup.isPending}
        className="!bg-gray-900 hover:!bg-gray-800 active:!bg-black disabled:!bg-gray-200 disabled:!text-gray-400"
      >
        {signup.isPending ? '회원가입 중...' : '회원가입'}
      </Button>
    </form>
  );
}
