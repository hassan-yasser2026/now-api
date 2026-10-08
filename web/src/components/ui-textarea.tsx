import type { TextareaHTMLAttributes } from "react";

export function UITextarea({
  label,
  hint,
  id,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
}) {
  const inputId = id || props.name;
  return (
    <div className="grid gap-2">
      <label className="text-sm font-extrabold text-now-900" htmlFor={inputId}>
        {label}
      </label>
      <textarea
        className={`min-h-32 w-full resize-y rounded-2xl border border-now-900/10 bg-white px-4 py-3 text-sm leading-7 text-now-900 shadow-sm outline-none transition placeholder:text-now-900/40 focus:border-now-500 focus:ring-4 focus:ring-now-500/10 ${className}`}
        id={inputId}
        {...props}
      />
      {hint && <p className="text-xs leading-5 text-now-900/50">{hint}</p>}
    </div>
  );
}
