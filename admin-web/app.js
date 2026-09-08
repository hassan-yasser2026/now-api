const API_URL = 'https://now-api-production-ca56.up.railway.app/api';
const app = document.querySelector('#app');
const state = {
  token: localStorage.getItem('now_admin_token'),
  user: JSON.parse(localStorage.getItem('now_admin_user') || 'null'),
  section: 'dashboard',
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');

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
  if (!response.ok) throw new Error(payload.message || 'تعذر تحميل البيانات');
  return payload.data ?? payload;
};

const renderLogin = (message = '') => {
  app.innerHTML = `
    <section class="auth-page">
      <form class="auth-card" id="login-form">
        <p class="brand"><span>N</span>OW</p>
        <h1>لوحة الإدارة</h1>
        <p class="muted">تسجيل دخول منفصل وآمن لمديري NOW</p>
        <label class="field">رقم الهاتف<input name="phone" type="tel" required /></label>
        <label class="field">كلمة المرور<input name="password" type="password" required /></label>
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

const sections = [
  ['dashboard', 'الرئيسية'],
  ['users', 'المستخدمون'],
  ['stores', 'المتاجر'],
  ['orders', 'الطلبات'],
  ['delivery', 'المندوبون'],
  ['reports', 'التقارير'],
];

const renderApp = () => {
  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <p class="brand"><span>N</span>OW</p>
        <nav class="nav">
          ${sections.map(([key, label]) => `<button data-section="${key}" class="${key === state.section ? 'active' : ''}">${label}</button>`).join('')}
        </nav>
        <button class="logout" id="logout">تسجيل الخروج</button>
      </aside>
      <main class="main">
        <header class="topbar">
          <div><h1>لوحة الإدارة</h1><p class="muted">${escapeHtml(state.user?.name || 'مدير النظام')}</p></div>
          <span class="muted">متصل بالخادم</span>
        </header>
        <section id="section-content" class="loading">جار تحميل البيانات...</section>
      </main>
    </div>`;
  document.querySelectorAll('[data-section]').forEach((button) => {
    button.addEventListener('click', () => { state.section = button.dataset.section; renderApp(); });
  });
  document.querySelector('#logout').addEventListener('click', () => {
    localStorage.removeItem('now_admin_token');
    localStorage.removeItem('now_admin_user');
    state.token = null;
    state.user = null;
    renderLogin();
  });
  loadSection();
};

async function loadSection() {
  const target = document.querySelector('#section-content');
  try {
    if (state.section === 'dashboard') return renderDashboard(await request('/admin/dashboard'), target);
    const endpoint = `/admin/${state.section === 'delivery' ? 'delivery' : state.section}`;
    return renderTable(await request(endpoint), target, sections.find(([key]) => key === state.section)?.[1]);
  } catch (error) {
    target.innerHTML = `<div class="panel error">${escapeHtml(error.message)}</div>`;
  }
}

const renderDashboard = (data, target) => {
  const values = data || {};
  target.innerHTML = `
    <div class="stats">
      ${[['المستخدمون', values.users], ['المتاجر', values.stores], ['الطلبات', values.orders], ['المندوبون', values.deliveries]]
        .map(([label, value]) => `<article class="stat">${label}<strong>${escapeHtml(value || 0)}</strong></article>`).join('')}
    </div>
    <div class="panel"><h2>مرحبًا بك في لوحة الإدارة</h2><p class="muted">اختر قسمًا من القائمة لإدارة بيانات المنصة.</p></div>`;
};

const renderTable = (payload, target, title) => {
  const rows = Array.isArray(payload) ? payload : payload?.items || payload?.users || payload?.stores || payload?.orders || payload?.deliveries || [];
  if (!rows.length) {
    target.innerHTML = `<div class="panel"><h2>${title}</h2><p class="muted">لا توجد بيانات حاليًا.</p></div>`;
    return;
  }
  const keys = Object.keys(rows[0]).filter((key) => typeof rows[0][key] !== 'object').slice(0, 6);
  target.innerHTML = `<div class="panel"><h2>${title}</h2><div class="table-wrap"><table><thead><tr>${keys.map((key) => `<th>${escapeHtml(key)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${keys.map((key) => `<td>${escapeHtml(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
};

if (state.token && state.user && ['admin', 'sub_admin'].includes(state.user.role)) renderApp();
else renderLogin();
