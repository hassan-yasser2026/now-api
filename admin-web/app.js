const API_URL = 'https://now-api-production-ca56.up.railway.app/api';
const app = document.querySelector('#app');

const state = {
  token: localStorage.getItem('now_admin_token'),
  user: JSON.parse(localStorage.getItem('now_admin_user') || 'null'),
  section: 'dashboard',
  query: '',
  status: 'all',
};

const sections = [
  ['dashboard', 'الرئيسية', '⌂'],
  ['users', 'المستخدمون', '♙'],
  ['stores', 'المتاجر', '▣'],
  ['orders', 'الطلبات', '▤'],
  ['submissions', 'مراجعات البائعين', '✓'],
  ['delivery', 'المندوبون', '♧'],
  ['reports', 'التقارير', '◈'],
  ['sub-admins', 'المشرفون الفرعيون', '⚙'],
];

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
        <nav class="nav">${sections.map(([key, label, icon]) =>
          `<button data-section="${key}" class="${key === state.section ? 'active' : ''}"><i>${icon}</i>${label}</button>`).join('')}</nav>
        <div class="sidebar-footer"><span class="online-dot"></span> متصل بالخادم
          <button class="logout" id="logout">تسجيل الخروج</button></div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div><p class="eyebrow">NOW PLATFORM</p><h1>${escapeHtml(sections.find(([key]) => key === state.section)?.[1] || 'لوحة الإدارة')}</h1>
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
    const data = await loaders[state.section]();
    ({ dashboard: renderDashboard, users: renderUsers, stores: renderStores, orders: renderOrders,
      submissions: renderSubmissions, delivery: renderDeliveries, reports: renderReports,
      'sub-admins': renderSubAdmins }[state.section])(data, target);
  } catch (error) {
    target.innerHTML = `<div class="panel error-box"><b>تعذر تحميل القسم</b><p>${escapeHtml(error.message)}</p><button class="refresh" id="retry">إعادة المحاولة</button></div>`;
    document.querySelector('#retry')?.addEventListener('click', loadSection);
  }
}

function renderDashboard(data, target) {
  const values = data || {};
  const cards = [['المستخدمون', values.users, '♙', 'blue'], ['المتاجر', values.stores, '▣', 'purple'],
    ['الطلبات', values.orders, '▤', 'orange'], ['المندوبون', values.deliveries, '♧', 'green']];
  target.innerHTML = `<div class="stats">${cards.map(([label, value, icon, color]) =>
    `<article class="stat ${color}"><span class="stat-icon">${icon}</span><div><strong>${escapeHtml(value || 0)}</strong><span>${label}</span></div></article>`).join('')}</div>
    <div class="quick-grid"><div class="panel"><h2>إجراءات سريعة</h2><div class="quick-actions">
      <button data-section="submissions">مراجعة طلبات البائعين <b>→</b></button><button data-section="users">إدارة المستخدمين <b>→</b></button>
      <button data-section="stores">متابعة المتاجر <b>→</b></button><button data-section="reports">عرض التقارير <b>→</b></button></div></div>
    <div class="panel"><h2>حالة النظام</h2><div class="system-status"><span class="online-dot"></span><b>كل الخدمات تعمل بشكل طبيعي</b><small>آخر تحديث: الآن</small></div></div></div>`;
  target.querySelectorAll('[data-section]').forEach((button) => button.addEventListener('click', () => { state.section = button.dataset.section; renderApp(); }));
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
  <td><span class="status ${item.isActive ? 'success' : 'danger'}">${item.isActive ? 'نشط' : 'معطل'}</span></td></tr>`).join('')}</tbody></table></div></div>`;
  bindFilter(() => renderDeliveries(payload, document.querySelector('#section-content')));
}

const submissionLabels = { store: 'متجر', menu_item: 'صنف', offer: 'عرض / خصم' };
function renderSubmissions(payload, target) {
  const rows = listOf(payload, ['items', 'submissions']);
  target.innerHTML = `<div class="panel"><div class="panel-title"><h2>مراجعات البائعين</h2><span class="count">${rows.length} طلب معلق</span></div>
  ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>النوع</th><th>العنوان</th><th>البائع</th><th>التاريخ</th><th>الإجراء</th></tr></thead><tbody>${rows.map((item) => `<tr>
  <td><span class="tag">${submissionLabels[item.submissionType] || escapeHtml(item.submissionType)}</span></td><td><b>${escapeHtml(item.title || item.name || item.store?.name || 'بدون عنوان')}</b></td>
  <td>${escapeHtml(item.vendor?.name || item.store?.vendor?.name || 'غير معروف')}</td><td>${formatDate(item.createdAt)}</td><td class="submission-actions">
  ${actionButton('اعتماد', 'success-fill', 'approve', `${item.submissionType}:${item.id}`)}<select class="reject-reason" data-reason="${item.submissionType}:${item.id}"><option value="">سبب الرفض</option><option value="INVALID_INFORMATION">بيانات غير صحيحة</option><option value="POLICY_VIOLATION">مخالفة السياسات</option><option value="DUPLICATE">مكرر</option><option value="QUALITY_ISSUE">مشكلة الجودة</option><option value="OTHER">سبب آخر</option></select>${actionButton('رفض', 'danger-fill', 'reject', `${item.submissionType}:${item.id}`)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted empty">لا توجد طلبات معلقة حاليًا.</p>'}</div>`;
  bindActionButtons(loadSection, {
    approve: (key) => { const [type, id] = key.split(':'); return request(`/admin/submissions/${type}/${id}/approve`, { method: 'PATCH' }); },
    reject: (key) => { const [type, id] = key.split(':'); const reason = document.querySelector(`[data-reason="${key}"]`).value; if (!reason) throw new Error('اختر سبب الرفض أولًا'); return request(`/admin/submissions/${type}/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ rejectionReason: reason }) }); },
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
