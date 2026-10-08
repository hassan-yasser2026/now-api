"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "./cart-provider";
import styles from "./cart-link.module.css";

export function CartLink() {
  const { itemCount } = useCart();
  const t = useTranslations("nav");
  return (
    <Link className={styles.link} href="/cart" aria-label={t("cartCount", { count: itemCount })}>
      {t("cart")}
      <span className={styles.count} aria-live="polite">
        {itemCount}
      </span>
    </Link>
  );
}
