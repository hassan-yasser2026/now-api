import type { Metadata } from "next";
import localFont from "next/font/local";
import { getLocale } from "next-intl/server";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const cairoArabic = localFont({
  src: "./fonts/cairo-arabic.woff2",
  display: "swap",
  weight: "400 900",
  variable: "--font-cairo-arabic",
});

const cairoLatin = localFont({
  src: "./fonts/cairo-latin.woff2",
  display: "swap",
  weight: "400 900",
  variable: "--font-cairo-latin",
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body className={`${cairoArabic.variable} ${cairoLatin.variable}`}>
        {children}
      </body>
    </html>
  );
}
