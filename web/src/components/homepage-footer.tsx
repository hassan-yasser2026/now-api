import Link from "next/link";

export function HomepageFooter() {
  return (
    <footer className="mt-20 bg-now-900 text-white">
      <div className="mx-auto grid w-[min(1200px,calc(100%-32px))] gap-10 py-12 sm:w-[min(1200px,calc(100%-48px))] md:grid-cols-[1.3fr_1fr_1fr] md:py-16">
        <div>
          <Link
            aria-label="چودي ستار، Goody Star - الصفحة الرئيسية"
            className="inline-flex items-center gap-3 text-white"
            href="/"
          >
            <span aria-hidden="true" className="grid size-12 place-items-center rounded-2xl bg-white/10 text-xl font-black tracking-[-0.08em] ring-1 ring-white/10">
              <svg
                aria-hidden="true"
                className="size-10"
                fill="none"
                focusable="false"
                viewBox="0 0 48 48"
              >
                <path
                  d="m39 5 2.2 5.8L47 13l-5.8 2.2L39 21l-2.2-5.8L31 13l5.8-2.2L39 5Z"
                  fill="#F4B942"
                />
                <text
                  fill="white"
                  fontFamily="Arial, sans-serif"
                  fontSize="19"
                  fontWeight="800"
                  textAnchor="middle"
                  x="21"
                  y="32"
                >
                  GS
                </text>
              </svg>
            </span>
            <span className="grid leading-tight">
              <span className="text-xl font-black sm:text-2xl">چودي ستار</span>
              <span className="text-xs font-bold tracking-wide text-now-100">
                Goody Star
              </span>
            </span>
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
          © {new Date().getFullYear()} چودي ستار (Goody Star). جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
