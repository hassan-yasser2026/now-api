"use client";

import Image from "next/image";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type User = {
  id: number;
  name: string;
  phone?: string | null;
  role: string;
  permissions?: string[];
};
type SectionKey =
  | "dashboard"
  | "orders"
  | "stores"
  | "users"
  | "products"
  | "payments"
  | "offers"
  | "support"
  | "submissions"
  | "delivery"
  | "reports"
  | "audit-log"
  | "sub-admins";
type RecordValue = string | number | boolean | null | undefined | object;
type RecordItem = Record<string, RecordValue>;
type DashboardData = {
  users?: number;
  customers?: number;
  vendors?: number;
  deliveries?: number;
  stores?: number;
  openStores?: number;
  products?: number;
  orders?: number;
  pendingOrders?: number;
  activeOrders?: number;
  completedOrders?: number;
  sales?: number;
  profits?: number;
  monthly?: { label: string; orders: number; sales: number }[];
  recentOrders?: RecordItem[];
  recentUsers?: RecordItem[];
};

const sections: { id: SectionKey; label: string; icon: string; path: string }[] = [
  { id: "dashboard", label: "الرئيسية", icon: "⌂", path: "dashboard" },
  { id: "orders", label: "الطلبات", icon: "▤", path: "orders" },
  { id: "stores", label: "المتاجر", icon: "▦", path: "stores" },
  { id: "users", label: "المستخدمون", icon: "♙", path: "users" },
  { id: "products", label: "المنتجات", icon: "◇", path: "products" },
  { id: "payments", label: "المدفوعات", icon: "◈", path: "payments" },
  { id: "offers", label: "العروض", icon: "✳", path: "offers" },
  { id: "support", label: "الدعم والمحادثات", icon: "☏", path: "support/sessions" },
  { id: "submissions", label: "طلبات الشركاء", icon: "⇧", path: "submissions" },
  { id: "delivery", label: "التوصيل", icon: "➤", path: "delivery" },
  { id: "reports", label: "التقارير", icon: "▥", path: "reports" },
  { id: "audit-log", label: "سجل العمليات", icon: "◷", path: "audit-log" },
  { id: "sub-admins", label: "المشرفون", icon: "♧", path: "sub-admins" },
];
const sectionPermissions: Partial<Record<SectionKey, string>> = {
  dashboard: "reports.read",
  orders: "orders.read",
  stores: "stores.read",
  users: "users.read",
  products: "products.read",
  payments: "orders.read",
  offers: "stores.read",
  support: "support.read",
  submissions: "stores.read",
  delivery: "delivery.read",
  reports: "reports.read",
  "audit-log": "audit.read",
  "sub-admins": "sub-admins.read",
};
const permissionAliases: Record<string, string[]> = {
  "products.read": ["stores.read"],
  "products.write": ["stores.update"],
  "support.read": ["complaints.read", "reports.read"],
  "audit.read": ["reports.read"],
};

const labels: Record<string, string> = {
  PENDING: "قيد الانتظار",
  ACCEPTED: "مقبول",
  PREPARING: "قيد التحضير",
  READY: "جاهز",
  PICKED_UP: "تم الاستلام",
  ON_THE_WAY: "في الطريق",
  DELIVERED: "تم التوصيل",
  CANCELLED: "ملغي",
  admin: "مدير رئيسي",
  sub_admin: "مشرف",
  customer: "عميل",
  vendor: "بائع",
  delivery: "مندوب",
  OPEN: "مفتوحة",
  IN_PROGRESS: "قيد المتابعة",
  CLOSED: "مغلقة",
  APPROVED: "معتمد",
  PENDING_ADMIN_REVIEW: "بانتظار المراجعة",
};

const sectionTitle = (id: SectionKey) =>
  sections.find((section) => section.id === id)?.label || "الرئيسية";

function apiPayload<T>(data: unknown): T {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

function displayValue(value: RecordValue): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "number") return new Intl.NumberFormat("ar-EG").format(value);
  if (typeof value === "string") {
    if (labels[value]) return labels[value];
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
    }
    return value;
  }
  return "";
}

function getField(record: RecordItem, key: string): RecordValue {
  return key.split(".").reduce<RecordValue>((value, segment) => {
    if (value && typeof value === "object" && segment in value) {
      return (value as Record<string, RecordValue>)[segment];
    }
    return undefined;
  }, record);
}

function searchableText(value: RecordValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    return Object.values(value).map(searchableText).join(" ");
  }
  return displayValue(value);
}

function Icon({ children }: { children: ReactNode }) {
  return <span className="nav-icon" aria-hidden="true">{children}</span>;
}

function Login({
  onSuccess,
}: {
  onSuccess: (user: User) => void;
}) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "تعذر تسجيل الدخول.");
      onSuccess(result.user as User);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تسجيل الدخول.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="login-brand">
          <Image alt="چودي ستار" className="brand-logo" height={54} src="/goody-star-icon.png" width={54} />
          <div>
            <strong>چودي ستار</strong>
            <span>منصة الإدارة</span>
          </div>
        </div>
        <div className="login-heading">
          <span className="eyebrow">مساحة آمنة ومخصصة للإدارة</span>
          <h1>أهلًا بعودتك</h1>
          <p>سجّل الدخول لمتابعة عمليات المنصة وإدارة تفاصيلها.</p>
        </div>
        <form onSubmit={submit} className="login-form">
          <label htmlFor="phone">رقم الهاتف</label>
          <input
            autoComplete="username"
            id="phone"
            inputMode="tel"
            onChange={(event) => setPhone(event.target.value)}
            placeholder="01xxxxxxxxx"
            required
            value={phone}
          />
          <label htmlFor="password">كلمة المرور</label>
          <input
            autoComplete="current-password"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="أدخل كلمة المرور"
            required
            type="password"
            value={password}
          />
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button login-button" disabled={busy}>
            {busy ? <><span className="spinner" /> جارٍ تسجيل الدخول...</> : "تسجيل الدخول"}
          </button>
        </form>
        <div className="login-security">
          <span>◇</span>
          دخول آمن بصلاحيات الإدارة فقط
        </div>
      </section>
      <aside className="login-art">
        <div className="art-orbit orbit-one" />
        <div className="art-orbit orbit-two" />
        <div className="art-content">
          <div className="art-pill"><span /> مركز عمليات چودي ستار</div>
          <h2>كل تفاصيل منصتك<br />في لوحة واحدة.</h2>
          <p>رؤية أوضح، متابعة أسرع، وتجربة إدارة مصممة لتكبر معك.</p>
          <div className="art-cards">
            <div className="art-stat"><span>الطلبات اليوم</span><strong>متابعة مباشرة</strong></div>
            <div className="art-stat"><span>المنصة</span><strong>كل الأقسام متصلة</strong></div>
          </div>
        </div>
        <div className="art-footer">إدارة أكثر وضوحًا. تشغيل أكثر سلاسة.</div>
      </aside>
    </main>
  );
}

function AppShell({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [active, setActive] = useState<SectionKey>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState(false);
  const [page, setPage] = useState(1);
  const [apiOnline, setApiOnline] = useState(true);
  const searchInput = useRef<HTMLInputElement>(null);
  const isAdmin = user.role === "admin";
  const allowedSections = useMemo(() => {
    if (isAdmin) return sections;
    const permissions = user.permissions || [];
    return sections.filter((section) => {
      const required = sectionPermissions[section.id];
      return required && (
        permissions.includes(required)
        || (permissionAliases[required] || []).some((alias) => permissions.includes(alias))
      );
    });
  }, [isAdmin, user.permissions]);
  const activeSection = allowedSections.some((section) => section.id === active)
    ? active
    : allowedSections[0]?.id || "dashboard";

  const loadActive = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    const selected = sections.find((section) => section.id === activeSection);
    let receivedResponse = false;
    try {
      const response = await fetch(`/api/admin/${selected?.path}`, {
        cache: "no-store",
      });
      receivedResponse = true;
      setApiOnline(true);
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "تعذر تحميل البيانات.");
      const payload: unknown = apiPayload(body);
      if (activeSection === "dashboard") {
        setDashboard((payload || {}) as DashboardData);
        setRecords([]);
      } else {
        const list = Array.isArray(payload)
          ? payload
          : payload && typeof payload === "object"
            ? Object.values(payload).find(Array.isArray) || []
            : [];
        setRecords(list as RecordItem[]);
      }
      setUpdatedAt(new Date());
    } catch (cause) {
      setApiOnline(receivedResponse);
      setError(cause instanceof Error ? cause.message : "تعذر تحميل البيانات.");
      if (!silent) {
        setDashboard(null);
        setRecords([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeSection]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadActive(), 0);
    return () => window.clearTimeout(timer);
  }, [loadActive]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadActive(true);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [loadActive]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if (event.key === "Escape") {
        searchInput.current?.blur();
        setMobileMenu(false);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");
    if (!query) return records;
    return records.filter((record) =>
      searchableText(record).toLocaleLowerCase("ar").includes(query),
    );
  }, [records, search]);

  function selectSection(id: SectionKey) {
    setActive(id);
    setSearch("");
    setPage(1);
    setActionMessage("");
    setMobileMenu(false);
  }

  async function runRecordAction(record: RecordItem, action: "user-toggle" | "store-toggle" | "store-open-toggle" | "product-toggle") {
    const id = record.id;
    if (id === undefined || id === null) return;

    const isActive = record.isActive !== false;
    const isOpen = record.isOpen === true;
    const isAvailable = record.isAvailable !== false;
    const actionTitle = action === "user-toggle"
      ? isActive ? "تعطيل الحساب" : "تنشيط الحساب"
      : action === "store-toggle"
        ? isActive ? "تعطيل المتجر" : "تنشيط المتجر"
        : action === "store-open-toggle"
          ? isOpen ? "إغلاق المتجر" : "فتح المتجر"
          : isAvailable ? "إخفاء المنتج" : "إتاحة المنتج";
    if (!window.confirm(`هل تريد ${actionTitle}؟`)) return;

    setActionMessage("");
    setActionError(false);
    setLoading(true);
    try {
      const request = action === "user-toggle"
        ? { path: `users/${id}/${isActive ? "suspend" : "activate"}`, method: "PATCH", body: isActive ? { reason: "إجراء إداري" } : {} }
        : action === "store-toggle"
          ? { path: `stores/${id}/${isActive ? "suspend" : "activate"}`, method: "PATCH", body: {} }
          : action === "store-open-toggle"
            ? { path: `stores/${id}`, method: "PATCH", body: { isOpen: !isOpen } }
            : { path: `products/${id}`, method: "PATCH", body: { isAvailable: !isAvailable } };
      const response = await fetch(`/api/admin/${request.path}`, {
        method: request.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "تعذر تنفيذ الإجراء.");
      setActionMessage(`تم ${actionTitle} بنجاح.`);
      await loadActive();
    } catch (cause) {
      setActionError(true);
      setActionMessage(cause instanceof Error ? cause.message : "تعذر تنفيذ الإجراء.");
    } finally {
      setLoading(false);
      window.setTimeout(() => setActionMessage(""), 4500);
    }
  }

  const handleLogout = async () => {
    await fetch("/api/session", { method: "DELETE" });
    onLogout();
  };

  return (
    <div className="admin-layout">
      {mobileMenu && <button aria-label="إغلاق القائمة" className="mobile-backdrop" onClick={() => setMobileMenu(false)} />}
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Image alt="" className="brand-logo sidebar-logo" height={42} src="/goody-star-icon.png" width={42} />
          <div><strong>چودي ستار</strong><span>مركز الإدارة</span></div>
          <button aria-label="إغلاق القائمة" className="sidebar-close" onClick={() => setMobileMenu(false)}>×</button>
        </div>
        <div className="workspace-label">مساحة العمل</div>
        <nav className="side-nav" aria-label="التنقل الرئيسي">
          {allowedSections.map((section, index) => (
            <button
              aria-current={activeSection === section.id ? "page" : undefined}
              className={`nav-link ${activeSection === section.id ? "nav-link-active" : ""} ${index === 1 || index === 4 || index === 7 || index === 9 || index === 11 ? "nav-spaced" : ""}`}
              key={section.id}
              onClick={() => selectSection(section.id)}
            >
              <Icon>{section.icon}</Icon>
              <span>{section.label}</span>
              {section.id === "orders" && dashboard?.pendingOrders ? <b className="nav-count">{displayValue(dashboard.pendingOrders)}</b> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-version">GOODY STAR ADMIN <span>•</span> لوحة الإدارة</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-start">
            <button aria-label="فتح القائمة" className="menu-toggle" onClick={() => setMobileMenu(true)}>☰</button>
            <div className="breadcrumb"><span>چودي ستار</span><i>/</i><strong>{sectionTitle(activeSection)}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className={`live-status ${apiOnline ? "" : "live-status-offline"}`}><span /> {apiOnline ? "متصل بالنظام" : "الاتصال غير متاح"}</div>
            <span className="topbar-divider" />
            <div className="user-menu">
              <div className="avatar">{user.name.slice(0, 1)}</div>
              <div className="user-details"><strong>{user.name}</strong><span>{user.role === "admin" ? "مدير رئيسي" : "مشرف"}</span></div>
              <button aria-label="تسجيل الخروج" className="logout-button" onClick={handleLogout} title="تسجيل الخروج">↪</button>
            </div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">{new Intl.DateTimeFormat("ar-EG", { dateStyle: "full" }).format(new Date())}</span>
              <h1>{activeSection === "dashboard" ? `${greeting()}, ${user.name.split(" ")[0]}` : sectionTitle(activeSection)}</h1>
              <p>{activeSection === "dashboard" ? "إليك نظرة سريعة على أداء المنصة اليوم." : sectionDescription(activeSection)}</p>
            </div>
            <div className="heading-actions">
              <span className="last-updated">آخر تحديث {new Intl.DateTimeFormat("ar-EG", { timeStyle: "short" }).format(updatedAt)}</span>
              <button className="refresh-button" disabled={loading} onClick={() => void loadActive()}><span className={loading ? "spin-icon" : ""}>↻</span> تحديث</button>
            </div>
          </div>

          {activeSection === "dashboard" ? (
            <DashboardView dashboard={dashboard} error={error} loading={loading} onNavigate={selectSection} />
          ) : (
            <DataSection
              active={activeSection}
              actionError={actionError}
              actionMessage={actionMessage}
              error={error}
              loading={loading}
              onAction={runRecordAction}
              onPageChange={setPage}
              page={page}
              pageSize={25}
              records={filteredRecords}
              searchInput={searchInput}
              search={search}
              setSearch={(value) => { setSearch(value); setPage(1); }}
              user={user}
            />
          )}
          <footer className="page-footer"><span>© چودي ستار 2026</span><span>منصة توصيل موحدة، بإدارة أذكى.</span></footer>
        </div>
      </main>
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "نهارك سعيد";
  return "مساء الخير";
}

function sectionDescription(active: SectionKey) {
  const descriptions: Partial<Record<SectionKey, string>> = {
    orders: "تابع طلبات العملاء وحالة تنفيذها لحظة بلحظة.",
    stores: "استعرض المتاجر المسجلة وحالة تشغيلها.",
    users: "إدارة حسابات العملاء والشركاء ومراجعة نشاطهم.",
    products: "استعرض منتجات المتاجر وحالة توفرها.",
    payments: "متابعة المدفوعات والمعاملات المسجلة.",
    offers: "إدارة ومراجعة العروض النشطة على المنصة.",
    support: "رسائل العملاء وطلبات الدعم في مكان واحد.",
    submissions: "طلبات انضمام الشركاء ومراجعتها.",
    delivery: "متابعة عمليات وحالة التوصيل.",
    reports: "تقارير الأداء والإيرادات.",
    "audit-log": "سجل تغييرات وإجراءات الإدارة.",
    "sub-admins": "إدارة حسابات المشرفين وصلاحياتهم.",
  };
  return descriptions[active] || "استعرض بيانات المنصة من مكان واحد.";
}

function DashboardView({
  dashboard,
  error,
  loading,
  onNavigate,
}: {
  dashboard: DashboardData | null;
  error: string;
  loading: boolean;
  onNavigate: (id: SectionKey) => void;
}) {
  const metrics: { label: string; value: number | undefined; icon: string; color: string; target: SectionKey; hint?: string; currency?: boolean }[] = [
    { label: "إجمالي الطلبات", value: dashboard?.orders, icon: "▤", color: "green", target: "orders", hint: `${displayValue(dashboard?.pendingOrders)} قيد الانتظار` },
    { label: "المستخدمون", value: dashboard?.users, icon: "♙", color: "blue", target: "users", hint: `${displayValue(dashboard?.customers)} عميل` },
    { label: "المتاجر النشطة", value: dashboard?.openStores, icon: "▦", color: "orange", target: "stores", hint: `من ${displayValue(dashboard?.stores)} متجر` },
    { label: "إجمالي الإيرادات", value: dashboard?.sales, icon: "↗", color: "purple", target: "reports", hint: `${displayValue(dashboard?.completedOrders)} طلب مكتمل`, currency: true },
  ];
  const chart = dashboard?.monthly || [];
  const maxValue = Math.max(1, ...chart.map((item) => Number(item.orders) || 0));

  return (
    <>
      {error && <div className="notice error-notice" role="alert"><span>!</span><div><strong>تعذر تحميل البيانات</strong><p>{error}</p></div></div>}
      <div className="metric-grid">
        {metrics.map((metric, index) => (
          <button className={`metric-card metric-${metric.color}`} key={metric.label} onClick={() => onNavigate(metric.target)} style={{ animationDelay: `${index * 70}ms` }}>
            <div className="metric-top"><span>{metric.label}</span><span className="metric-icon">{metric.icon}</span></div>
            <strong className="metric-value">{loading ? <span className="skeleton skeleton-number" /> : <>{displayValue(metric.value)}{metric.currency && <small> ج.م</small>}</>}</strong>
            <div className="metric-foot"><span className="metric-dot" />{metric.hint}</div>
          </button>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="panel performance-panel">
          <div className="panel-heading">
            <div><h2>نشاط الطلبات</h2><p>عدد الطلبات المسجلة لكل يوم خلال آخر 30 يومًا</p></div>
            <span className="period-chip">آخر 30 يومًا</span>
          </div>
          {loading ? <div className="chart-skeleton"><span /><span /><span /><span /><span /><span /></div> : chart.length && maxValue > 0 ? (
            <div className="chart-wrap">
              <div className="chart-y-labels"><span>الأعلى</span><span>متوسط</span><span>الأقل</span></div>
              <div className="bar-chart">
                <div className="chart-grid-lines"><i /><i /><i /><i /></div>
                {chart.map((item, index) => (
                  <div className="bar-column" key={`${item.label}-${index}`} title={`${item.label}: ${displayValue(item.orders)} طلب`}>
                    <span className="bar-value">{displayValue(item.orders)}</span>
                    <i style={{ height: `${Math.max(4, (Number(item.orders) / maxValue) * 100)}%` }} />
                    {(index % 5 === 0 || index === chart.length - 1) && <small>{item.label}</small>}
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="empty-chart">ستظهر حركة الطلبات هنا بعد تحميل البيانات.</div>}
        </section>
        <section className="panel revenue-panel">
          <div className="panel-heading"><div><h2>ملخص الإيرادات</h2><p>إجمالي الطلبات المكتملة</p></div><span className="revenue-icon">↗</span></div>
          <div className="revenue-number">{loading ? <span className="skeleton skeleton-number" /> : <>{displayValue(dashboard?.sales)} <small>ج.م</small></>}</div>
          <div className="revenue-divider" />
          <div className="revenue-row"><span>طلبات نشطة</span><strong>{loading ? "—" : displayValue(dashboard?.activeOrders)}</strong></div>
          <div className="revenue-row"><span>طلبات مكتملة</span><strong>{loading ? "—" : displayValue(dashboard?.completedOrders)}</strong></div>
          <div className="revenue-row"><span>العمولات</span><strong>{loading ? "—" : `${displayValue(dashboard?.profits)} ج.م`}</strong></div>
        </section>
      </div>

      <div className="dashboard-grid lower-grid">
        <section className="panel table-panel">
          <div className="panel-heading"><div><h2>أحدث الطلبات</h2><p>آخر الطلبات المسجلة على المنصة</p></div><button className="text-button" onClick={() => onNavigate("orders")}>عرض الكل ←</button></div>
          <RecordTable
            columns={[
              { key: "id", label: "رقم الطلب" },
              { key: "customer.name", label: "العميل" },
              { key: "store.name", label: "المتجر" },
              { key: "status", label: "الحالة" },
              { key: "totalPrice", label: "الإجمالي" },
            ]}
            empty="لا توجد طلبات حديثة."
            loading={loading}
            rows={dashboard?.recentOrders || []}
          />
        </section>
        <section className="panel quick-panel">
          <div className="panel-heading"><div><h2>وصول سريع</h2><p>الأقسام الأكثر استخدامًا</p></div></div>
          <div className="quick-links">
            {[
              { key: "orders" as const, icon: "▤", label: "مراجعة الطلبات", note: "متابعة كل الطلبات" },
              { key: "stores" as const, icon: "▦", label: "إدارة المتاجر", note: "المتاجر وحالة التشغيل" },
              { key: "users" as const, icon: "♙", label: "حسابات المستخدمين", note: "العملاء والشركاء" },
            ].map((item) => <button className="quick-link" key={item.key} onClick={() => onNavigate(item.key)}><span className="quick-icon">{item.icon}</span><span><strong>{item.label}</strong><small>{item.note}</small></span><b>←</b></button>)}
          </div>
          <div className="recent-users-heading"><h3>أحدث المنضمين</h3><button className="text-button" onClick={() => onNavigate("users")}>عرض الكل</button></div>
          <div className="recent-users">
            {loading ? [1, 2, 3].map((item) => <div className="recent-user-skeleton" key={item}><i /><span /></div>) : (dashboard?.recentUsers || []).length ? (dashboard?.recentUsers || []).slice(0, 3).map((item, index) => (
              <div className="recent-user" key={String(item.id ?? index)}>
                <span className={`recent-user-avatar avatar-tone-${index % 3}`}>{String(getField(item, "name") || "م").slice(0, 1)}</span>
                <span className="recent-user-info"><strong>{displayValue(getField(item, "name"))}</strong><small>{displayValue(getField(item, "role.name"))}</small></span>
                <small className="recent-user-date">{displayValue(getField(item, "createdAt"))}</small>
              </div>
            )) : <p className="recent-users-empty">سيظهر أحدث المستخدمين هنا.</p>}
          </div>
        </section>
      </div>
    </>
  );
}

type Column = { key: string; label: string };

function columnsFor(active: SectionKey): Column[] {
  const columns: Partial<Record<SectionKey, Column[]>> = {
    orders: [
      { key: "id", label: "رقم الطلب" },
      { key: "customer.name", label: "العميل" },
      { key: "store.name", label: "المتجر" },
      { key: "delivery.name", label: "المندوب" },
      { key: "status", label: "الحالة" },
      { key: "totalPrice", label: "الإجمالي" },
      { key: "createdAt", label: "التاريخ" },
    ],
    stores: [
      { key: "id", label: "الرقم" },
      { key: "name", label: "اسم المتجر" },
      { key: "vendor.name", label: "البائع" },
      { key: "isOpen", label: "مفتوح" },
      { key: "isActive", label: "الحالة" },
      { key: "_count.orders", label: "الطلبات" },
    ],
    users: [
      { key: "id", label: "الرقم" },
      { key: "name", label: "الاسم" },
      { key: "phone", label: "الهاتف" },
      { key: "role.name", label: "نوع الحساب" },
      { key: "isActive", label: "نشط" },
      { key: "createdAt", label: "تاريخ التسجيل" },
    ],
    products: [
      { key: "id", label: "الرقم" },
      { key: "name", label: "المنتج" },
      { key: "store.name", label: "المتجر" },
      { key: "price", label: "السعر" },
      { key: "isAvailable", label: "متاح" },
    ],
    payments: [
      { key: "id", label: "الرقم" },
      { key: "orderId", label: "رقم الطلب" },
      { key: "amount", label: "المبلغ" },
      { key: "status", label: "الحالة" },
      { key: "method", label: "طريقة الدفع" },
      { key: "createdAt", label: "التاريخ" },
    ],
    offers: [
      { key: "id", label: "الرقم" },
      { key: "title", label: "العرض" },
      { key: "discountPercentage", label: "الخصم" },
      { key: "isActive", label: "نشط" },
      { key: "startDate", label: "البداية" },
      { key: "endDate", label: "النهاية" },
    ],
    support: [
      { key: "id", label: "الرقم" },
      { key: "subject", label: "الموضوع" },
      { key: "user.name", label: "صاحب الطلب" },
      { key: "status", label: "الحالة" },
      { key: "updatedAt", label: "آخر تحديث" },
    ],
    "audit-log": [
      { key: "id", label: "الرقم" },
      { key: "action", label: "الإجراء" },
      { key: "entity", label: "العنصر" },
      { key: "actor.name", label: "بواسطة" },
      { key: "createdAt", label: "التاريخ" },
    ],
  };
  return columns[active] || [
    { key: "id", label: "الرقم" },
    { key: "name", label: "الاسم" },
    { key: "status", label: "الحالة" },
    { key: "createdAt", label: "التاريخ" },
  ];
}

function DataSection({
  active,
  actionError,
  actionMessage,
  error,
  loading,
  onAction,
  onPageChange,
  page,
  pageSize,
  records,
  searchInput,
  search,
  setSearch,
  user,
}: {
  active: SectionKey;
  actionError: boolean;
  actionMessage: string;
  error: string;
  loading: boolean;
  onAction: (record: RecordItem, action: "user-toggle" | "store-toggle" | "store-open-toggle" | "product-toggle") => void;
  onPageChange: (page: number) => void;
  page: number;
  pageSize: number;
  records: RecordItem[];
  searchInput: React.RefObject<HTMLInputElement | null>;
  search: string;
  setSearch: (value: string) => void;
  user: User;
}) {
  const columns = columnsFor(active);
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const pageRows = records.slice((page - 1) * pageSize, page * pageSize);
  const can = (permission: string) => user.role === "admin"
    || (user.permissions || []).includes(permission)
    || (permissionAliases[permission] || []).some((alias) => (user.permissions || []).includes(alias));
  return (
    <section className="panel data-panel">
      <div className="data-toolbar">
        <div><h2>{sectionTitle(active)}</h2><p>البيانات المحدثة من نظام چودي ستار مباشرة.</p></div>
        <label className="search-box"><span>⌕</span><input ref={searchInput} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في النتائج..." value={search} /><kbd>Ctrl K</kbd></label>
      </div>
      {error && <div className="notice error-notice table-error"><span>!</span><div><strong>تعذر تحميل القسم</strong><p>{error}</p></div></div>}
      {actionMessage && <div className={`notice action-notice ${actionError ? "error-notice" : ""}`} role="status"><span>{actionError ? "!" : "✓"}</span><div><strong>{actionMessage}</strong></div></div>}
      <div className="table-scroll">
        <RecordTable active={active} can={can} columns={columns} empty={error ? "لا يمكن عرض البيانات لهذا الحساب." : search ? "لا توجد نتائج تطابق بحثك." : "لا توجد بيانات لعرضها بعد."} loading={loading} onAction={onAction} rows={pageRows} />
      </div>
      <div className="table-foot">
        <span>{loading ? "جارٍ تحميل السجلات..." : records.length ? `عرض ${displayValue((page - 1) * pageSize + 1)}–${displayValue(Math.min(page * pageSize, records.length))} من ${displayValue(records.length)} سجل` : "لا توجد سجلات"}</span>
        <div className="pagination">
          <button aria-label="الصفحة السابقة" disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)}>السابق</button>
          <span>{displayValue(page)} / {displayValue(totalPages)}</span>
          <button aria-label="الصفحة التالية" disabled={page >= totalPages || loading} onClick={() => onPageChange(page + 1)}>التالي</button>
        </div>
      </div>
    </section>
  );
}

function RecordTable({
  active,
  can,
  columns,
  rows,
  loading,
  empty,
  onAction,
}: {
  active?: SectionKey;
  can?: (permission: string) => boolean;
  columns: Column[];
  rows: RecordItem[];
  loading: boolean;
  empty: string;
  onAction?: (record: RecordItem, action: "user-toggle" | "store-toggle" | "store-open-toggle" | "product-toggle") => void;
}) {
  if (loading) {
    return <div className="table-loading">{[1, 2, 3, 4].map((line) => <div className="loading-row" key={line}>{columns.slice(0, 5).map((column) => <span key={column.key} />)}</div>)}</div>;
  }
  if (!rows.length) return <div className="table-empty"><span>▤</span><strong>{empty}</strong><small>ستظهر النتائج هنا عند توفرها.</small></div>;
  const actionType: "user-toggle" | "store-toggle" | "product-toggle" | null =
    active === "users" && can?.("users.suspend") ? "user-toggle"
      : active === "stores" && can?.("stores.suspend") ? "store-toggle"
        : active === "products" && can?.("products.write") ? "product-toggle"
          : null;
  return (
    <table className="data-table">
      <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}{actionType && <th>إجراء</th>}{active === "stores" && can?.("stores.update") && <th>تشغيل المتجر</th>}</tr></thead>
      <tbody>{rows.map((row, rowIndex) => (
        <tr key={String(row.id ?? rowIndex)}>
          {columns.map((column, columnIndex) => {
            const value = getField(row, column.key);
            const text = displayValue(value);
            const statusLike = ["status", "isActive", "isOpen", "approvalStatus"].some((part) => column.key.includes(part));
            return <td key={column.key}>{columnIndex === 0 ? <strong className="table-id">#{text}</strong> : statusLike ? <span className={`status-pill ${statusClass(value)}`}>{text}</span> : column.key.toLowerCase().includes("price") || column.key.toLowerCase().includes("amount") ? `${text} ج.م` : text}</td>;
          })}
          {actionType && onAction && <td><button className="row-action" onClick={() => onAction(row, actionType)}>{active === "users" ? row.isActive === false ? "تنشيط الحساب" : "تعطيل الحساب" : active === "stores" ? row.isActive === false ? "تنشيط المتجر" : "تعطيل المتجر" : row.isAvailable === false ? "إتاحة المنتج" : "إخفاء المنتج"}</button></td>}
          {active === "stores" && can?.("stores.update") && onAction && <td><button className="row-action row-action-light" onClick={() => onAction(row, "store-open-toggle")}>{row.isOpen === true ? "إغلاق المتجر" : "فتح المتجر"}</button></td>}
        </tr>
      ))}</tbody>
    </table>
  );
}

function statusClass(value: RecordValue) {
  const normalized = String(value).toUpperCase();
  if (value === true || ["DELIVERED", "APPROVED", "READY", "OPEN"].includes(normalized)) return "status-good";
  if (value === false || ["CANCELLED", "REJECTED", "CLOSED"].includes(normalized)) return "status-bad";
  return "status-wait";
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/session", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return null;
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "تعذر التحقق من الجلسة.");
        return result.user as User;
      })
      .then((activeUser) => {
        if (mounted) setUser(activeUser);
      })
      .catch((cause: unknown) => {
        if (mounted) setSessionError(cause instanceof Error ? cause.message : "تعذر الاتصال بالخادم.");
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });
    return () => { mounted = false; };
  }, []);

  if (checking) {
    return <main className="boot-screen"><Image alt="چودي ستار" className="brand-logo boot-logo" height={62} src="/goody-star-icon.png" width={62} /><span className="spinner" /><p>جارٍ التحقق من الجلسة...</p></main>;
  }
  if (sessionError && !user) {
    return <main className="boot-screen"><div className="boot-error"><strong>تعذر الاتصال</strong><p>{sessionError}</p><button className="primary-button" onClick={() => window.location.reload()}>إعادة المحاولة</button></div></main>;
  }
  return user
    ? <AppShell onLogout={() => setUser(null)} user={user} />
    : <Login onSuccess={setUser} />;
}
