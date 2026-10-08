import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <main className="min-h-screen animate-pulse" aria-label={t("loading")}>
      <div className="mx-auto flex min-h-[72px] w-[min(1200px,calc(100%-32px))] items-center justify-between sm:w-[min(1200px,calc(100%-48px))]">
        <div className="h-10 w-28 rounded-xl bg-now-100" />
        <div className="hidden h-10 w-64 rounded-xl bg-now-100 sm:block" />
        <div className="h-10 w-24 rounded-xl bg-now-100" />
      </div>
      <div className="mx-auto mt-5 h-[430px] w-[min(1200px,calc(100%-24px))] rounded-[28px] bg-gradient-to-br from-now-100 to-emerald-50 sm:w-[min(1200px,calc(100%-48px))] sm:rounded-[36px]" />
      <div className="mx-auto mt-10 h-16 w-[min(1040px,calc(100%-32px))] rounded-2xl bg-white shadow-sm sm:w-[min(1040px,calc(100%-48px))]" />
      <div className="mx-auto mt-12 grid w-[min(1200px,calc(100%-32px))] grid-cols-1 gap-4 sm:w-[min(1200px,calc(100%-48px))] sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm" key={item}>
            <div className="aspect-[1.8] bg-now-100" />
            <div className="grid gap-3 p-5">
              <div className="h-5 w-2/3 rounded bg-now-100" />
              <div className="h-4 w-full rounded bg-now-50" />
              <div className="h-4 w-4/5 rounded bg-now-50" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
