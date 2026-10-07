"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";
import styles from "./cart-link.module.css";

export function CartLink() {
  const { itemCount } = useCart();
  return (
    <Link className={styles.link} href="/cart" aria-label={`السلة، ${itemCount} منتج`}>
      السلة
      <span className={styles.count} aria-live="polite">
        {itemCount}
      </span>
    </Link>
  );
}
