// Login Page - S-01

import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <>
      {/* Logo / Title */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2">
          {/* logo_v.svg를 CSS mask로 사용해 앰버골드 채색 */}
          <span
            role="img"
            aria-label="TEAM WORKS 로고"
            className="block w-9 h-9 bg-amber-400"
            style={{
              WebkitMaskImage: 'url(/imgs/logo_v.svg)',
              maskImage: 'url(/imgs/logo_v.svg)',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
            }}
          />
          <h1 className="text-2xl font-bold text-white leading-tight tracking-tight">
            TEAM WORKS
          </h1>
        </div>
      </div>

      {/* Login Form — frosted glass 카드 */}
      <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-2xl shadow-black/40">
        <LoginForm />

        {/* Signup link */}
        <div className="mt-6 text-center">
          <span className="text-sm font-normal text-white/60">
            계정이 없으신가요?{' '}
          </span>
          <Link
            href="/signup"
            className="text-sm font-medium text-dark-accent hover:text-dark-accent-strong transition-colors duration-150"
          >
            회원가입 →
          </Link>
        </div>
      </div>
    </>
  );
}
