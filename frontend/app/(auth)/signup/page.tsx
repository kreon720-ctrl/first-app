// Signup Page - S-02

import Link from 'next/link';
import { SignupForm } from '@/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <>
      {/* Logo / Title */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          Team CalTalk
        </h1>
        <p className="text-base font-normal text-gray-600 mt-2">
          회원가입
        </p>
      </div>

      {/* Signup Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <SignupForm />

        {/* Error message area (handled by form) */}

        {/* Login link */}
        <div className="mt-6 text-center">
          <span className="text-sm font-normal text-gray-600">
            이미 계정이 있으신가요?{' '}
          </span>
          <Link
            href="/login"
            className="text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors duration-150"
          >
            로그인 →
          </Link>
        </div>
      </div>
    </>
  );
}
