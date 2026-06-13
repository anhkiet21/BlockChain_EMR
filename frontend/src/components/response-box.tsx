'use client';

import { useState } from 'react';

/* ── Syntax highlighter ──────────────────────────────────────────────────
 * Replaces JSON tokens with <span> elements carrying color classes.
 * Runs on the already-stringified JSON string.
 * ──────────────────────────────────────────────────────────────────────── */
function highlight(json: string): React.ReactNode {
  // Split on tokens we care about, keeping the delimiter in the result.
  const TOKEN = /("(?:[^"\\]|\\.)*"(?:\s*:)?|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = TOKEN.exec(json)) !== null) {
    // Push any preceding plain text
    if (match.index > lastIdx) {
      parts.push(json.slice(lastIdx, match.index));
    }

    const token = match[0];

    // Determine token type & color
    let cls = '';
    if (token.endsWith(':')) {
      // JSON key (includes the colon)
      cls = 'text-sky-300';
    } else if (token.startsWith('"')) {
      // String value
      cls = 'text-emerald-400';
    } else if (token === 'true' || token === 'false') {
      cls = 'text-violet-400';
    } else if (token === 'null') {
      cls = 'text-red-400';
    } else {
      // Number
      cls = 'text-amber-400';
    }

    parts.push(
      <span key={keyIdx++} className={cls}>
        {token}
      </span>,
    );

    lastIdx = match.index + token.length;
  }

  // Remaining text after last token
  if (lastIdx < json.length) {
    parts.push(json.slice(lastIdx));
  }

  return <>{parts}</>;
}

/* ── Toggle icon ─────────────────────────────────────────────────────────── */
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/* ── Props ───────────────────────────────────────────────────────────────── */
interface ResponseBoxProps {
  title?: string;
  data: unknown;
}

/* ── Main component ──────────────────────────────────────────────────────── */
export function ResponseBox({ title = 'Kết quả', data }: ResponseBoxProps) {
  // Start collapsed when there's no data
  const [open, setOpen] = useState(data != null);

  const hasData = data != null;
  const json    = hasData ? JSON.stringify(data, null, 2) : null;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 shadow-xl shadow-black/20 overflow-hidden transition-all duration-200">

      {/* ── Header ── */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={
          `w-full flex items-center justify-between gap-3 px-4 py-3 ` +
          `text-left transition-colors duration-150 ` +
          `hover:bg-white/[0.04] focus:outline-none group`
        }
      >
        {/* Left: icon + title */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Terminal icon */}
          <div className="h-6 w-6 rounded-md bg-slate-800 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-white/20 transition-colors">
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>

          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 truncate">
            {title}
          </span>

          {/* Data badge */}
          {hasData ? (
            <span className="badge-emerald text-[10px] flex-shrink-0">JSON</span>
          ) : (
            <span className="badge-slate text-[10px] flex-shrink-0">Trống</span>
          )}
        </div>

        {/* Right: toggle */}
        <span className="text-slate-500 group-hover:text-slate-300 transition-colors">
          <ChevronIcon open={open} />
        </span>
      </button>

      {/* ── Divider ── */}
      {open && <div className="h-px bg-white/5" />}

      {/* ── Body ── */}
      {open && (
        <div className="relative">
          {/* Line numbers column */}
          {hasData && json ? (
            <div className="flex overflow-auto max-h-[480px]">
              {/* Line numbers */}
              <div
                className="select-none flex-shrink-0 px-3 py-4 text-right text-xs leading-5 text-slate-600 bg-black/20 border-r border-white/5"
                aria-hidden="true"
              >
                {json.split('\n').map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Code */}
              <pre className="flex-1 px-4 py-4 text-xs leading-5 text-slate-300 font-[JetBrains_Mono,Fira_Code,monospace] whitespace-pre overflow-x-auto">
                {highlight(json)}
              </pre>
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <svg
                className="h-8 w-8 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm text-slate-500">Không có dữ liệu</p>
              <p className="text-xs text-slate-600">Kết quả sẽ xuất hiện ở đây</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
