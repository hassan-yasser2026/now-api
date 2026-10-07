import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CustomerNav } from "@/components/customer-nav";
import { HomepageExperience } from "@/components/homepage-experience";
import { getStores, type Store } from "@/lib/api";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "NOW | اطلب من متاجرك المفضلة",
  description:
    "تصفح المتاجر والمنتجات واطلب بسهولة من NOW. توصيل طلباتك إلى باب البيت.",
  openGraph: {
    title: "NOW | اطلب من متاجرك المفضلة",
    description: "اكتشف المتاجر والمنتجات واطلبها أونلاين.",
    locale: "ar_EG",
    type: "website",
  },
};

export default async function HomePage() {
  await connection();

  let stores: Store[] = [];
  let loadError = false;

  try {
    stores = await getStores();
  } catch (error) {
    console.error("Failed to load stores for the customer website:", error);
    loadError = true;
  }

  if (loadError) {
    return (
      <main className={styles.page}>
        <section className={styles.errorState} role="alert">
          <h1>تعذر تحميل المتاجر</h1>
          <p>
            حصلت مشكلة في الاتصال بخدمة NOW. حاول تحديث الصفحة بعد شوية.
          </p>
          <Link className={styles.heroButton} href="/">
            إعادة المحاولة
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/" aria-label="NOW - الصفحة الرئيسية">
          NOW
        </Link>
        <CustomerNav />
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>طلبك، أسهل مع NOW</p>
          <h1>كل اللي بتحبه، لحد عندك</h1>
          <p className={styles.heroDescription}>
            اكتشف المتاجر القريبة منك واطلب احتياجاتك بخطوات بسيطة.
          </p>
          <a className={styles.heroButton} href="#stores">
            اكتشف المتاجر
          </a>
        </div>
        <div className={styles.heroShape} aria-hidden="true">
          <span>NOW</span>
        </div>
      </section>

      {stores.length > 0 ? (
        <HomepageExperience stores={stores} />
      ) : (
        <section className={styles.section} id="stores">
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">
              ◌
            </span>
            <h3>مفيش متاجر متاحة دلوقتي</h3>
            <p>ارجع تاني قريب، المتاجر هتظهر هنا أول ما تكون متاحة.</p>
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        <Link href="/" aria-label="NOW - الصفحة الرئيسية">
          NOW
        </Link>
        <span>طلبك يوصل لك، بكل سهولة.</span>
      </footer>
    </main>
  );
}
