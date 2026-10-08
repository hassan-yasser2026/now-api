import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { CartProvider } from "@/components/cart-provider";
import { ToastProvider } from "@/components/toast-provider";
import { routing, type Locale } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/site-url";

type LocaleLayoutProps = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "metadata" });
  const title = t("title");
  const description = t("description");
  const siteName = t("website");
  const brandAlt = t("brandAlt");

  return {
    metadataBase: getSiteUrl(),
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description,
    applicationName: "Goody Star",
    alternates: {
      languages: {
        ar: "/",
        en: "/en",
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "ar" ? "ar_EG" : "en_US",
      siteName: "Goody Star",
      title,
      description,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: brandAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale: requestedLocale } = await params;
  if (!hasLocale(routing.locales, requestedLocale)) notFound();

  const locale: Locale = requestedLocale;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <ToastProvider>
        <CartProvider>{children}</CartProvider>
      </ToastProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: locale === "ar" ? "چودي ستار (Goody Star)" : "Goody Star",
            url: getSiteUrl().toString(),
            inLanguage: locale === "ar" ? "ar-EG" : "en",
          }).replace(/</g, "\\u003c"),
        }}
      />
    </NextIntlClientProvider>
  );
}
