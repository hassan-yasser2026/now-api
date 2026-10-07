import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "إنشاء حساب عميل",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="إنشاء حساب جديد"
      description="أنشئ حساب عميل واطلب من متاجرك المفضلة."
    >
      <Suspense fallback={<p>جارٍ تحميل النموذج...</p>}>
        <AuthForm mode="register" />
      </Suspense>
    </AuthShell>
  );
}
