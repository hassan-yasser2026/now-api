import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getTranslations("auth"))("createAccountTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function RegisterPage() {
  const t = await getTranslations("auth");
  return (
    <AuthShell
      title={t("registerHeading")}
      description={t("registerDescription")}
    >
      <Suspense fallback={<p>{t("loadingForm")}</p>}>
        <AuthForm mode="register" />
      </Suspense>
    </AuthShell>
  );
}
