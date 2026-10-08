import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  formatPrice,
  getSafeImageUrl,
  shouldUnoptimizeImage,
  type MenuItem,
} from "@/lib/api";
import styles from "./product-card.module.css";

export function ProductCard({
  storeId,
  product,
}: {
  storeId: number;
  product: MenuItem;
}) {
  const t = useTranslations("product");
  const locale = useLocale();
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
            unoptimized={shouldUnoptimizeImage(imageUrl)}
          />
        ) : (
          <span aria-hidden="true">GS</span>
        )}
      </div>
      <div className={styles.content}>
        <h3>{productName}</h3>
        <p>{product.description || t("fallbackDescription")}</p>
        <strong>{formatPrice(product.price, locale)}</strong>
      </div>
    </Link>
  );
}
