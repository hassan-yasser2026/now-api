import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-now-600 text-white shadow-md shadow-now-600/20 hover:-translate-y-0.5 hover:bg-now-700 hover:shadow-lg",
  secondary:
    "bg-now-100 text-now-700 hover:bg-now-100/70",
  outline:
    "border border-now-600/25 bg-white text-now-700 hover:border-now-600 hover:bg-now-50",
};

export function UIButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold transition duration-200 disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function UILinkButton({
  children,
  href,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  href: string;
  variant?: ButtonVariant;
  className?: string;
}) {
  return (
    <a
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold transition duration-200 ${variants[variant]} ${className}`}
      href={href}
    >
      {children}
    </a>
  );
}
