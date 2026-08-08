import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const policyLinks = [
  { to: "/about", label: "서비스 소개" },
  { to: "/privacy", label: "개인정보처리방침" },
  { to: "/terms", label: "이용약관" },
  { to: "/copyright", label: "콘텐츠 및 저작권 안내" },
  { to: "/ai-policy", label: "AI 생성 결과 이용 안내" },
  { to: "/contact", label: "문의하기" },
];

export function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-slate-700">{children}</div>
    </section>
  );
}

export function InfoBox({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-7 text-slate-700">
      {title && <h3 className="mb-2 text-sm font-black text-slate-950">{title}</h3>}
      {children}
    </div>
  );
}

export function ContactInfoBox({ privacy = false }: { privacy?: boolean }) {
  const operatorName = (import.meta.env.VITE_OPERATOR_NAME as string | undefined)?.trim() || "[운영자명 입력 필요]";
  const contactEmail = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || (privacy ? "[개인정보 문의 이메일 입력 필요]" : "[문의 이메일 입력 필요]");

  return (
    <InfoBox title={privacy ? "개인정보 관련 문의" : "문의처"}>
      <ul className="space-y-1">
        <li>운영자: {operatorName}</li>
        <li>문의 이메일: {contactEmail}</li>
        <li>답변 가능 시간: 운영 상황에 따라 순차 답변</li>
      </ul>
    </InfoBox>
  );
}

export function PolicyLayout({
  title,
  description,
  updatedAt = "[시행일 입력 필요]",
  children,
}: {
  title: string;
  description: string;
  updatedAt?: string;
  children: React.ReactNode;
}) {
  const effectiveDate = updatedAt === "[시행일 입력 필요]" ? "2026-08-08" : updatedAt;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/" className="inline-flex items-center gap-2 text-xs font-black text-blue-700 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        홈으로 돌아가기
      </Link>

      <header className="mt-6 border-b border-slate-200 pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">BlogDraft Policy</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
        <p className="mt-4 text-xs font-bold text-slate-500">마지막 업데이트: {effectiveDate}</p>
      </header>

      <article className="mt-8 space-y-9">{children}</article>

      <nav className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="text-sm font-black text-slate-950">관련 안내 페이지</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {policyLinks.map((link) => (
            <Link key={link.to} to={link.to} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700">
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
