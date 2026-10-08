import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { CartProvider } from "@/components/cart-provider";
import { ToastProvider } from "@/components/toast-provider";
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
  title: {
    default: "چودي ستار | تسوق من متاجرك المفضلة",
    template: "%s | چودي ستار",
  },
  description:
    "اكتشف المتاجر والمنتجات واطلبها أونلاين مع چودي ستار (Goody Star).",
  applicationName: "Goody Star",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    siteName: "Goody Star",
    title: "چودي ستار | تسوق من متاجرك المفضلة",
    description:
      "اكتشف المتاجر والمنتجات واطلبها أونلاين مع چودي ستار (Goody Star).",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "چودي ستار - Goody Star",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "چودي ستار | تسوق من متاجرك المفضلة",
    description:
      "اكتشف المتاجر والمنتجات واطلبها أونلاين مع چودي ستار (Goody Star).",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairoArabic.variable} ${cairoLatin.variable}`}>
        <ToastProvider>
          <CartProvider>{children}</CartProvider>
        </ToastProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Goody Star (چودي ستار)",
              url: getSiteUrl().toString(),
              inLanguage: "ar-EG",
            }).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
