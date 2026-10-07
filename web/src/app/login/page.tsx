import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthShell
      title="أهلاً بيك"
      description="سجّل دخولك برقم الهاتف وكلمة المرور لمتابعة طلباتك."
    >
      <Suspense fallback={<p>جارٍ تحميل النموذج...</p>}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
