import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const t = useTranslations("auth");
  const nav = useTranslations("nav");

  return (
    <main className="relative isolate flex min-h-screen items-center overflow-hidden bg-now-cream px-4 py-8 sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_10%_15%,rgba(244,185,66,.14),transparent_25rem),radial-gradient(ellipse_at_90%_90%,rgba(18,107,87,.12),transparent_32rem)]"
      />
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-now-900/[0.06] bg-white shadow-[0_28px_90px_rgba(24,51,45,0.13)] sm:rounded-[36px] lg:min-h-[650px] lg:grid-cols-[0.88fr_1.12fr]">
        <aside className="relative isolate hidden overflow-hidden bg-now-900 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_85%,rgba(244,185,66,.18),transparent_22rem),radial-gradient(ellipse_at_100%_0%,rgba(33,134,110,.65),transparent_25rem),linear-gradient(145deg,#18332d,#105647_65%,#126b57)]" />
          <div aria-hidden="true" className="absolute -bottom-36 -left-36 -z-10 size-[430px] rounded-full border border-white/10">
            <span className="absolute inset-12 rounded-full border border-white/10" />
            <span className="absolute inset-28 rounded-full border border-white/10" />
          </div>
          <Link
            aria-label={nav("homeAria")}
            className="inline-flex w-fit items-center gap-3 text-white"
            href="/"
          >
            <span aria-hidden="true" className="grid size-12 place-items-center rounded-2xl bg-white/10 text-xl font-black tracking-[-0.08em] ring-1 ring-white/15">
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
                <text fill="white" fontFamily="Arial, sans-serif" fontSize="19" fontWeight="800" textAnchor="middle" x="21" y="32">
                  GS
                </text>
              </svg>
            </span>
            <span className="grid leading-tight">
              <span className="text-2xl font-black">{t("brand")}</span>
              <span className="text-xs font-bold tracking-wide text-now-100">
                Goody Star
              </span>
            </span>
          </Link>
          <div className="relative">
            <p className="text-sm font-extrabold text-now-gold">{t("accountTagline")}</p>
            <p className="mt-4 max-w-sm text-4xl font-black leading-[1.35]">
              {t("heroTitle")}
            </p>
            <p className="mt-4 max-w-sm text-sm leading-7 text-white/65">
              {t("heroDescription")}
            </p>
          </div>
          <p className="text-xs text-white/45">
            {t("heroFooter")}
          </p>
        </aside>

        <section className="flex min-w-0 flex-col justify-center p-5 sm:p-9 lg:p-12 xl:p-16">
          <div className="mb-8 flex items-center justify-between gap-3 lg:mb-10">
            <Link
              aria-label={nav("homeAria")}
              className="inline-flex items-center gap-2 text-now-700 lg:hidden"
              href="/"
            >
              <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-now-600 text-lg font-black text-white">
                <svg
                  aria-hidden="true"
                  className="size-8"
                  fill="none"
                  focusable="false"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="m39 5 2.2 5.8L47 13l-5.8 2.2L39 21l-2.2-5.8L31 13l5.8-2.2L39 5Z"
                    fill="#F4B942"
                  />
                  <text fill="white" fontFamily="Arial, sans-serif" fontSize="19" fontWeight="800" textAnchor="middle" x="21" y="32">
                    GS
                  </text>
                </svg>
              </span>
              <span className="grid leading-tight">
                <span className="text-lg font-black">{t("brand")}</span>
                <span className="text-[10px] font-bold tracking-wide">Goody Star</span>
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <LanguageSwitcher />
              <Link
                className="inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-extrabold text-now-700 transition hover:bg-now-50 sm:text-sm"
                href="/"
              >
                {t("backToStores")}
              </Link>
            </div>
          </div>
          <div className="mb-6">
            <p className="text-xs font-extrabold text-now-600 sm:text-sm">
              {t("customerAccount")}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-now-900 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-now-900/55 sm:text-base">
              {description}
            </p>
          </div>
          {children}
          <p className="mt-8 text-center text-xs leading-6 text-now-900/40">
            {t("terms")}
          </p>
        </section>
      </div>
    </main>
  );
}
