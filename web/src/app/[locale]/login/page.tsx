import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getTranslations("auth"))("loginTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <AuthShell
      title={t("loginHeading")}
      description={t("loginDescription")}
    >
      <Suspense fallback={<p>{t("loadingForm")}</p>}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
