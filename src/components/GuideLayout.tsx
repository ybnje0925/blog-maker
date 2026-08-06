import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, CheckCircle2, Clock, ListTree } from "lucide-react";

export interface GuideTocItem {
  id: string;
  text: string;
  level: 2 | 3;
  line: number;
}

export interface GuideArticleData {
  slug: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  updatedAt: string;
  readingTime: string;
  body: string[];
  content?: string;
  relatedSlugs: string[];
}

function getNodeText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(getNodeText).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(children)) return getNodeText(children.props.children);
  return "";
}

export function slugifyHeading(text: string) {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
      .replace(/\s+/g, "-") || "section"
  );
}

export function extractToc(markdown: string): GuideTocItem[] {
  const counts = new Map<string, number>();
  const items: GuideTocItem[] = [];
  const lines = markdown.split("\n");

  lines.forEach((line, index) => {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) return;

    const level = match[1].length as 2 | 3;
    const text = match[2].trim();
    const baseId = slugifyHeading(text);
    const nextCount = (counts.get(baseId) || 0) + 1;
    counts.set(baseId, nextCount);
    items.push({ id: nextCount === 1 ? baseId : `${baseId}-${nextCount}`, text, level, line: index + 1 });
  });

  return items;
}

function GuideSummaryBox({ article }: { article: GuideArticleData }) {
  return (
    <aside className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-7 text-slate-700">
      <h2 className="text-sm font-black text-slate-950">핵심 요약</h2>
      <p className="mt-2">{article.summary}</p>
    </aside>
  );
}

function ChecklistBox({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <h2 className="text-base font-black text-slate-950">발행 전 체크리스트</h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GuideTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-[560px] w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

function GuideToc({ items }: { items: GuideTocItem[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <nav className="rounded-lg border border-slate-200 bg-white p-4">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between text-left text-sm font-black text-slate-950 md:hidden">
        <span className="inline-flex items-center gap-2">
          <ListTree className="h-4 w-4 text-blue-700" />
          목차
        </span>
        <span className="text-xs text-blue-700">{open ? "접기" : "펼치기"}</span>
      </button>
      <h2 className="hidden items-center gap-2 text-sm font-black text-slate-950 md:flex">
        <ListTree className="h-4 w-4 text-blue-700" />
        목차
      </h2>
      <ol className={`${open ? "mt-3 block" : "hidden"} space-y-2 md:mt-3 md:block`}>
        {items.map((item) => (
          <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
            <a href={`#${item.id}`} className="text-sm leading-6 text-slate-600 hover:text-blue-700 hover:underline">
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function extractChecklist(markdown: string): string[] {
  const checklistSection = markdown.split(/^##\s+체크리스트\s*$/m)[1]?.split(/^##\s+/m)[0] || "";
  return checklistSection
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, ""));
}

function enhanceBeforeAfterExamples(markdown: string) {
  const markers = new Set(["수정 전:", "수정 후:", "단순 표현 수정:", "경험을 추가한 수정:"]);
  const lines = markdown.split("\n");
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!markers.has(line)) {
      output.push(lines[index]);
      continue;
    }

    let nextIndex = index + 1;
    while (nextIndex < lines.length && lines[nextIndex].trim() === "") nextIndex += 1;
    const nextLine = lines[nextIndex]?.trim() || "";

    if (!nextLine || nextLine.startsWith("#") || nextLine.startsWith("- ") || nextLine.startsWith("|")) {
      output.push(lines[index]);
      continue;
    }

    output.push(`> **${line}**`);
    output.push(`> ${nextLine}`);
    index = nextIndex;
  }

  return output.join("\n");
}

export function GuideArticleLayout({
  article,
  relatedArticles,
}: {
  article: GuideArticleData;
  relatedArticles: GuideArticleData[];
}) {
  const markdown = article.content || article.body.join("\n\n");
  const displayMarkdown = useMemo(() => enhanceBeforeAfterExamples(markdown), [markdown]);
  const tocItems = useMemo(() => extractToc(markdown), [markdown]);
  const checklistItems = useMemo(() => extractChecklist(markdown), [markdown]);
  const headingIdsByLine = useMemo(() => new Map(tocItems.map((item) => [item.line, item.id])), [tocItems]);

  function headingIdForNode(children: React.ReactNode, node?: { position?: { start?: { line?: number } } }) {
    const line = node?.position?.start?.line;
    if (line && headingIdsByLine.has(line)) return headingIdsByLine.get(line);
    return slugifyHeading(getNodeText(children));
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-[780px]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">{article.category}</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{article.title}</h1>
        <p className="mt-4 text-base leading-8 text-slate-600">{article.summary}</p>

        <dl className="mt-5 grid gap-2 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600 sm:grid-cols-3">
          <div>
            <dt className="font-bold text-slate-900">작성일</dt>
            <dd className="mt-1">{article.publishedAt}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-900">마지막 업데이트</dt>
            <dd className="mt-1">{article.updatedAt}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-900">예상 읽기 시간</dt>
            <dd className="mt-1 inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-700" />
              {article.readingTime}
            </dd>
          </div>
        </dl>

        {tocItems.length > 0 && <div className="mt-6"><GuideToc items={tocItems} /></div>}

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="space-y-5 text-[17px] leading-8 text-slate-700">
            <ReactMarkdown
              children={displayMarkdown}
              remarkPlugins={[remarkGfm]}
              components={{
                h1: () => null,
                h2: ({ children, node }) => <h2 id={headingIdForNode(children, node)} className="scroll-mt-24 pt-6 text-2xl font-black leading-tight text-slate-950">{children}</h2>,
                h3: ({ children, node }) => <h3 id={headingIdForNode(children, node)} className="scroll-mt-24 pt-4 text-lg font-black leading-tight text-slate-900">{children}</h3>,
                p: ({ children }) => {
                  return <p>{children}</p>;
                },
                ul: ({ children }) => <ul className="list-disc space-y-2 pl-5">{children}</ul>,
                li: ({ children }) => <li className="leading-7">{children}</li>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-300 bg-blue-50 px-4 py-3 text-slate-700">{children}</blockquote>,
                table: ({ children }) => <GuideTable>{children}</GuideTable>,
                th: ({ children }) => <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 font-black text-slate-900">{children}</th>,
                td: ({ children }) => <td className="border-b border-slate-200 px-3 py-2 align-top">{children}</td>,
                a: ({ href, children }) => <Link to={href || "#"} className="font-bold text-blue-700 underline underline-offset-2">{children}</Link>,
              }}
            />
          </div>
        </section>

        <div className="mt-6">
          {checklistItems.length > 0 ? <ChecklistBox items={checklistItems} /> : <GuideSummaryBox article={article} />}
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-black text-slate-950">관련 글</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {relatedArticles.map((related) => (
              <Link key={related.slug} to={`/guide/${related.slug}`} className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm">
                <p className="text-[11px] font-bold text-blue-700">{related.category}</p>
                <h3 className="mt-2 text-sm font-black leading-5 text-slate-950">{related.title}</h3>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{related.summary}</p>
                <p className="mt-3 text-[11px] font-bold text-slate-500">{related.readingTime} · {related.updatedAt}</p>
              </Link>
            ))}
          </div>
        </section>

        <Link to="/guide" className="mt-8 inline-flex items-center gap-2 text-sm font-black text-blue-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          가이드 목록으로 돌아가기
        </Link>
      </article>
    </main>
  );
}
