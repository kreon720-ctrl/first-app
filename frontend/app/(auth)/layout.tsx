// 인증 레이아웃 — 로그인·회원가입 공용
// 라이트/다크 모드 구분 없이 항상 다크 톤으로 통일.
// 배경: /imgs/login.gif 풀백. 가독성은 카드 자체의 frosted glass 로 확보.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* 배경 GIF — 풀스크린 cover, 오버레이 없이 그대로 노출 */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/imgs/login.gif')" }}
        aria-hidden="true"
      />

      {/* 폼 카드 영역 */}
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
