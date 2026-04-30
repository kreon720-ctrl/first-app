// Signup Page - S-02

import Link from 'next/link';
import { SignupForm } from '@/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <>
      {/* Logo / Title */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2">
          <img src="/logo.png" alt="TEAM WORKS 로고" className="w-9 h-9" />
          <h1 className="text-2xl font-bold text-white leading-tight tracking-tight">
            TEAM WORKS
          </h1>
        </div>
      </div>

      {/* Signup Form — frosted glass 카드 */}
      <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-2xl shadow-black/40">
        <SignupForm />

        {/* Login link */}
        <div className="mt-6 text-center">
          <span className="text-sm font-normal text-white/60">
            이미 계정이 있으신가요?{' '}
          </span>
          <Link
            href="/login"
            className="text-sm font-medium text-dark-accent hover:text-dark-accent-strong transition-colors duration-150"
          >
            로그인 →
          </Link>
        </div>
      </div>
    </>
  );
}
