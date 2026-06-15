"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";

type ReasonDialogProps = {
  open: boolean;
  title: string;
  description: string;
  label: string;
  confirmLabel: string;
  defaultValue?: string;
  maxLength: number;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
};

export function ReasonDialog({
  open,
  title,
  description,
  label,
  confirmLabel,
  defaultValue = "",
  maxLength,
  busy = false,
  onCancel,
  onConfirm,
}: ReasonDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [reason, setReason] = useState(defaultValue);
  const [touched, setTouched] = useState(false);
  const normalizedReason = reason.trim();
  const invalid = normalizedReason.length < 3;

  useEffect(() => {
    if (!open) return;
    setReason(defaultValue);
    setTouched(false);
    const frame = requestAnimationFrame(() => textareaRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [busy, defaultValue, onCancel, open]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (invalid || busy) return;
    await onConfirm(normalizedReason);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <form
        className="w-full max-w-lg rounded-3xl border border-white bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onSubmit={submit}
      >
        <h2 className="text-xl font-black text-slate-950" id={titleId}>{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600" id={descriptionId}>{description}</p>

        <label className="mt-5 grid gap-2 text-sm font-bold text-slate-700">
          {label}
          <textarea
            ref={textareaRef}
            className="input min-h-32 resize-y"
            required
            minLength={3}
            maxLength={maxLength}
            value={reason}
            disabled={busy}
            onBlur={() => setTouched(true)}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <div className="mt-2 flex items-start justify-between gap-3 text-xs">
          <span className={touched && invalid ? "font-semibold text-red-700" : "text-slate-500"}>
            {touched && invalid ? "Lý do phải có ít nhất 3 ký tự." : "Lý do sẽ được lưu trong nhật ký hệ thống."}
          </span>
          <span className="shrink-0 text-slate-400">{reason.length}/{maxLength}</span>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button className="btn-secondary" type="button" disabled={busy} onClick={onCancel}>Hủy</button>
          <button className="btn-danger" disabled={busy || invalid}>
            {busy ? "Đang xử lý..." : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
