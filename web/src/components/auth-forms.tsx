"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { UIInput } from "@/components/ui-input";

type AuthFormProps = {
  mode: "login" | "register";
};

type ApiResult = {
  success?: boolean;
  message?: string;
  data?: {
    pendingApproval?: boolean;
    phoneVerificationRequired?: boolean;
    message?: string;
  };
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const isRegister = mode === "register";
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError("");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    if (
      isRegister &&
      String(payload.password) !== String(payload.confirmPassword)
    ) {
      setError(t("passwordMismatch"));
      setPending(false);
      return;
    }

    try {
      const response = await fetch(
        isRegister ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success) {
        setError(result.message || t("operationFailed"));
        return;
      }

      if (
        result.data?.pendingApproval ||
        result.data?.phoneVerificationRequired
      ) {
        setMessage(
          result.data.message ||
            (result.data.phoneVerificationRequired
              ? t("registeredVerified")
              : t("registeredReview")),
        );
        return;
      }

      const requestedPath = searchParams.get("next");
      const nextPath =
        requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
          ? requestedPath
          : "/account";
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError(t("connectionFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {isRegister && (
        <UIInput
          autoComplete="name"
          icon={<PersonIcon />}
          label={t("fullName")}
          maxLength={100}
          minLength={2}
          name="name"
          placeholder={t("namePlaceholder")}
          required
          type="text"
        />
      )}

      <UIInput
        autoComplete="tel"
        hint={t("phoneHint")}
        icon={<PhoneIcon />}
        inputMode="tel"
        label={t("phone")}
        name="phone"
        placeholder="+201xxxxxxxxx"
        required
        type="tel"
      />

      {isRegister && (
        <UIInput
          autoComplete="email"
          icon={<MailIcon />}
          label={t("email")}
          name="email"
          placeholder="name@example.com"
          type="email"
        />
      )}

      <UIInput
        autoComplete={isRegister ? "new-password" : "current-password"}
        hint={isRegister ? t("passwordHint") : undefined}
        icon={<LockIcon />}
        label={t("password")}
        minLength={isRegister ? 8 : undefined}
        name="password"
        placeholder={isRegister ? t("passwordPlaceholder") : t("enterPassword")}
        required
        type="password"
      />

      {isRegister && (
        <UIInput
          autoComplete="new-password"
          icon={<LockIcon />}
          label={t("confirmPassword")}
          minLength={8}
          name="confirmPassword"
          placeholder={t("confirmPlaceholder")}
          required
          type="password"
        />
      )}

      {error && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold leading-6 text-emerald-900"
          role="status"
        >
          {message}
        </p>
      )}

      <button
        className="mt-1 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-now-600 px-5 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(18,107,87,0.2)] transition duration-200 hover:-translate-y-0.5 hover:bg-now-700 hover:shadow-lg disabled:cursor-wait disabled:opacity-70"
        disabled={pending}
        type="submit"
      >
        {pending && (
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
          />
        )}
        {pending
          ? t("processing")
          : isRegister
            ? t("createCustomerAccount")
            : t("login")}
      </button>

      <p className="pt-1 text-center text-sm text-now-900/55">
        {isRegister ? t("haveAccount") : t("needAccount")}
        <Link
          className="font-extrabold text-now-700 underline decoration-now-600/30 underline-offset-4 transition hover:text-now-900"
          href={isRegister ? "/login" : "/register"}
        >
          {isRegister ? t("loginLink") : t("createAccountLink")}
        </Link>
      </p>
    </form>
  );
}

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

function PersonIcon() {
  return (
    <IconFrame>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </IconFrame>
  );
}

function PhoneIcon() {
  return (
    <IconFrame>
      <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M10 17h4" />
    </IconFrame>
  );
}

function MailIcon() {
  return (
    <IconFrame>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="m4 7 8 6 8-6" />
    </IconFrame>
  );
}

function LockIcon() {
  return (
    <IconFrame>
      <rect height="10" rx="2" width="14" x="5" y="11" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4m-4 4v2" />
    </IconFrame>
  );
}
