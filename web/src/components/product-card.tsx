import Image from "next/image";
import Link from "next/link";
import { formatPrice, getSafeImageUrl, type MenuItem } from "@/lib/api";
import styles from "./product-card.module.css";

export function ProductCard({
  storeId,
  product,
}: {
  storeId: number;
  product: MenuItem;
}) {
  const imageUrl = getSafeImageUrl(product.image);
  const productName = product.nameAr || product.name;

  return (
    <Link
      className={styles.card}
      href={`/stores/${storeId}/products/${product.id}`}
    >
      <div className={styles.image}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={productName}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 800px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <span aria-hidden="true">NOW</span>
        )}
      </div>
      <div className={styles.content}>
        <h3>{productName}</h3>
        <p>{product.description || "منتج متاح للطلب من المتجر."}</p>
        <strong>{formatPrice(product.price)}</strong>
      </div>
    </Link>
  );
}
