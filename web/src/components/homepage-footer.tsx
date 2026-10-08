import Link from "next/link";

export function HomepageFooter() {
  return (
    <footer className="mt-20 bg-now-900 text-white">
      <div className="mx-auto grid w-[min(1200px,calc(100%-32px))] gap-10 py-12 sm:w-[min(1200px,calc(100%-48px))] md:grid-cols-[1.3fr_1fr_1fr] md:py-16">
        <div>
          <Link
            aria-label="NOW - الصفحة الرئيسية"
            className="inline-flex items-center gap-3 text-white"
            href="/"
          >
            <span aria-hidden="true" className="grid size-12 place-items-center rounded-2xl bg-white/10 text-xl font-black tracking-[-0.08em] ring-1 ring-white/10">
              <svg
                aria-hidden="true"
                className="size-6"
                fill="none"
                focusable="false"
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 18V6l12 12V6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                />
              </svg>
            </span>
            <span className="text-3xl font-black tracking-[-0.08em]">NOW</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-7 text-white/65">
            اكتشف متاجرك المفضلة واطلب احتياجاتك اليومية بسهولة.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-extrabold text-white">روابط سريعة</h2>
          <ul className="mt-4 grid gap-3 text-sm text-white/70">
            <li><Link className="transition-colors hover:text-now-gold" href="/#stores">تصفح المتاجر</Link></li>
            <li><Link className="transition-colors hover:text-now-gold" href="/cart">السلة</Link></li>
            <li><Link className="transition-colors hover:text-now-gold" href="/orders">طلباتي</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-extrabold text-white">حسابك</h2>
          <ul className="mt-4 grid gap-3 text-sm text-white/70">
            <li><Link className="transition-colors hover:text-now-gold" href="/login">تسجيل الدخول</Link></li>
            <li><Link className="transition-colors hover:text-now-gold" href="/register">إنشاء حساب</Link></li>
            <li><Link className="transition-colors hover:text-now-gold" href="/account">حسابي</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto w-[min(1200px,calc(100%-32px))] py-5 text-xs text-white/50 sm:w-[min(1200px,calc(100%-48px))]">
          © {new Date().getFullYear()} NOW. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
