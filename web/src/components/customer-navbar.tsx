"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "./cart-provider";

export function CustomerNavbar({
  signedIn = false,
}: {
  signedIn?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const { itemCount } = useCart();
  const router = useRouter();

  async function logout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setLogoutError("تعذر تسجيل الخروج. حاول مرة أخرى.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setLogoutError("تعذر الاتصال. حاول تسجيل الخروج مرة أخرى.");
    } finally {
      setLoggingOut(false);
    }
  }

  const links = [
    { href: "/#stores", label: "المتاجر" },
    { href: "/orders", label: "طلباتي" },
    { href: "/account", label: "حسابي" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-now-cream/90 shadow-[0_4px_24px_rgba(24,51,45,0.05)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] w-[min(1200px,calc(100%-32px))] items-center justify-between gap-4 sm:w-[min(1200px,calc(100%-48px))]">
        <Link
          href="/"
          aria-label="چودي ستار، Goody Star - الصفحة الرئيسية"
          className="flex shrink-0 items-center gap-2 text-now-700"
        >
          <span aria-hidden="true" className="grid size-11 place-items-center rounded-2xl bg-now-600 text-white shadow-lg shadow-now-600/20">
            <svg
              aria-hidden="true"
              className="size-9"
              fill="none"
              focusable="false"
              viewBox="0 0 48 48"
            >
              <path
                d="m39 5 2.2 5.8L47 13l-5.8 2.2L39 21l-2.2-5.8L31 13l5.8-2.2L39 5Z"
                fill="#F4B942"
              />
              <text
                fill="white"
                fontFamily="Arial, sans-serif"
                fontSize="19"
                fontWeight="800"
                textAnchor="middle"
                x="21"
                y="32"
              >
                GS
              </text>
            </svg>
          </span>
          <span className="grid leading-tight">
            <span className="text-base font-black sm:text-lg">چودي ستار</span>
            <span className="text-[10px] font-bold tracking-wide text-now-700 sm:text-xs">
              Goody Star
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
          {links.map((link) => (
            <Link
              className="rounded-xl px-4 py-3 text-sm font-bold text-now-900 transition-colors hover:bg-now-100 hover:text-now-700"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold text-now-700 transition-colors hover:bg-now-100"
            href="/cart"
            aria-label={`السلة، ${itemCount} منتج`}
          >
            <CartIcon />
            السلة
            <span className="grid size-6 place-items-center rounded-full bg-now-100 text-xs font-black text-now-700">
              {itemCount}
            </span>
          </Link>
          {signedIn ? (
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-extrabold text-now-700 transition-colors hover:bg-now-100 disabled:opacity-60"
              disabled={loggingOut}
              onClick={() => void logout()}
              type="button"
            >
              {loggingOut ? "جارٍ الخروج…" : "تسجيل الخروج"}
            </button>
          ) : (
            <>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-extrabold text-now-700 transition-colors hover:bg-now-100"
                href="/login"
              >
                تسجيل الدخول
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-now-600 px-5 text-sm font-extrabold text-white shadow-md shadow-now-600/20 transition duration-200 hover:-translate-y-0.5 hover:bg-now-700 hover:shadow-lg"
                href="/register"
              >
                حساب جديد
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            className="relative grid size-11 place-items-center rounded-xl bg-white text-now-700 shadow-sm ring-1 ring-now-900/5"
            href="/cart"
            aria-label={`السلة، ${itemCount} منتج`}
          >
            <CartIcon />
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-now-gold text-[10px] font-black text-now-900">
              {itemCount}
            </span>
          </Link>
          <button
            aria-controls="mobile-customer-menu"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            className="grid size-11 place-items-center rounded-xl border border-now-900/10 bg-white text-now-900 shadow-sm transition hover:bg-now-50"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          className="absolute inset-x-0 top-full border-t border-now-900/5 bg-now-cream px-4 pb-5 pt-3 shadow-xl lg:hidden"
          id="mobile-customer-menu"
          aria-label="التنقل الرئيسي"
        >
          <div className="mx-auto grid max-w-xl gap-2">
            {links.map((link) => (
              <Link
                className="flex min-h-12 items-center rounded-xl px-4 font-bold text-now-900 transition-colors hover:bg-now-100"
                href={link.href}
                key={link.href}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {signedIn ? (
              <button
                className="flex min-h-12 items-center justify-center rounded-xl bg-now-100 px-4 font-extrabold text-now-700 transition-colors hover:bg-now-100/70 disabled:opacity-60"
                disabled={loggingOut}
                onClick={() => void logout()}
                type="button"
              >
                {loggingOut ? "جارٍ الخروج…" : "تسجيل الخروج"}
              </button>
            ) : (
              <>
                <Link
                  className="flex min-h-12 items-center justify-center rounded-xl bg-now-600 px-4 font-extrabold text-white transition-colors hover:bg-now-700"
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                >
                  تسجيل الدخول
                </Link>
                <Link
                  className="flex min-h-12 items-center justify-center rounded-xl bg-now-100 px-4 font-extrabold text-now-700 transition-colors hover:bg-now-100/70"
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                >
                  إنشاء حساب جديد
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
      {logoutError && (
        <p
          className="absolute left-4 top-full mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 shadow-lg"
          role="alert"
        >
          {logoutError}
        </p>
      )}
    </header>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="10" cy="19" r="1.4" fill="currentColor" />
      <circle cx="18" cy="19" r="1.4" fill="currentColor" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" className="size-6" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="size-6" fill="none" viewBox="0 0 24 24">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
