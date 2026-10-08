import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "إدارة چودي ستار",
  description: "لوحة إدارة منصة چودي ستار",
  icons: { icon: "/goody-star-icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
