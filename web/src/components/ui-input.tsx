import type { InputHTMLAttributes, ReactNode } from "react";

export function UIInput({
  label,
  hint,
  icon,
  id,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  icon?: ReactNode;
}) {
  const inputId = id || props.name;
  return (
    <div className="grid gap-2">
      <label className="text-sm font-extrabold text-now-900" htmlFor={inputId}>
        {label}
      </label>
      <div className="flex min-h-12 items-center gap-3 rounded-xl border border-now-900/10 bg-white px-4 shadow-sm transition focus-within:border-now-500 focus-within:ring-4 focus-within:ring-now-500/10">
        {icon && <span className="shrink-0 text-now-600">{icon}</span>}
        <input
          className={`min-w-0 flex-1 bg-transparent text-sm text-now-900 outline-none placeholder:text-now-900/40 ${className}`}
          id={inputId}
          {...props}
        />
      </div>
      {hint && <p className="text-xs leading-5 text-now-900/50">{hint}</p>}
    </div>
  );
}
