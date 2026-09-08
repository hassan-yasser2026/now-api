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
  ['submissions', 'مراجعات البائعين'],
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
    if (state.section === 'submissions') return renderSubmissions(await request('/admin/submissions'), target);
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

const submissionLabels = {
  store: 'متجر',
  menu_item: 'صنف',
  offer: 'عرض / خصم',
};

const rejectionReasons = [
  ['INVALID_INFORMATION', 'بيانات غير صحيحة'],
  ['POLICY_VIOLATION', 'مخالفة السياسات'],
  ['DUPLICATE', 'مكرر'],
  ['PRICING_ISSUE', 'مشكلة في السعر'],
  ['QUALITY_ISSUE', 'مشكلة في الجودة'],
  ['OTHER', 'سبب آخر'],
];

const renderSubmissions = (rows, target) => {
  const submissions = Array.isArray(rows) ? rows : rows?.items || [];
  if (!submissions.length) {
    target.innerHTML = '<div class="panel"><h2>مراجعات البائعين</h2><p class="muted">لا توجد طلبات معلقة.</p></div>';
    return;
  }
  target.innerHTML = `
    <div class="panel"><h2>مراجعات البائعين</h2><div class="table-wrap"><table>
      <thead><tr><th>النوع</th><th>العنوان</th><th>البائع</th><th>التاريخ</th><th>الإجراء</th></tr></thead>
      <tbody>${submissions.map((item) => {
        const title = item.title || item.name || item.store?.name || 'بدون عنوان';
        const vendor = item.vendor?.name || item.store?.vendor?.name || 'غير معروف';
        return `<tr>
          <td>${escapeHtml(submissionLabels[item.submissionType] || item.submissionType)}</td>
          <td>${escapeHtml(title)}</td><td>${escapeHtml(vendor)}</td>
          <td>${escapeHtml(item.createdAt ? new Date(item.createdAt).toLocaleString('ar-EG') : '')}</td>
          <td class="submission-actions">
            <button class="primary approve-submission" data-type="${escapeHtml(item.submissionType)}" data-id="${item.id}">اعتماد</button>
            <select class="reject-reason" data-id="${item.id}" data-type="${escapeHtml(item.submissionType)}">
              <option value="">سبب الرفض</option>
              ${rejectionReasons.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
            </select>
            <button class="danger reject-submission" data-type="${escapeHtml(item.submissionType)}" data-id="${item.id}">رفض</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>`;

  target.querySelectorAll('.approve-submission').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await request(`/admin/submissions/${button.dataset.type}/${button.dataset.id}/approve`, { method: 'PATCH' });
        await loadSection();
      } catch (error) {
        target.querySelector('.panel').insertAdjacentHTML('afterbegin', `<p class="error">${escapeHtml(error.message)}</p>`);
      }
    });
  });
  target.querySelectorAll('.reject-submission').forEach((button) => {
    button.addEventListener('click', async () => {
      const select = target.querySelector(`.reject-reason[data-id="${button.dataset.id}"][data-type="${button.dataset.type}"]`);
      if (!select.value) return alert('اختر سبب الرفض أولاً');
      try {
        await request(`/admin/submissions/${button.dataset.type}/${button.dataset.id}/reject`, {
          method: 'PATCH',
          body: JSON.stringify({ rejectionReason: select.value }),
        });
        await loadSection();
      } catch (error) {
        target.querySelector('.panel').insertAdjacentHTML('afterbegin', `<p class="error">${escapeHtml(error.message)}</p>`);
      }
    });
  });
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
