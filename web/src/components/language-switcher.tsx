"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useRouter, useSearchParams } from "next/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextLocale = locale === "ar" ? "en" : "ar";
  const prefix = nextLocale === "ar" ? "" : "/en";
  const destinationPath = `${prefix}${prefix && pathname === "/" ? "" : pathname}`;
  const query = searchParams.toString();
  const destination = `${destinationPath || "/"}${query ? `?${query}` : ""}`;

  return (
    <button
      aria-label={t("language")}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-now-900/10 px-2 text-sm font-extrabold text-now-700 transition hover:bg-now-100 sm:px-3"
      onClick={() => router.replace(destination)}
      type="button"
    >
      <span className="sm:hidden">{t("languageCode")}</span>
      <span className="hidden sm:inline">{t("language")}</span>
    </button>
  );
}
