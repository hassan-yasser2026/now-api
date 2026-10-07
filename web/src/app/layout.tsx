import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/cart-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://now-eg.com",
  ),
  title: {
    default: "NOW | اطلب من متاجرك المفضلة",
    template: "%s | NOW",
  },
  description: "اكتشف المتاجر والمنتجات واطلبها أونلاين مع NOW.",
  applicationName: "NOW",
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
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
