export function ResponseBox({ title, data }: { title?: string; data: unknown }) {
  if (!data) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
      {title && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>}
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
