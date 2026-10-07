"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import Link from "next/link";
import styles from "./auth-forms.module.css";

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
      setError("كلمتا المرور غير متطابقتين");
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
        setError(result.message || "تعذر إتمام العملية. حاول مرة أخرى.");
        return;
      }

      if (result.data?.pendingApproval || result.data?.phoneVerificationRequired) {
        setMessage(
          result.data.message ||
            "تم استلام التسجيل. راجع بريدك الإلكتروني لإكمال التحقق.",
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
      setError("تعذر الاتصال بخدمة NOW. حاول مرة أخرى.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div>
        <label htmlFor={`${mode}-phone`}>رقم الهاتف</label>
        <input
          id={`${mode}-phone`}
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+201xxxxxxxxx"
          required
        />
      </div>

      {isRegister && (
        <>
          <div>
            <label htmlFor="register-name">الاسم الكامل</label>
            <input
              id="register-name"
              name="name"
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
            />
          </div>
          <div>
            <label htmlFor="register-email">البريد الإلكتروني (اختياري)</label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
            />
          </div>
        </>
      )}

      <div>
        <label htmlFor={`${mode}-password`}>كلمة المرور</label>
        <input
          id={`${mode}-password`}
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={isRegister ? 8 : undefined}
          required
        />
      </div>

      {isRegister && (
        <div>
          <label htmlFor="register-confirm-password">تأكيد كلمة المرور</label>
          <input
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className={styles.notice} role="status">
          {message}
        </p>
      )}

      <button className={styles.submit} type="submit" disabled={pending}>
        {pending
          ? "جارٍ المعالجة..."
          : isRegister
            ? "إنشاء حساب عميل"
            : "تسجيل الدخول"}
      </button>

      <p className={styles.switch}>
        {isRegister ? "عندك حساب بالفعل؟ " : "لسه ماعندكش حساب؟ "}
        <Link href={isRegister ? "/login" : "/register"}>
          {isRegister ? "سجل الدخول" : "إنشاء حساب"}
        </Link>
      </p>
    </form>
  );
}
