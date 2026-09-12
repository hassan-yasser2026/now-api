const API_URL =
  window.NOW_API_URL ||
  'https://now-api-production-ca56.up.railway.app/api';
const app = document.querySelector('#app');

const state = {
  token: localStorage.getItem('now_admin_token'),
  user: JSON.parse(localStorage.getItem('now_admin_user') || 'null'),
  section: 'dashboard',
  query: '',
  status: 'all',
};

const sectionGroups = [
  { title: 'الرئيسية', icon: '⌂', items: [['dashboard', 'الرئيسية']] },
  { title: 'إدارة المستخدمين', icon: '♙', items: [
    ['users', 'العملاء'], ['vendors', 'البائعون / مقدمو الخدمات'], ['delivery', 'المندوبون'],
    ['employees', 'الموظفون'], ['sub-admins', 'الإدمن الفرعي'], ['permissions', 'إدارة الصلاحيات'],
  ] },
  { title: 'إدارة الطلبات', icon: '▤', items: [
    ['orders', 'جميع الطلبات'], ['new-orders', 'الطلبات الجديدة'], ['active-orders', 'قيد التنفيذ'],
    ['ready-orders', 'جاهزة للتوصيل'], ['completed-orders', 'مكتملة'], ['cancelled-orders', 'ملغاة'], ['order-details', 'تفاصيل الطلبات'],
  ] },
  { title: 'إدارة الخدمات', icon: '▣', items: [
    ['services', 'الخدمات والمنتجات'], ['categories', 'التصنيفات'], ['stores', 'المتاجر'], ['submissions', 'مراجعات البائعين'], ['delivery-zones', 'مناطق التوصيل'], ['geography', 'المناطق الجغرافية'],
  ] },
  { title: 'الإدارة المالية', icon: 'ج.م', items: [
    ['payments', 'المدفوعات'], ['commissions', 'العمولات'], ['withdrawals', 'السحوبات'], ['wallets', 'المحافظ'], ['profits', 'الأرباح'], ['invoices', 'الفواتير'], ['financial-reports', 'التقارير المالية'],
  ] },
  { title: 'العروض والتسويق', icon: '◇', items: [
    ['coupons', 'الكوبونات'], ['offers', 'العروض'], ['campaigns', 'الحملات التسويقية'], ['bulk-notifications', 'الإشعارات الجماعية'],
  ] },
  { title: 'التقييمات والشكاوى', icon: '★', items: [
    ['ratings', 'التقييمات'], ['customer-complaints', 'شكاوى العملاء'], ['vendor-complaints', 'شكاوى البائعين'], ['delivery-complaints', 'شكاوى المندوبين'], ['support', 'الدعم والتذاكر'],
  ] },
  { title: 'التقارير والإحصائيات', icon: '◈', items: [
    ['reports', 'تقارير الطلبات'], ['user-reports', 'تقارير المستخدمين'], ['vendor-reports', 'تقارير البائعين'], ['delivery-reports', 'تقارير المندوبين'], ['sales-reports', 'تقارير المبيعات'], ['profit-reports', 'تقارير الأرباح'], ['performance-reports', 'تقارير الأداء'],
  ] },
  { title: 'إدارة النظام', icon: '⚙', items: [
    ['platform-settings', 'إعدادات المنصة'], ['global-notifications', 'الإشعارات العامة'], ['audit-log', 'سجل العمليات Audit Log'], ['backup', 'النسخ الاحتياطي'], ['payment-settings', 'إعدادات الدفع'], ['delivery-settings', 'إعدادات التوصيل'], ['commission-settings', 'إعدادات العمولات'], ['system-permissions', 'الصلاحيات'], ['sub-admin-settings', 'الإدمن الفرعي'],
  ] },
];
const sections = sectionGroups.flatMap((group) => group.items.map(([key, label]) => [key, label, group.icon]));
const sectionLabel = (key) => sections.find(([itemKey]) => itemKey === key)?.[1] || 'لوحة الإدارة';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const unwrap = (payload) => payload?.data ?? payload;

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      logout();
    }
    throw new Error(payload.message || 'تعذر تحميل البيانات');
  }
  return unwrap(payload);
};

const formatDate = (value) => value ? new Date(value).toLocaleString('ar-EG') : '—';
const money = (value) => `${Number(value || 0).toFixed(2)} ج.م`;
const listOf = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key];
  return [];
};

const renderLogin = (message = '') => {
  app.innerHTML = `
    <section class="auth-page">
      <form class="auth-card" id="login-form">
        <p class="brand"><span>N</span>OW</p>
        <p class="eyebrow">ADMIN CONTROL CENTER</p>
        <h1>لوحة الإدارة</h1>
        <p class="muted">تحكم كامل في منصة NOW من مكان واحد</p>
        <label class="field">رقم الهاتف<input name="phone" type="tel" autocomplete="username" required /></label>
        <label class="field">كلمة المرور<input name="password" type="password" autocomplete="current-password" required /></label>
        <p class="error">${escapeHtml(message)}</p>
        <button class="primary" type="submit">دخول لوحة الإدارة</button>
      </form>
    </section>`;
  document.querySelector('#login-form').addEventListener('submit', login);
};

async function login(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  button.textContent = 'جار تسجيل الدخول...';
  try {
    const result = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone: form.get('phone'), password: form.get('password') }),
    });
    const user = result.user;
    if (!user || !['admin', 'sub_admin'].includes(user.role)) {
      throw new Error('هذا الحساب ليس حساب إدارة');
    }
    state.token = result.token;
    state.user = user;
    localStorage.setItem('now_admin_token', state.token);
    localStorage.setItem('now_admin_user', JSON.stringify(user));
    renderApp();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'دخول لوحة الإدارة';
    renderLogin(error.message);
  }
}

function logout() {
  localStorage.removeItem('now_admin_token');
  localStorage.removeItem('now_admin_user');
  state.token = null;
  state.user = null;
  renderLogin();
}

const renderApp = () => {
  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand-wrap"><p class="brand"><span>N</span>OW</p><small>ADMIN CENTER</small></div>
        <nav class="nav">${sectionGroups.map((group) => `
          <div class="nav-group">
            <div class="nav-group-title"><i>${group.icon}</i><span>${group.title}</span><b>⌄</b></div>
            <div class="nav-group-items">${group.items.map(([key, label]) =>
              `<button data-section="${key}" class="${key === state.section ? 'active' : ''}"><i>•</i>${label}</button>`).join('')}</div>
          </div>`).join('')}</nav>
        <div class="sidebar-footer"><span class="online-dot"></span> متصل بالخادم
          <button class="logout" id="logout">تسجيل الخروج</button></div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div><p class="eyebrow">NOW PLATFORM</p><h1>${escapeHtml(sectionLabel(state.section))}</h1>
          <p class="muted">مرحبًا ${escapeHtml(state.user?.name || 'مدير النظام')}، إليك ملخص المنصة اليوم</p></div>
          <div class="top-actions"><span class="date-chip">${new Date().toLocaleDateString('ar-EG')}</span><button class="refresh" id="refresh">↻ تحديث</button></div>
        </header>
        <section id="section-content" class="loading">جار تحميل البيانات...</section>
      </main>
    </div>`;
  document.querySelectorAll('[data-section]').forEach((button) => {
    button.addEventListener('click', () => {
      state.section = button.dataset.section;
      state.query = '';
      state.status = 'all';
      renderApp();
    });
  });
  document.querySelector('#logout').addEventListener('click', logout);
  document.querySelector('#refresh').addEventListener('click', loadSection);
  loadSection();
};

const toolbar = (placeholder = 'بحث بالاسم أو الهاتف...') => `
  <div class="toolbar"><input id="search" class="search" placeholder="${placeholder}" value="${escapeHtml(state.query)}" />
  <select id="status-filter"><option value="all">كل الحالات</option><option value="active">نشط</option><option value="inactive">معطل</option></select></div>`;

const bindFilter = (load) => {
  document.querySelector('#search')?.addEventListener('input', (event) => { state.query = event.target.value; load(); });
  document.querySelector('#status-filter')?.addEventListener('change', (event) => { state.status = event.target.value; load(); });
};

const actionButton = (label, className, action, id) =>
  `<button class="small-btn ${className}" data-action="${action}" data-id="${id}">${label}</button>`;

const bindActionButtons = (reload, handlers) => {
  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', async () => {
    const handler = handlers[button.dataset.action];
    if (!handler) return;
    button.disabled = true;
    try { await handler(button.dataset.id); await reload(); }
    catch (error) { alert(error.message); button.disabled = false; }
  }));
};

async function loadSection() {
  const target = document.querySelector('#section-content');
  if (!target) return;
  target.innerHTML = '<div class="loading">جار تحميل البيانات...</div>';
  try {
    const loaders = {
      dashboard: () => request('/admin/dashboard'),
      users: () => request('/admin/users'),
      stores: () => request('/admin/stores'),
      orders: () => request('/admin/orders'),
      submissions: () => request('/admin/submissions'),
      delivery: () => request('/admin/delivery'),
      reports: () => request('/admin/reports'),
      'sub-admins': () => request('/admin/sub-admins'),
    };
    const data = loaders[state.section] ? await loaders[state.section]() : {};
    ({ dashboard: renderDashboard, users: renderUsers, stores: renderStores, orders: renderOrders,
      submissions: renderSubmissions, delivery: renderDeliveries, reports: renderReports,
      'sub-admins': renderSubAdmins }[state.section] || renderPlaceholder)(data, target);
  } catch (error) {
    if (state.section === 'dashboard') {
      renderDashboard({}, target);
      return;
    }
    target.innerHTML = `<div class="panel error-box"><b>تعذر تحميل القسم</b><p>${escapeHtml(error.message)}</p><button class="refresh" id="retry">إعادة المحاولة</button></div>`;
    document.querySelector('#retry')?.addEventListener('click', loadSection);
  }
}

function renderPlaceholder(data, target) {
  const label = sectionLabel(state.section);
  target.innerHTML = `<div class="section-placeholder"><div class="placeholder-icon">${escapeHtml(sections.find(([key]) => key === state.section)?.[2] || '◈')}</div><h2>${escapeHtml(label)}</h2><p>لا يوجد Endpoint فعلي لهذه الوحدة في الخادم الحالي، لذلك لن يتم عرض بيانات تجريبية أو أزرار وهمية.</p></div>`;
}

function renderDashboard(data, target) {
  const metrics = data || {};
  const metricValue = (value, suffix = '') => value === null || value === undefined ? 'غير متاح' : `${escapeHtml(value)}${suffix}`;
  const chartPoints = Array.isArray(metrics.monthly) && metrics.monthly.length ? metrics.monthly : [];
  const chartPath = chartPoints.length ? chartPoints.map((point, index) => `${index ? 'L' : 'M'} ${index * (760 / Math.max(chartPoints.length - 1, 1))} ${230 - Math.min(Number(point.orders || 0), 230)}`).join(' ') : 'M 0 230';
  const recentOrdersHtml = (metrics.recentOrders || []).map((item) => `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.customer?.name || '—')}</td><td>${escapeHtml(item.store?.name || '—')}</td><td><span class="table-status ${item.status === 'DELIVERED' ? 'done' : item.status === 'CANCELLED' ? 'cancelled' : 'progress'}">${escapeHtml(item.status || '—')}</span></td><td>${formatDate(item.createdAt)}</td><td>${money(item.totalPrice)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">لا توجد طلبات مسجلة.</td></tr>';
  const recentUsersHtml = (metrics.recentUsers || []).map((item, index) => `<li><span class="list-avatar ${index % 2 ? 'pink' : ''}">${escapeHtml(item.name?.[0] || '?')}</span><div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.role?.name || '—')}</small></div><time>${formatDate(item.createdAt)}</time></li>`).join('') || '<li class="empty">لا يوجد مستخدمون.</li>';
  const activityHtml = (metrics.recentActivities || []).map((item) => `<li><span class="activity-icon cyan">•</span><div><b>${escapeHtml(item.action)} - ${escapeHtml(item.entity)}</b><small>${escapeHtml(item.actor?.name || 'النظام')}</small></div><time>${formatDate(item.createdAt)}</time></li>`).join('') || '<li class="empty">لا توجد عمليات مسجلة.</li>';
  if (!Object.keys(metrics).length) {
    target.innerHTML = '<div class="section-placeholder"><div class="placeholder-icon">!</div><h2>تعذر تحميل بيانات لوحة التحكم</h2><p>لا توجد بيانات من الخادم حاليًا. تحقق من اتصال قاعدة البيانات ثم أعد المحاولة.</p><button class="refresh" id="dashboard-retry">إعادة المحاولة</button></div>';
    document.querySelector('#dashboard-retry')?.addEventListener('click', loadSection);
    return;
  }
  target.innerHTML = `
    <div class="pro-dashboard">
      <div class="dashboard-toolbar">
        <div class="dashboard-search">⌕ <span>ابحث في النظام عن مستخدم، طلب، متجر...</span></div>
        <div class="toolbar-actions"><div class="profile-chip"><span class="profile-avatar">أ</span><span><b>أحمد محمد</b><small>مدير النظام</small></span><i>⌄</i></div></div>
      </div>
      <section class="welcome-banner"><div><span>مرحبًا بك في لوحة تحكم الإدارة</span><h2>أدر منصتك بكل سهولة واحترافية</h2><p>تابع أداء NOW وتحكم في جميع عمليات المنصة من مكان واحد.</p></div><div class="welcome-art"><div class="laptop">NOW<span>▦</span></div><i>✦</i><b>↗</b></div></section>
      <section class="kpi-grid">
        ${[
          ['إجمالي المستخدمين', metricValue(metrics.users), 'من قاعدة البيانات', 'purple', '♙'], ['إجمالي البائعين', metricValue(metrics.vendors), 'من قاعدة البيانات', 'cyan', '▣'],
          ['إجمالي المندوبين', metricValue(metrics.deliveries), 'من قاعدة البيانات', 'blue', '♧'], ['إجمالي الطلبات', metricValue(metrics.orders), 'من قاعدة البيانات', 'orange', '▤'],
          ['إجمالي المبيعات', metricValue(metrics.sales, ' ج.م'), 'طلبات مكتملة', 'green', 'ج.م'], ['صافي أرباح المنصة', metricValue(metrics.profits, ' ج.م'), 'لا يوجد نموذج أرباح', 'pink', '↗'],
          ['إجمالي العمولات', metricValue(metrics.commissions, ' ج.م'), 'لا يوجد نموذج عمولات', 'teal', '%'], ['إجمالي السحوبات', metricValue(metrics.withdrawals, ' ج.م'), 'لا يوجد نموذج سحوبات', 'red', '↘'],
        ].map(([label, value, trend, color, icon]) => `<article class="pro-kpi ${color}"><div class="pro-kpi-icon">${icon}</div><div><span>${label}</span><strong>${value}</strong><small>${trend} هذا الشهر</small></div></article>`).join('')}
      </section>
      <section class="dashboard-columns main-charts">
        <div class="pro-panel sales-panel"><div class="pro-panel-head"><div><h3>نمو الطلبات والمبيعات</h3><small>بيانات فعلية من آخر 30 يومًا</small></div><span class="period-label">آخر 30 يومًا</span></div><div class="line-chart"><div class="chart-y"><span>طلبات</span><span>0</span></div><svg viewBox="0 0 760 250" preserveAspectRatio="none"><path d="${chartPath}" fill="none" stroke="#16add7" stroke-width="4" stroke-linecap="round"/></svg><div class="chart-x">${chartPoints.length ? chartPoints.filter((_, index) => index % 5 === 0).map((point) => `<span>${escapeHtml(point.label)}</span>`).join('') : '<span>لا توجد طلبات خلال الفترة</span>'}</div></div></div>
        <div class="pro-panel category-panel"><div class="pro-panel-head"><h3>توزيع الطلبات حسب الفئة</h3></div><div class="section-data-note">لا توجد بيانات فئات مرتبطة بالطلبات في قاعدة البيانات الحالية.</div></div>
      </section>
      <section class="dashboard-columns data-panels"><div class="pro-panel table-panel-pro"><div class="pro-panel-head"><h3>أحدث الطلبات</h3><button class="view-all" data-section-link="orders">عرض الكل ‹</button></div><table><thead><tr><th>#</th><th>العميل</th><th>المتجر</th><th>الحالة</th><th>التاريخ</th><th>المبلغ</th></tr></thead><tbody>${recentOrdersHtml}</tbody></table></div><div class="pro-panel side-list"><div class="pro-panel-head"><h3>أحدث المستخدمين</h3><button class="view-all" data-section-link="users">عرض الكل ‹</button></div><ul>${recentUsersHtml}</ul></div></section>
      <section class="dashboard-columns lower-panels"><div class="pro-panel activity-table"><div class="pro-panel-head"><h3>آخر العمليات</h3><button class="view-all" data-section-link="audit-log">عرض الكل ‹</button></div><ul>${activityHtml}</ul></div><div class="pro-panel important-panel"><div class="pro-panel-head"><h3>الإشعارات المهمة</h3><button class="view-all" data-section-link="global-notifications">عرض الكل ‹</button></div><div class="section-data-note">لا توجد إشعارات إدارية عامة متاحة من الـ API الحالي.</div></div></section>
    </div>`;
  document.querySelectorAll('[data-section-link]').forEach((button) => button.addEventListener('click', () => {
    state.section = button.dataset.sectionLink;
    renderApp();
  }));
  return;

  const values = data && Object.keys(data).length ? data : {
    users: 8723,
    stores: 12458,
    orders: 12854,
    deliveries: 8670,
    revenue: '2,480,500',
    activeStores: 1250,
    newUsers: 322,
    conversions: 32,
    topOrders: 12458,
    monthly: [18, 15, 22, 17, 26, 30, 24, 27, 31, 29, 33, 36],
  };

  const chartBars = [
    { label: '1', val: 18 }, { label: '2', val: 15 }, { label: '3', val: 22 }, { label: '4', val: 17 },
    { label: '5', val: 26 }, { label: '6', val: 30 }, { label: '7', val: 24 }, { label: '8', val: 27 },
    { label: '9', val: 31 }, { label: '10', val: 29 }, { label: '11', val: 33 }, { label: '12', val: 36 },
  ];

  const chartLine = chartBars.map((item) => `${item.label} ${item.val}`).join(' ');

  target.innerHTML = `
    <div class="dashboard-shell">
      <div class="topbar-lite">
        <div class="search-box">
          <span>بحث في اللوحة</span>
        </div>
        <div class="top-tools">
          <button class="icon-btn">🔔</button>
          <button class="icon-btn">⚙</button>
          <div class="user-pill">
            <span class="avatar">A</span>
            <span>أحمد</span>
          </div>
        </div>
      </div>

      <div class="hero-card">
        <div class="hero-copy">
          <p class="hero-sub">لوحة إدارة NOW</p>
          <h2>مرحبا بك في لوحة التحكم</h2>
          <p>إدارة كاملة للمنصة، المبيعات، الطلبات، المتاجر، والتقارير في مكان واحد.</p>
          <button class="primary hero-btn">إدارة الطلبات</button>
        </div>
        <div class="hero-graphic">
          <div class="screen">
            <div class="screen-header"></div>
            <div class="screen-body">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div class="floating-card card-one">+22%</div>
          <div class="floating-card card-two">NOW</div>
        </div>
      </div>

      <div class="stat-grid">
        <article class="metric-card purple">
          <div class="metric-icon">🛒</div>
          <div>
            <span class="metric-label">إجمالي الطلبات</span>
            <strong>${escapeHtml(values.orders || 12854)}</strong>
            <small class="trend up">+12% هذا الشهر</small>
          </div>
        </article>
        <article class="metric-card cyan">
          <div class="metric-icon">👥</div>
          <div>
            <span class="metric-label">المستخدمون</span>
            <strong>${escapeHtml(values.users || 8723)}</strong>
            <small class="trend up">+8% هذا الشهر</small>
          </div>
        </article>
        <article class="metric-card blue">
          <div class="metric-icon">🏬</div>
          <div>
            <span class="metric-label">المتاجر</span>
            <strong>${escapeHtml(values.stores || 12458)}</strong>
            <small class="trend up">+15% هذا الشهر</small>
          </div>
        </article>
        <article class="metric-card green">
          <div class="metric-icon">💰</div>
          <div>
            <span class="metric-label">الإيرادات</span>
            <strong>${escapeHtml(values.revenue || '2,480,500')}</strong>
            <small class="trend up">+18% هذا الشهر</small>
          </div>
        </article>
      </div>

      <div class="analytics-grid">
        <section class="chart-panel panel-box">
          <div class="panel-head"><h3>إجمالي الطلبات</h3><button>آخر 30 يوم</button></div>
          <div class="chart-wrap">
            <svg viewBox="0 0 600 250" preserveAspectRatio="none" aria-label="line chart" class="chart-svg">
              <defs>
                <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stop-color="#5ec9ef" stop-opacity="0.35"/>
                  <stop offset="100%" stop-color="#5ec9ef" stop-opacity="0.02"/>
                </linearGradient>
              </defs>
              <path d="M 0 170 C 40 170, 70 120, 105 130 S 170 88, 210 102 S 280 58, 320 78 S 400 40, 470 60 S 530 54, 600 32 L 600 250 L 0 250 Z" fill="url(#lineFill)"></path>
              <path d="M 0 170 C 40 170, 70 120, 105 130 S 170 88, 210 102 S 280 58, 320 78 S 400 40, 470 60 S 530 54, 600 32" fill="none" stroke="#2ab0d8" stroke-width="4" stroke-linecap="round"></path>
            </svg>
            <div class="chart-labels">
              <span>1</span><span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span>
            </div>
          </div>
        </section>

        <aside class="donut-panel panel-box">
          <div class="panel-head"><h3>حالة الطلبات</h3></div>
          <div class="donut-wrap">
            <div class="donut-ring">
              <div class="donut-inner">
                <strong>12,548</strong>
                <span>إجمالي</span>
              </div>
            </div>
            <ul class="legend-list">
              <li><span class="dot pink"></span> طلبات ناجحة</li>
              <li><span class="dot blue"></span> قيد التنفيذ</li>
              <li><span class="dot green"></span> مكتملة</li>
            </ul>
          </div>
        </aside>
      </div>

      <div class="bottom-grid">
        <section class="panel-box table-panel">
          <div class="panel-head"><h3>آخر الطلبات</h3><button>عرض الكل</button></div>
          <table>
            <thead>
              <tr>
                <th>الطلب</th>
                <th>العميل</th>
                <th>المتجر</th>
                <th>الحالة</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>#10258</td>
                <td>أحمد محمد</td>
                <td>مطعم البيت</td>
                <td><span class="status-badge success">مكتمل</span></td>
                <td>420 ج.م</td>
              </tr>
              <tr>
                <td>#10257</td>
                <td>سارة علي</td>
                <td>كافيه المدى</td>
                <td><span class="status-badge processing">قيد التنفيذ</span></td>
                <td>680 ج.م</td>
              </tr>
              <tr>
                <td>#10256</td>
                <td>مصطفى عبد</td>
                <td>متجر النور</td>
                <td><span class="status-badge pending">قيد الانتظار</span></td>
                <td>320 ج.م</td>
              </tr>
              <tr>
                <td>#10255</td>
                <td>مها يوسف</td>
                <td>مخبز الحلو</td>
                <td><span class="status-badge success">مكتمل</span></td>
                <td>500 ج.م</td>
              </tr>
            </tbody>
          </table>
        </section>

        <aside class="panel-box activity-panel">
          <div class="panel-head"><h3>النشاط</h3></div>
          <ul class="activity-list">
            <li><span class="dot green"></span><div><strong>تم استقبال طلب جديد</strong><small>قبل 5 دقائق</small></div></li>
            <li><span class="dot blue"></span><div><strong>تحديث حالة متجر</strong><small>قبل 18 دقيقة</small></div></li>
            <li><span class="dot orange"></span><div><strong>تمت مراجعة طلب متجر</strong><small>قبل 32 دقيقة</small></div></li>
            <li><span class="dot pink"></span><div><strong>تمت إضافة مستخدم جديد</strong><small>قبل 1 ساعة</small></div></li>
          </ul>
        </aside>
      </div>
    </div>
  `;
}

function renderUsers(payload, target) {
  let rows = listOf(payload, ['users']);
  rows = rows.filter((item) => (!state.query || `${item.name} ${item.phone}`.includes(state.query))
    && (state.status === 'all' || (state.status === 'active' ? item.isActive : !item.isActive)));
  target.innerHTML = `${toolbar()}<div class="panel"><div class="panel-title"><h2>إدارة المستخدمين</h2><span class="count">${rows.length} مستخدم</span></div>
    <div class="table-wrap"><table><thead><tr><th>المستخدم</th><th>الهاتف</th><th>الدور</th><th>تاريخ التسجيل</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>
    ${rows.map((item) => `<tr><td><b>${escapeHtml(item.name)}</b></td><td>${escapeHtml(item.phone)}</td><td><span class="tag">${escapeHtml(item.role?.name || item.role || '—')}</span></td>
    <td>${formatDate(item.createdAt)}</td><td><span class="status ${item.isActive ? 'success' : 'danger'}">${item.isActive ? 'نشط' : 'معطل'}</span></td><td>
    ${actionButton(item.isActive ? 'تعطيل' : 'تفعيل', item.isActive ? 'danger-text' : 'success-text', item.isActive ? 'suspend-user' : 'activate-user', item.id)}
    ${actionButton('تعديل', 'neutral-text', 'edit-user', item.id)}</td></tr>`).join('')}</tbody></table></div></div>`;
  bindFilter(() => renderUsers(payload, document.querySelector('#section-content')));
  bindActionButtons(loadSection, {
    'suspend-user': (id) => request(`/admin/users/${id}/suspend`, { method: 'PATCH' }),
    'activate-user': (id) => request(`/admin/users/${id}/activate`, { method: 'PATCH' }),
    'edit-user': async (id) => { const name = prompt('اسم المستخدم الجديد:'); if (name) await request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }); },
  });
}

function renderStores(payload, target) {
  let rows = listOf(payload, ['stores']);
  rows = rows.filter((item) => (!state.query || `${item.name} ${item.vendor?.name}`.includes(state.query))
    && (state.status === 'all' || (state.status === 'active' ? item.isActive : !item.isActive)));
  target.innerHTML = `${toolbar('بحث باسم المتجر أو المالك...')}<div class="panel"><div class="panel-title"><h2>إدارة المتاجر</h2><span class="count">${rows.length} متجر</span></div>
  <div class="table-wrap"><table><thead><tr><th>المتجر</th><th>المالك</th><th>الطلبات</th><th>فتح المتجر</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>
  ${rows.map((item) => `<tr><td><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.description || '')}</small></td><td>${escapeHtml(item.vendor?.name || '—')}</td><td>${item._count?.orders || 0}</td>
  <td><span class="status ${item.isOpen ? 'success' : 'muted-status'}">${item.isOpen ? 'مفتوح' : 'مغلق'}</span></td><td><span class="status ${item.isActive ? 'success' : 'danger'}">${item.isActive ? 'نشط' : 'معطل'}</span></td><td>
  ${actionButton(item.isActive ? 'تعطيل' : 'تفعيل', item.isActive ? 'danger-text' : 'success-text', item.isActive ? 'suspend-store' : 'activate-store', item.id)}
  ${actionButton('تعديل', 'neutral-text', 'edit-store', item.id)}</td></tr>`).join('')}</tbody></table></div></div>`;
  bindFilter(() => renderStores(payload, document.querySelector('#section-content')));
  bindActionButtons(loadSection, {
    'suspend-store': (id) => request(`/admin/stores/${id}/suspend`, { method: 'PATCH' }),
    'activate-store': (id) => request(`/admin/stores/${id}/activate`, { method: 'PATCH' }),
    'edit-store': async (id) => { const name = prompt('اسم المتجر الجديد:'); if (name) await request(`/admin/stores/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }); },
  });
}

function renderOrders(payload, target) {
  let rows = listOf(payload, ['orders']);
  if (state.query) rows = rows.filter((item) => `${item.id} ${item.customer?.name} ${item.store?.name}`.includes(state.query));
  target.innerHTML = `${toolbar('بحث برقم الطلب أو العميل...')}<div class="panel"><div class="panel-title"><h2>إدارة الطلبات</h2><span class="count">${rows.length} طلب</span></div>
  <div class="table-wrap"><table><thead><tr><th>رقم الطلب</th><th>العميل</th><th>المتجر</th><th>المندوب</th><th>الإجمالي</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>
  ${rows.map((item) => `<tr><td><b>#${escapeHtml(item.id)}</b></td><td>${escapeHtml(item.customer?.name || '—')}</td><td>${escapeHtml(item.store?.name || '—')}</td>
  <td>${escapeHtml(item.delivery?.name || 'غير معين')}</td><td><b>${money(item.totalPrice)}</b></td><td><span class="status order-status">${escapeHtml(item.status || '—')}</span></td><td>${formatDate(item.createdAt)}</td></tr>`).join('')}</tbody></table></div></div>`;
  bindFilter(() => renderOrders(payload, document.querySelector('#section-content')));
}

function renderDeliveries(payload, target) {
  let rows = listOf(payload, ['deliveries']);
  rows = rows.filter((item) => !state.query || `${item.name} ${item.phone}`.includes(state.query));
  target.innerHTML = `${toolbar()}<div class="panel"><div class="panel-title"><h2>إدارة المندوبين</h2><span class="count">${rows.length} مندوب</span></div>
  <div class="table-wrap"><table><thead><tr><th>المندوب</th><th>الهاتف</th><th>الطلبات</th><th>حالة التوصيل</th><th>الحساب</th></tr></thead><tbody>
  ${rows.map((item) => `<tr><td><b>${escapeHtml(item.name)}</b></td><td>${escapeHtml(item.phone)}</td><td>${item._count?.deliveries || 0}</td>
  <td><span class="status ${item.deliveryProfile?.status === 'ONLINE' ? 'success' : 'muted-status'}">${escapeHtml(item.deliveryProfile?.status || 'OFFLINE')}</span></td>
  <td><span class="status ${item.approvalStatus === 'PENDING_ADMIN_REVIEW' ? 'warning' : item.isActive ? 'success' : 'danger'}">${item.approvalStatus === 'PENDING_ADMIN_REVIEW' ? 'بانتظار المراجعة' : item.isActive ? 'نشط' : 'معطل'}</span>
  ${item.approvalStatus === 'PENDING_ADMIN_REVIEW' || !item.isActive ? actionButton('موافقة وتفعيل', 'success-text', 'activate-delivery', item.id) : actionButton('تعطيل', 'danger-text', 'suspend-delivery', item.id)}</td></tr>`).join('')}</tbody></table></div></div>`;
  bindFilter(() => renderDeliveries(payload, document.querySelector('#section-content')));
  bindActionButtons(loadSection, {
    'activate-delivery': (id) => request(`/admin/users/${id}/activate`, { method: 'PATCH' }),
    'suspend-delivery': (id) => request(`/admin/users/${id}/suspend`, { method: 'PATCH' }),
  });
}

const submissionLabels = { store: 'متجر', menu_item: 'صنف', offer: 'عرض / خصم' };
function renderSubmissions(payload, target) {
  const rows = listOf(payload, ['items', 'submissions']);
  target.innerHTML = `<div class="panel"><div class="panel-title"><h2>مراجعات البائعين</h2><span class="count">${rows.length} طلب معلق</span></div>
  ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>النوع</th><th>العنوان</th><th>البائع</th><th>التاريخ</th><th>الإجراء</th></tr></thead><tbody>${rows.map((item) => `<tr>
  <td><span class="tag">${submissionLabels[item.submissionType] || escapeHtml(item.submissionType)}</span></td><td><b>${escapeHtml(item.title || item.name || item.store?.name || 'بدون عنوان')}</b></td>
  <td>${escapeHtml(item.vendor?.name || item.store?.vendor?.name || 'غير معروف')}</td><td>${formatDate(item.createdAt)}</td><td class="submission-actions">
  ${actionButton('اعتماد', 'success-fill', 'approve', `${item.submissionType}:${item.id}`)}<input class="reject-reason" data-reason="${item.submissionType}:${item.id}" maxlength="500" placeholder="اكتب سبب الرفض" aria-label="سبب رفض الطلب" />${actionButton('رفض', 'danger-fill', 'reject', `${item.submissionType}:${item.id}`)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted empty">لا توجد طلبات معلقة حاليًا.</p>'}</div>`;
  bindActionButtons(loadSection, {
    approve: (key) => { const [type, id] = key.split(':'); return request(`/admin/submissions/${type}/${id}/approve`, { method: 'PATCH' }); },
    reject: (key) => { const [type, id] = key.split(':'); const reason = document.querySelector(`[data-reason="${key}"]`).value.trim(); if (!reason) throw new Error('اكتب سبب الرفض أولًا'); return request(`/admin/submissions/${type}/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ rejectionReason: reason }) }); },
  });
}

function renderReports(data, target) {
  const report = data || {};
  const cards = [['إجمالي الطلبات', report.totalOrders, '▤'], ['الإيرادات', money(report.revenue), 'ج.م'], ['مستخدمو الشهر', report.newUsers, '♙'], ['المتاجر النشطة', report.activeStores, '▣']];
  target.innerHTML = `<div class="stats">${cards.map(([label, value, icon]) => `<article class="stat blue"><span class="stat-icon">${icon}</span><div><strong>${escapeHtml(value || 0)}</strong><span>${label}</span></div></article>`).join('')}</div>
  <div class="two-panels">${rankPanel('أكثر المتاجر مبيعًا', report.topStores, 'orders', 'طلب')} ${rankPanel('أكثر المنتجات طلبًا', report.topItems, 'quantity', 'قطعة')}</div>`;
}

function rankPanel(title, rows = [], key, suffix) {
  return `<div class="panel"><h2>${title}</h2>${rows.length ? rows.map((item, index) => `<div class="rank"><b>#${index + 1}</b><span>${escapeHtml(item.name)}</span><strong>${escapeHtml(item[key])} ${suffix}</strong></div>`).join('') : '<p class="muted empty">لا توجد بيانات كافية بعد.</p>'}</div>`;
}

function renderSubAdmins(payload, target) {
  const rows = listOf(payload, ['users', 'subAdmins']);
  const permissionGroups = [
    ['إدارة المستخدمين', ['users.read', 'users.write']], ['إدارة الطلبات', ['orders.read', 'orders.write']],
    ['إدارة البائعين والخدمات', ['vendors.read', 'stores.write']], ['التقارير والإحصائيات', ['reports.read', 'reports.export']],
    ['الإدارة المالية', ['finance.read', 'finance.write']], ['إدارة النظام', ['settings.read', 'settings.write']],
  ];
  target.innerHTML = `<div class="subadmin-page"><div class="pro-panel subadmin-intro"><div><span class="eyebrow">SYSTEM ACCESS CONTROL</span><h2>إدارة الإدمن الفرعي</h2><p>أنشئ حسابات مخصصة لفريقك وحدد بالضبط ما يمكن لكل عضو الوصول إليه.</p></div><button class="primary compact" id="add-sub-admin">+ إنشاء إدمن فرعي</button></div><div class="pro-panel"><div class="pro-panel-head"><div><h3>حسابات فريق الإدارة</h3><small>${rows.length} حساب بصلاحيات مخصصة</small></div><span class="count">صلاحيات آمنة</span></div><div class="table-wrap"><table><thead><tr><th>المستخدم</th><th>الهاتف</th><th>الصلاحيات</th><th>آخر دخول</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>${rows.length ? rows.map((item) => `<tr><td><b>${escapeHtml(item.name)}</b></td><td>${escapeHtml(item.phone)}</td><td><span class="permission-summary">${escapeHtml((item.permissions || []).length || 0)} صلاحية</span></td><td>${formatDate(item.lastLoginAt)}</td><td><span class="status ${item.isActive ? 'success' : 'danger'}">${item.isActive ? 'نشط' : 'موقوف'}</span></td><td>${actionButton('تعديل الصلاحيات', 'neutral-text', 'edit-permissions', item.id)} ${actionButton(item.isActive ? 'إيقاف' : 'تفعيل', item.isActive ? 'danger-text' : 'success-text', item.isActive ? 'disable-sub-admin' : 'enable-sub-admin', item.id)}</td></tr>`).join('') : '<tr><td colspan="6" class="empty">لا يوجد إدمن فرعي حتى الآن. أنشئ أول حساب لفريقك.</td></tr>'}</tbody></table></div></div></div><dialog id="subadmin-modal" class="subadmin-modal"><form method="dialog" id="subadmin-form"><div class="pro-panel-head"><h3>إنشاء إدمن فرعي</h3><button type="button" class="modal-close">×</button></div><label class="field">الاسم<input name="name" required placeholder="اسم الموظف" /></label><label class="field">رقم الهاتف<input name="phone" required placeholder="01xxxxxxxxx" /></label><label class="field">كلمة المرور<input name="password" type="password" required minlength="8" placeholder="8 أحرف على الأقل" /></label><h4>الصلاحيات المسموحة</h4><div class="permission-grid">${permissionGroups.map(([group, permissions]) => `<fieldset><legend>${group}</legend>${permissions.map((permission) => `<label><input type="checkbox" name="permissions" value="${permission}" /> ${permission}</label>`).join('')}</fieldset>`).join('')}</div><button class="primary" value="default" type="submit">حفظ الإدمن والصلاحيات</button></form></dialog>`;
  const modal = document.querySelector('#subadmin-modal');
  document.querySelector('#add-sub-admin')?.addEventListener('click', () => modal.showModal());
  document.querySelector('.modal-close')?.addEventListener('click', () => modal.close());
  document.querySelector('#subadmin-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try { await request('/admin/sub-admins', { method: 'POST', body: JSON.stringify({ name: form.get('name'), phone: form.get('phone'), password: form.get('password'), permissions: form.getAll('permissions') }) }); modal.close(); await loadSection(); } catch (error) { alert(error.message); }
  });
  bindActionButtons(loadSection, {
    'disable-sub-admin': (id) => request(`/admin/sub-admins/${id}`, { method: 'DELETE' }),
    'enable-sub-admin': (id) => request(`/admin/sub-admins/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive: true }) }),
    'edit-permissions': async (id) => { const permissions = prompt('أدخل الصلاحيات مفصولة بفاصلة:'); if (permissions) await request(`/admin/sub-admins/${id}`, { method: 'PATCH', body: JSON.stringify({ permissions: permissions.split(',').map((value) => value.trim()).filter(Boolean) }) }); },
  });
  return;

  target.innerHTML = `<div class="panel"><div class="panel-title"><h2>المشرفون الفرعيون</h2><button class="primary compact" id="add-sub-admin">+ إضافة مشرف</button></div>
  ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>الاسم</th><th>الهاتف</th><th>الصلاحيات</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>${rows.map((item) => `<tr><td><b>${escapeHtml(item.name)}</b></td><td>${escapeHtml(item.phone)}</td>
  <td>${escapeHtml((item.permissions || []).join('، ') || '—')}</td><td><span class="status ${item.isActive ? 'success' : 'danger'}">${item.isActive ? 'نشط' : 'معطل'}</span></td><td>${actionButton('تعطيل', 'danger-text', 'disable-sub-admin', item.id)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted empty">لا يوجد مشرفون فرعيون.</p>'}</div>`;
  document.querySelector('#add-sub-admin')?.addEventListener('click', async () => {
    const name = prompt('اسم المشرف:'); const phone = name && prompt('رقم الهاتف:'); const password = phone && prompt('كلمة المرور (8 أحرف على الأقل):');
    if (name && phone && password) { try { await request('/admin/sub-admins', { method: 'POST', body: JSON.stringify({ name, phone, password, permissions: ['users.read', 'stores.read', 'orders.read', 'reports.read'] }) }); await loadSection(); } catch (error) { alert(error.message); } }
  });
  bindActionButtons(loadSection, { 'disable-sub-admin': (id) => request(`/admin/sub-admins/${id}`, { method: 'DELETE' }) });
}

if (state.token && state.user && ['admin', 'sub_admin'].includes(state.user.role)) renderApp();
else renderLogin();
