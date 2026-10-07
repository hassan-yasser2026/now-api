"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice, getSafeImageUrl } from "@/lib/api";
import { useCart } from "@/components/cart-provider";
import styles from "./cart-page.module.css";

export default function CartPage() {
  const { items, error, setQuantity, removeItem, clearCart } = useCart();
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          NOW
        </Link>
        <Link className={styles.backLink} href="/">
          متابعة التسوق
        </Link>
      </header>

      <section className={styles.content} aria-labelledby="cart-title">
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>طلبك على NOW</p>
            <h1 id="cart-title">سلة التسوق</h1>
          </div>
          {items.length > 0 && (
            <button className={styles.clearButton} onClick={clearCart} type="button">
              إفراغ السلة
            </button>
          )}
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <div className={styles.empty}>
            <p>سلتك فارغة حاليًا.</p>
            <Link href="/">تصفح المتاجر</Link>
          </div>
        ) : (
          <>
            <p className={styles.storeName}>من متجر {items[0].storeName}</p>
            <div className={styles.itemList}>
              {items.map((item) => {
                const imageUrl = getSafeImageUrl(item.image);
                return (
                  <article className={styles.item} key={item.productId}>
                    <div className={styles.image}>
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt=""
                          fill
                          sizes="96px"
                          unoptimized
                        />
                      ) : (
                        <span aria-hidden="true">NOW</span>
                      )}
                    </div>
                    <div className={styles.itemInfo}>
                      <h2>{item.name}</h2>
                      <p>{formatPrice(item.price)}</p>
                      <div className={styles.controls}>
                        <button
                          type="button"
                          aria-label={`تقليل كمية ${item.name}`}
                          onClick={() =>
                            setQuantity(item.productId, item.quantity - 1)
                          }
                        >
                          −
                        </button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`زيادة كمية ${item.name}`}
                          onClick={() =>
                            setQuantity(item.productId, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className={styles.itemEnd}>
                      <strong>{formatPrice(item.price * item.quantity)}</strong>
                      <button
                        className={styles.removeButton}
                        type="button"
                        onClick={() => removeItem(item.productId)}
                      >
                        إزالة
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className={styles.summary} aria-label="ملخص السلة">
              <div>
                <span>الإجمالي التقديري</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <p>
                الإجمالي النهائي والتوصيل يتحددان عند إتمام الطلب. السلة محفوظة
                محليًا على هذا المتصفح فقط.
              </p>
              <Link className={styles.checkoutButton} href="/checkout">
                إتمام الطلب
              </Link>
            </aside>
          </>
        )}
      </section>
    </main>
  );
}
