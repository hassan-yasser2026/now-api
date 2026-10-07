import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerNav } from "@/components/customer-nav";
import { getCustomerSession } from "@/lib/server-api";
import styles from "./customer-page.module.css";

export const metadata: Metadata = {
  title: "حسابي",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/login?next=%2Faccount");
  const { user } = session;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          NOW
        </Link>
        <CustomerNav signedIn />
      </header>
      <section className={styles.content}>
        <p className={styles.eyebrow}>حساب العميل</p>
        <h1>أهلاً {user.name}</h1>
        <p className={styles.intro}>بيانات حسابك المسجلة في NOW.</p>
        <div className={styles.profileCard}>
          <div>
            <span>الاسم</span>
            <strong>{user.name}</strong>
          </div>
          <div>
            <span>رقم الهاتف</span>
            <strong dir="ltr">{user.phone}</strong>
          </div>
        </div>
        <Link className={styles.primaryLink} href="/orders">
          عرض طلباتي
        </Link>
      </section>
    </main>
  );
}
