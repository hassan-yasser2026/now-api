import Image from "next/image";
import Link from "next/link";
import { getSafeImageUrl, type Store } from "@/lib/api";
import styles from "./store-card.module.css";

export function StoreCard({
  store,
  distanceKm,
}: {
  store: Store;
  distanceKm?: number;
}) {
  const imageUrl = getSafeImageUrl(store.image);

  return (
    <Link className={styles.card} href={`/stores/${store.id}`}>
      <div className={styles.image}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`صورة متجر ${store.name}`}
            fill
            sizes="(max-width: 480px) 100vw, (max-width: 760px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <span className={styles.imagePlaceholder} aria-hidden="true">
            {store.name.slice(0, 1)}
          </span>
        )}
        {store.isOpen && <span className={styles.openBadge}>مفتوح الآن</span>}
      </div>
      <div className={styles.content}>
        <div className={styles.titleRow}>
          <h3>{store.name}</h3>
          {Number(store.ratingAverage) > 0 && (
            <span className={styles.rating}>
              ★ {Number(store.ratingAverage).toFixed(1)}
            </span>
          )}
        </div>
        <p>{store.description || "اكتشف المنتجات المتاحة واطلب أونلاين."}</p>
        {distanceKm !== undefined && (
          <span className={styles.distance}>
            على بُعد {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} م` : `${distanceKm.toFixed(1)} كم`}
          </span>
        )}
        <span className={styles.linkText}>
          تصفح المنتجات <span aria-hidden="true">←</span>
        </span>
      </div>
    </Link>
  );
}
