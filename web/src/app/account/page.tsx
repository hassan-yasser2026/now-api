import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CustomerNavbar } from "@/components/customer-navbar";
import { HomepageFooter } from "@/components/homepage-footer";
import { getCustomerSession } from "@/lib/server-api";

export const metadata: Metadata = {
  title: "حسابي",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/login?next=%2Faccount");
  const { user } = session;
  const initials = user.name.trim().slice(0, 1) || "N";

  return (
    <>
      <CustomerNavbar signedIn />
      <main className="mx-auto min-h-[65vh] w-[min(1120px,calc(100%-32px))] pb-16 sm:w-[min(1120px,calc(100%-48px))] sm:pb-20">
        <Breadcrumbs
          items={[{ label: "الرئيسية", href: "/" }, { label: "حسابي" }]}
        />

        <section className="relative isolate overflow-hidden rounded-[28px] bg-now-900 p-5 text-white shadow-[0_22px_60px_rgba(18,107,87,0.16)] sm:rounded-[36px] sm:p-8 lg:p-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_90%,rgba(244,185,66,.18),transparent_24rem),radial-gradient(ellipse_at_90%_0%,rgba(33,134,110,.6),transparent_30rem),linear-gradient(125deg,#18332d,#105647_62%,#126b57)]" />
          <div aria-hidden="true" className="absolute -left-16 -top-24 -z-10 size-64 rounded-full border border-white/10 sm:left-16 sm:size-80">
            <span className="absolute inset-8 rounded-full border border-white/10 sm:inset-12" />
          </div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 text-3xl font-black text-now-gold shadow-lg backdrop-blur sm:size-20 sm:rounded-3xl sm:text-4xl">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-now-100/75 sm:text-sm">
                حساب العميل
              </p>
              <h1 className="mt-1 break-words text-2xl font-black sm:text-3xl lg:text-4xl">
                أهلاً {user.name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-white/65">
                إدارة حسابك ومتابعة طلباتك من مكان واحد.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-7">
          <section className="rounded-3xl border border-now-900/[0.06] bg-white p-5 shadow-[0_10px_32px_rgba(24,51,45,0.06)] sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-now-600">
                  معلوماتك
                </p>
                <h2 className="mt-1 text-xl font-black text-now-900">
                  بيانات الحساب
                </h2>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-now-50 text-now-700" aria-hidden="true">
                <PersonIcon />
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ProfileField label="الاسم" value={user.name} />
              <ProfileField
                direction="ltr"
                label="رقم الهاتف"
                value={user.phone}
              />
            </div>
            <p className="mt-4 text-xs leading-6 text-now-900/45">
              هذه البيانات المسجلة في حساب NOW. تعديل بيانات الملف الشخصي غير
              متاح من الموقع حاليًا.
            </p>
          </section>

          <aside className="rounded-3xl border border-now-900/[0.06] bg-white p-5 shadow-[0_10px_32px_rgba(24,51,45,0.06)] sm:p-6">
            <p className="text-xs font-extrabold text-now-600">وصول سريع</p>
            <h2 className="mt-1 text-xl font-black text-now-900">
              خدمات حسابك
            </h2>
            <div className="mt-5 grid gap-3">
              <QuickLink
                description="راجع حالة طلباتك السابقة والحالية."
                href="/orders"
                icon={<OrdersIcon />}
                title="طلباتي"
              />
              <QuickLink
                description="راجع سلتك وأدخل عنوان التوصيل عند إتمام الطلب."
                href="/cart"
                icon={<LocationIcon />}
                title="السلة والتوصيل"
              />
              <QuickLink
                description="اكتشف المتاجر والمنتجات المتاحة."
                href="/#stores"
                icon={<ShopIcon />}
                title="تصفح المتاجر"
              />
            </div>
            <p className="mt-4 rounded-2xl bg-now-cream p-3 text-xs leading-6 text-now-900/50">
              دفتر عناوين محفوظ غير متوفر حاليًا؛ عنوان التوصيل يُدخل عند إتمام
              الطلب.
            </p>
          </aside>
        </div>

        <section className="mt-6 rounded-3xl border border-now-900/[0.06] bg-gradient-to-l from-now-50 to-white p-5 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-7">
          <div>
            <p className="text-xs font-extrabold text-now-600">جاهز تطلب؟</p>
            <h2 className="mt-1 text-lg font-black text-now-900 sm:text-xl">
              اختار من متاجرك المفضلة
            </h2>
            <p className="mt-1 text-sm leading-6 text-now-900/55">
              المنتجات والأسعار المعروضة يتم تحديثها من خدمة NOW.
            </p>
          </div>
          <Link
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-now-600 px-6 text-sm font-extrabold text-white shadow-md shadow-now-600/20 transition hover:-translate-y-0.5 hover:bg-now-700 sm:mt-0 sm:w-auto"
            href="/#stores"
          >
            تصفح المتاجر
          </Link>
        </section>
      </main>
      <HomepageFooter />
    </>
  );
}

function ProfileField({
  label,
  value,
  direction,
}: {
  label: string;
  value: string;
  direction?: "ltr";
}) {
  return (
    <div className="grid min-h-20 content-center gap-1 rounded-2xl bg-now-cream px-4 py-3">
      <span className="text-xs font-bold text-now-900/50">{label}</span>
      <strong className="break-words text-sm font-extrabold text-now-900" dir={direction}>
        {value}
      </strong>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      className="group flex min-h-[76px] items-center gap-3 rounded-2xl border border-now-900/[0.06] bg-white p-3 transition hover:-translate-y-0.5 hover:border-now-600/20 hover:bg-now-50/50 hover:shadow-sm"
      href={href}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-now-50 text-now-700 transition group-hover:bg-now-600 group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-now-900">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-now-900/50">
          {description}
        </span>
      </span>
      <span aria-hidden="true" className="text-now-600">←</span>
    </Link>
  );
}

function PersonIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path d="M7 4h10l2 3v13H5V7l2-3Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10h8M8 14h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path d="M19 10.2c0 5-7 10.3-7 10.3S5 15.2 5 10.2a7 7 0 1 1 14 0Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
