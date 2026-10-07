"use client";

import { useState } from "react";
import type { MenuItem } from "@/lib/api";
import { useCart } from "./cart-provider";
import styles from "./add-to-cart-button.module.css";

export function AddToCartButton({
  store,
  product,
}: {
  store: { id: number; name: string };
  product: MenuItem;
}) {
  const { addItem } = useCart();
  const [message, setMessage] = useState("");

  function add() {
    const result = addItem(store, product);
    setMessage(
      result === "added"
        ? "تمت إضافة المنتج إلى السلة."
        : result === "different-store"
          ? "السلة تحتوي على منتجات من متجر آخر. أفرغ السلة أولًا للطلب من هذا المتجر."
          : "تعذر إضافة المنتج لأن بياناته غير صالحة.",
    );
  }

  return (
    <div className={styles.wrapper}>
      <button className={styles.button} type="button" onClick={add}>
        أضف إلى السلة
      </button>
      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
