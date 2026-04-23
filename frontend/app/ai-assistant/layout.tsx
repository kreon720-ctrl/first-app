import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TEAM WORKS AI 버틀러 · 찰떡',
};

export default function AIAssistantLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
