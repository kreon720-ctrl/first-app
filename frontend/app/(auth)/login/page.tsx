// Login Page - S-01

import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <>
      {/* Logo / Title */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          Team CalTalk
        </h1>
        <p className="text-base font-normal text-gray-600 mt-2">
          팀 캘린더 + 채팅
        </p>
      </div>

      {/* Login Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <LoginForm />

        {/* Error message area (handled by form) */}

        {/* Signup link */}
        <div className="mt-6 text-center">
          <span className="text-sm font-normal text-gray-600">
            계정이 없으신가요?{' '}
          </span>
          <Link
            href="/signup"
            className="text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors duration-150"
          >
            회원가입 →
          </Link>
        </div>
      </div>
    </>
  );
}
