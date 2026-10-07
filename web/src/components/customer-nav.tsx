"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CartLink } from "./cart-link";
import styles from "./customer-nav.module.css";

export function CustomerNav({
  signedIn = false,
}: {
  signedIn?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError("تعذر تسجيل الخروج. حاول مرة أخرى.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("تعذر الاتصال. حاول تسجيل الخروج مرة أخرى.");
    } finally {
      setPending(false);
    }
  }

  return (
    <nav className={styles.nav} aria-label="حساب العميل">
      <CartLink />
      {signedIn ? (
        <>
          <Link href="/orders">طلباتي</Link>
          <Link href="/account">حسابي</Link>
          <button type="button" onClick={logout} disabled={pending}>
            {pending ? "جارٍ الخروج..." : "تسجيل الخروج"}
          </button>
        </>
      ) : (
        <>
          <Link href="/login">تسجيل الدخول</Link>
          <Link className={styles.register} href="/register">
            حساب جديد
          </Link>
        </>
      )}
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </nav>
  );
}
