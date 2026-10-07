import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./auth-shell.module.css";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          NOW
        </Link>
        <Link className={styles.back} href="/">
          العودة للمتاجر
        </Link>
      </header>
      <section className={styles.card}>
        <p className={styles.eyebrow}>حساب عميل NOW</p>
        <h1>{title}</h1>
        <p className={styles.description}>{description}</p>
        {children}
      </section>
    </main>
  );
}
