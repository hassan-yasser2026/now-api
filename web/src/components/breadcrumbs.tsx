import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="مسار الصفحة" className="py-4">
      <ol className="flex flex-nowrap items-center gap-x-1 overflow-hidden text-xs font-bold text-now-900/50 sm:gap-x-2 sm:text-sm">
        {items.map((item, index) => (
          <li
            className={`flex min-w-0 shrink items-center gap-1 sm:gap-2 ${
              index > 0 && index < items.length - 1 ? "hidden sm:flex" : ""
            }`}
            key={`${item.label}-${index}`}
          >
            {index > 0 && <span aria-hidden="true" className="text-now-600/60">/</span>}
            {item.href && index !== items.length - 1 ? (
              <Link className="inline-flex min-h-11 max-w-24 items-center truncate py-1 transition-colors hover:text-now-600 sm:max-w-none" href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={index === items.length - 1 ? "page" : undefined}
                className={index === items.length - 1 ? "inline-flex min-h-11 max-w-44 items-center truncate py-1 text-now-900 sm:max-w-none" : "inline-flex min-h-11 items-center py-1"}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
