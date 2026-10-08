import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getSafeImageUrl,
  shouldUnoptimizeImage,
  type Store,
} from "@/lib/api";
import styles from "./store-card.module.css";

export function StoreCard({
  store,
  distanceKm,
}: {
  store: Store;
  distanceKm?: number;
}) {
  const t = useTranslations("store");
  const imageUrl = getSafeImageUrl(store.image);

  return (
    <Link className={styles.card} href={`/stores/${store.id}`}>
      <div className={styles.image}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={t("imageAlt", { name: store.name })}
            fill
            sizes="(max-width: 480px) 100vw, (max-width: 760px) 50vw, 33vw"
            unoptimized={shouldUnoptimizeImage(imageUrl)}
          />
        ) : (
          <span className={styles.imagePlaceholder} aria-hidden="true">
            {store.name.slice(0, 1)}
          </span>
        )}
        {store.isOpen && <span className={styles.openBadge}>{t("open")}</span>}
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
        <p>{store.description || t("fallbackDescription")}</p>
        {distanceKm !== undefined && (
          <span className={styles.distance}>
            {t("distance", {
              distance:
                distanceKm < 1
                  ? t("meters", { distance: Math.round(distanceKm * 1000) })
                  : t("kilometers", { distance: distanceKm.toFixed(1) }),
            })}
          </span>
        )}
        <span className={styles.linkText}>
          {t("browseProducts")} <span aria-hidden="true">←</span>
        </span>
      </div>
    </Link>
  );
}
