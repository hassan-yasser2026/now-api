import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CustomerNavbar } from "@/components/customer-navbar";
import { HomepageFooter } from "@/components/homepage-footer";
import { formatPrice } from "@/lib/api";
import {
  getCustomerOrders,
  getCustomerSession,
} from "@/lib/server-api";

export const metadata: Metadata = {
  title: "طلباتي",
  robots: { index: false, follow: false },
};

type OrderRecord = {
  id: number;
  status: string;
  totalPrice: number | string;
  createdAt?: string;
  store?: { name?: string };
  items?: Array<{
    id: number;
    quantity: number;
    menuItem?: { name?: string; nameAr?: string | null };
  }>;
};

function asOrder(value: unknown): OrderRecord | null {
  if (!value || typeof value !== "object") return null;
  const order = value as Partial<OrderRecord>;
  if (
    !Number.isSafeInteger(order.id) ||
    typeof order.status !== "string" ||
    (typeof order.totalPrice !== "number" &&
      typeof order.totalPrice !== "string")
  ) {
    return null;
  }
  return order as OrderRecord;
}

const ORDER_STATUS: Record<string, { label: string; style: string }> = {
  PENDING: { label: "بانتظار قبول المتجر", style: "bg-amber-50 text-amber-800 ring-amber-200" },
  ACCEPTED: { label: "تم قبول الطلب", style: "bg-sky-50 text-sky-800 ring-sky-200" },
  PREPARING: { label: "جارٍ التحضير", style: "bg-violet-50 text-violet-800 ring-violet-200" },
  READY: { label: "الطلب جاهز", style: "bg-indigo-50 text-indigo-800 ring-indigo-200" },
  PICKED_UP: { label: "استلمه المندوب", style: "bg-cyan-50 text-cyan-800 ring-cyan-200" },
  ON_THE_WAY: { label: "في الطريق إليك", style: "bg-blue-50 text-blue-800 ring-blue-200" },
  DELIVERED: { label: "تم التوصيل", style: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  CANCELLED: { label: "ملغي", style: "bg-red-50 text-red-800 ring-red-200" },
};

function orderDate(value: string | undefined) {
  if (!value) return "تاريخ غير متاح";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "تاريخ غير متاح";

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function OrdersPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/login?next=%2Forders");

  let orders: unknown[];
  let loadError: string | null = null;
  try {
    orders = await getCustomerOrders(session.user.id, session.token);
  } catch (error) {
    console.error("Failed to load customer orders:", error);
    orders = [];
    loadError =
      error instanceof Error
        ? error.message
        : "تعذر تحميل الطلبات. حاول مرة أخرى.";
  }

  const validOrders = orders.map(asOrder).filter((order) => order !== null);

  return (
    <>
      <CustomerNavbar signedIn />
      <main className="mx-auto min-h-[65vh] w-[min(1120px,calc(100%-32px))] pb-16 sm:w-[min(1120px,calc(100%-48px))] sm:pb-20">
        <Breadcrumbs
          items={[
            { label: "الرئيسية", href: "/" },
            { label: "حسابي", href: "/account" },
            { label: "طلباتي" },
          ]}
        />

        <section className="relative isolate overflow-hidden rounded-[28px] bg-now-900 p-5 text-white shadow-[0_22px_60px_rgba(18,107,87,0.15)] sm:rounded-[36px] sm:p-8 lg:p-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_90%,rgba(244,185,66,.18),transparent_24rem),radial-gradient(ellipse_at_90%_0%,rgba(33,134,110,.6),transparent_30rem),linear-gradient(125deg,#18332d,#105647_62%,#126b57)]" />
          <p className="text-xs font-extrabold text-white/65 sm:text-sm">
            حساب العميل
          </p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-black sm:text-4xl">طلباتي</h1>
              <p className="mt-2 text-sm leading-6 text-white/70 sm:text-base">
                أهلاً {session.user.name}، تابع تفاصيل وحالة طلباتك من مكان واحد.
              </p>
            </div>
            <span className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-bold text-white/85 backdrop-blur">
              <span className="size-2 rounded-full bg-now-gold" />
              {validOrders.length} طلب
            </span>
          </div>
        </section>

        <div className="mt-6">
          {loadError ? (
            <section
              className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8"
              role="alert"
            >
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-xl font-black text-red-700">
                  !
                </span>
                <div>
                  <h2 className="text-lg font-black text-now-900">
                    تعذر تحميل الطلبات
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-red-900/75">
                    {loadError}
                  </p>
                </div>
              </div>
            </section>
          ) : validOrders.length === 0 ? (
            <section className="grid justify-items-center rounded-3xl border border-now-900/[0.06] bg-white px-5 py-12 text-center shadow-[0_10px_32px_rgba(24,51,45,0.05)] sm:py-16">
              <span className="grid size-16 place-items-center rounded-3xl bg-now-50 text-now-700">
                <OrderIcon />
              </span>
              <p className="mt-5 text-xs font-extrabold text-now-600">
                مساحة طلباتك
              </p>
              <h2 className="mt-1 text-xl font-black text-now-900 sm:text-2xl">
                لسه ماعندكش طلبات
              </h2>
              <p className="mt-2 max-w-md text-sm leading-7 text-now-900/55">
                لما تعمل طلب، هتلاقي رقمه وتفاصيله وحالته هنا. اختار متجرًا
                وابدأ التسوق وقت ما تحب.
              </p>
              <Link
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-now-600 px-6 text-sm font-extrabold text-white shadow-md shadow-now-600/20 transition hover:-translate-y-0.5 hover:bg-now-700 sm:w-auto"
                href="/#stores"
              >
                تصفح المتاجر
              </Link>
            </section>
          ) : (
            <div className="grid gap-4">
              {validOrders.map((order) => {
                const status = ORDER_STATUS[order.status] || {
                  label: order.status.replaceAll("_", " "),
                  style: "bg-slate-50 text-slate-700 ring-slate-200",
                };
                const items = Array.isArray(order.items) ? order.items : [];
                return (
                  <article
                    className="group rounded-3xl border border-now-900/[0.06] bg-white p-4 shadow-[0_10px_32px_rgba(24,51,45,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(24,51,45,0.09)] sm:p-6"
                    key={order.id}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-now-50 text-now-700 ring-1 ring-now-900/[0.04]">
                          <StoreIcon />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-now-900/45">
                            طلب رقم
                          </p>
                          <h2 className="mt-0.5 truncate text-lg font-black text-now-900">
                            #{order.id} · {order.store?.name || "متجر NOW"}
                          </h2>
                        </div>
                      </div>
                      <span
                        className={`inline-flex min-h-9 w-fit items-center rounded-full px-3 text-xs font-extrabold ring-1 ring-inset sm:shrink-0 ${status.style}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 rounded-2xl bg-now-cream p-4 sm:grid-cols-3 sm:gap-4">
                      <div>
                        <p className="text-xs font-bold text-now-900/45">
                          تاريخ الطلب
                        </p>
                        <p className="mt-1 text-sm font-bold text-now-900">
                          {orderDate(order.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-now-900/45">
                          المنتجات
                        </p>
                        <p className="mt-1 line-clamp-1 text-sm font-bold text-now-900">
                          {items.length
                            ? items
                                .map(
                                  (item) =>
                                    item.menuItem?.nameAr ||
                                    item.menuItem?.name ||
                                    "منتج",
                                )
                                .join("، ")
                            : "تفاصيل المنتجات غير متاحة"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-now-900/45">
                          إجمالي الطلب
                        </p>
                        <p className="mt-1 text-base font-black text-now-700">
                          {formatPrice(order.totalPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs leading-5 text-now-900/45">
                        {items.reduce(
                          (total, item) => total + (Number(item.quantity) || 0),
                          0,
                        )}{" "}
                        قطعة في هذا الطلب
                      </p>
                      <Link
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-now-600/20 bg-white px-5 text-sm font-extrabold text-now-700 transition hover:border-now-600 hover:bg-now-50 sm:w-auto"
                        href={`/orders/${order.id}`}
                      >
                        عرض التفاصيل
                        <span aria-hidden="true">←</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <HomepageFooter />
    </>
  );
}

function OrderIcon() {
  return (
    <svg aria-hidden="true" className="size-8" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 4h10l2 3v13H5V7l2-3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M8 10h8M8 14h8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg aria-hidden="true" className="size-7" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
