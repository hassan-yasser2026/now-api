import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../services/api';
import useAppStore from '../../store/appStore';
import { COLORS } from '../../constants/colors';

/*
 * Keep section permissions aligned with the backend, including its legacy
 * aliases for existing sub-admin accounts.
 */
const ADMIN_PERMISSION_ALIASES = {
  'products.read': ['stores.read'],
  'products.write': ['stores.update'],
  'ratings.read': ['reports.read'],
  'ratings.delete': ['ratings.write', 'reports.read'],
  'support.read': ['complaints.read', 'reports.read'],
  'support.reply': ['complaints.write', 'complaints.read', 'reports.read'],
  'support.status': ['complaints.write', 'complaints.read', 'reports.read'],
};

const SECTIONS = [
  { key: 'dashboard', label: 'الرئيسية', permission: 'reports.read' },
  { key: 'users', label: 'المستخدمون', permission: 'users.read' },
  { key: 'stores', label: 'المتاجر', permission: 'stores.read' },
  { key: 'products', label: 'المنتجات', permission: 'products.read' },
  { key: 'orders', label: 'الطلبات', permission: 'orders.read' },
  { key: 'payments', label: 'المدفوعات', permission: 'orders.read' },
  { key: 'offers', label: 'العروض', permission: 'stores.read' },
  { key: 'wallets', label: 'المحافظ', permission: 'finance.read' },
  { key: 'invoices', label: 'الفواتير', permission: 'finance.read' },
  { key: 'notifications', label: 'الإشعارات', permission: 'notifications.read' },
  { key: 'ratings', label: 'التقييمات', permission: 'reports.read' },
  { key: 'support', label: 'الدعم والمحادثات', permission: 'support.read' },
  { key: 'submissions', label: 'طلبات الشركاء', permission: 'stores.read' },
  { key: 'delivery', label: 'التوصيل', permission: 'delivery.read' },
  { key: 'reports', label: 'التقارير', permission: 'reports.read' },
  { key: 'audit-log', label: 'سجل العمليات', permission: 'audit.read' },
  { key: 'sub-admins', label: 'المشرفون', adminOnly: true },
];

const DASHBOARD_CARD_KEYS = [
  ['المستخدمون', 'users'],
  ['العملاء', 'customers'],
  ['البائعون', 'vendors'],
  ['المندوبون', 'deliveries'],
  ['الطلبات', 'orders'],
  ['قيد التنفيذ', 'activeOrders'],
  ['المكتملة', 'completedOrders'],
  ['المتاجر المفتوحة', 'openStores'],
  ['المنتجات', 'products'],
  ['الإيرادات', 'sales'],
];

const getPayload = (response) => response?.data?.data ?? response?.data ?? null;

const getErrorMessage = (error, fallback = 'حدث خطأ. حاول مرة أخرى.') => (
  error?.response?.data?.message || error?.message || fallback
);

const listFromPayload = (payload, key) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  return [];
};

const ADMIN_LABELS = {
  admin: 'مدير رئيسي',
  sub_admin: 'مشرف فرعي',
  customer: 'عميل',
  vendor: 'بائع',
  delivery: 'مندوب',
  OPEN: 'مفتوحة',
  IN_PROGRESS: 'قيد المتابعة',
  CLOSED: 'مغلقة',
  PENDING: 'معلقة',
  ACCEPTED: 'مقبولة',
  PREPARING: 'قيد التحضير',
  READY: 'جاهزة',
  PICKED_UP: 'تم الاستلام',
  ON_THE_WAY: 'في الطريق',
  DELIVERED: 'تم التوصيل',
  CANCELLED: 'ملغاة',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
  ACTIVE: 'نشط',
  INACTIVE: 'غير نشط',
};

const adminLabel = (value) => ADMIN_LABELS[value] || value;

const valueOrDash = (value) => (
  value === null || value === undefined || value === '' ? '—' : String(value)
);

const formatMoney = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2)} ر.س` : '—';
};

const normalizePermissions = (user) => {
  if (Array.isArray(user?.permissions)) return user.permissions;
  if (Array.isArray(user?.subAdminPermissions)) {
    return user.subAdminPermissions.map((item) => item?.permission?.name || item).filter(Boolean);
  }
  return [];
};

const AdminDashboardScreen = () => {
  const user = useAppStore((state) => state.user);
  const role = useAppStore((state) => state.role);
  const logout = useAppStore((state) => state.logout);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboard, setDashboard] = useState({ data: null, loading: true, error: null });
  const [sectionStates, setSectionStates] = useState({});
  const [actionId, setActionId] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [userFilters, setUserFilters] = useState({ search: '', role: '', active: '' });
  const [notification, setNotification] = useState({ title: '', body: '', role: '' });
  const [productForm, setProductForm] = useState(null);
  const [subAdminForm, setSubAdminForm] = useState(null);
  const [permissionOptions, setPermissionOptions] = useState([]);
  const [supportSession, setSupportSession] = useState(null);
  const [supportReply, setSupportReply] = useState('');
  const [submissionDetail, setSubmissionDetail] = useState(null);
  const [rejectionTarget, setRejectionTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');

  const permissions = useMemo(() => normalizePermissions(user), [user]);
  const isAdmin = role === 'admin' || user?.role === 'admin';
  const can = useCallback((permission) => (
    isAdmin
    || permissions.includes(permission)
    || (ADMIN_PERMISSION_ALIASES[permission] || []).some((alias) => permissions.includes(alias))
  ), [isAdmin, permissions]);

  const visibleSections = useMemo(
    () => SECTIONS.filter((section) => !section.adminOnly ? can(section.permission) : isAdmin),
    [can, isAdmin],
  );

  const setSectionState = useCallback((name, updates) => {
    setSectionStates((current) => ({
      ...current,
      [name]: { ...(current[name] || { data: [], loading: false, error: null }), ...updates },
    }));
  }, []);

  const loadDashboard = useCallback(async () => {
    setDashboard((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await api.get('/admin/dashboard');
      setDashboard({ data: getPayload(response) || {}, loading: false, error: null });
    } catch (error) {
      setDashboard((current) => ({ ...current, loading: false, error: getErrorMessage(error, 'تعذر تحميل لوحة الإدارة.') }));
    }
  }, []);

  const loadSection = useCallback(async (name, params = {}) => {
    if (name === 'dashboard') return loadDashboard();
    const definition = SECTIONS.find((section) => section.key === name);
    if (!definition || (definition.adminOnly && !isAdmin) || (!definition.adminOnly && !can(definition.permission))) {
      setSectionState(name, { data: [], loading: false, error: 'لا تملك الصلاحية لعرض هذا القسم.' });
      return;
    }
    setSectionState(name, { data: [], loading: true, error: null });
    try {
      const endpoint = name === 'support' ? '/admin/support/sessions' : `/admin/${name}`;
      const response = await api.get(endpoint, { params });
      setSectionState(name, { data: getPayload(response), loading: false, error: null });
    } catch (error) {
      setSectionState(name, { data: [], loading: false, error: getErrorMessage(error, 'تعذر تحميل بيانات القسم.') });
    }
  }, [can, isAdmin, loadDashboard, setSectionState]);

  const sendSupportReply = async () => {
    if (!supportSession || supportReply.trim().length < 1 || !can('support.reply')) return;
    setActionId(`support-reply-${supportSession.id}`);
    try {
      await api.post(`/admin/support/sessions/${supportSession.id}/messages`, { message: supportReply.trim() });
      setSupportReply('');
      await loadSection('support');
      const refreshed = await api.get(`/admin/support/sessions/${supportSession.id}`);
      setSupportSession(getPayload(refreshed));
    } catch (error) {
      Alert.alert('تعذر الرد', getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const updateSupportStatus = async (status) => {
    if (!supportSession || !can('support.status')) return;
    setActionId(`support-status-${supportSession.id}`);
    try {
      const response = await api.patch(`/admin/support/sessions/${supportSession.id}/status`, { status });
      setSupportSession(getPayload(response));
      await loadSection('support');
    } catch (error) {
      Alert.alert('تعذر تغيير الحالة', getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const updateSubmission = async (item, status, reason = '') => {
    if (!can('stores.update')) return;
    const normalizedReason = reason.trim();
    if (status === 'REJECTED' && !normalizedReason) {
      setRejectionError('اكتب سبب الرفض أولاً.');
      return;
    }
    setActionId(`submission-${status}-${item.id}`);
    try {
      const type = item.submissionType;
      await api.patch(`/admin/submissions/${type}/${item.id}/${status === 'APPROVED' ? 'approve' : 'reject'}`,
        status === 'REJECTED' ? { rejectionReason: normalizedReason } : {});
      setRejectionTarget(null);
      setRejectionReason('');
      setRejectionError('');
      setSubmissionDetail(null);
      await loadSection('submissions');
      Alert.alert('تم بنجاح', status === 'APPROVED' ? 'تم اعتماد الطلب ونشره.' : 'تم رفض الطلب.');
    } catch (error) {
      Alert.alert('تعذر تحديث الطلب', getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const loadPermissions = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await api.get('/admin/permissions');
      const payload = getPayload(response);
      setPermissionOptions(Array.isArray(payload) ? payload : []);
    } catch {
      // The form remains usable and displays the same backend error state as other sections.
      setPermissionOptions([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (can('stores.read')) loadSection('submissions');
  }, [can, loadSection]);

  useEffect(() => {
    if (!visibleSections.some((section) => section.key === activeSection)) {
      setActiveSection('dashboard');
    }
  }, [activeSection, visibleSections]);

  useEffect(() => {
    if (activeSection !== 'dashboard') loadSection(activeSection);
  }, [activeSection, loadSection]);

  const selectSection = (name) => {
    setActiveSection(name);
    if (name === 'sub-admins') loadPermissions();
  };

  const refreshActive = () => {
    if (activeSection === 'dashboard') return loadDashboard();
    if (activeSection === 'users') {
      return loadSection('users', Object.fromEntries(
        Object.entries(userFilters).filter(([, value]) => value),
      ));
    }
    return loadSection(activeSection);
  };

  const confirm = (title, message) => new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'إلغاء', style: 'cancel', onPress: () => resolve(false) },
      { text: 'تأكيد', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });

  const runAction = async (item, action) => {
    const requiredPermission = action.startsWith('user-')
      ? (action === 'user-reset' ? 'users.update' : 'users.suspend')
      : action.startsWith('store-')
        ? (action === 'store-open' || action === 'store-close' ? 'stores.update' : 'stores.suspend')
        : 'products.write';
    if (!can(requiredPermission)) return;
    const isDelete = action === 'user-delete';
    if (!(await confirm(
      isDelete ? 'تأكيد حذف الحساب' : 'تأكيد العملية',
      isDelete
        ? 'سيتم حذف الحساب نهائيًا من النظام، ولن يتمكن صاحبه من الدخول، وسيصبح رقم الهاتف متاحًا للتسجيل من جديد. هل تريد المتابعة؟'
        : 'هل تريد تنفيذ هذه العملية؟',
    ))) return;
    setActionId(`${action}-${item.id}`);
    try {
      if (action === 'user-suspend' || action === 'user-activate') {
        await api.patch(`/admin/users/${item.id}/${action === 'user-suspend' ? 'suspend' : 'activate'}`,
          action === 'user-suspend' ? { reason: 'إجراء إداري' } : {});
      } else if (action === 'user-delete') {
        await api.delete(`/admin/users/${item.id}`);
      } else if (action === 'store-open' || action === 'store-close') {
        await api.patch(`/admin/stores/${item.id}`, { isOpen: action === 'store-open' });
      } else if (action === 'store-suspend' || action === 'store-activate') {
        await api.patch(`/admin/stores/${item.id}/${action === 'store-suspend' ? 'suspend' : 'activate'}`);
      } else if (action === 'product-toggle') {
        await api.patch(`/admin/products/${item.id}`, { isAvailable: item.isAvailable === false });
      }
      await loadSection(activeSection);
      Alert.alert('تم بنجاح', isDelete ? 'تم حذف الحساب وإتاحة رقم الهاتف للتسجيل من جديد.' : 'تم تنفيذ العملية بنجاح.');
    } catch (error) {
      Alert.alert('تعذر التنفيذ', getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const resetPassword = async () => {
    if (!resetUser || !can('users.update') || newPassword.length < 8) {
      Alert.alert('بيانات غير صالحة', 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
      return;
    }
    setActionId(`reset-${resetUser.id}`);
    try {
      await api.post(`/admin/users/${resetUser.id}/reset-password`, { newPassword });
      setResetUser(null);
      setNewPassword('');
      Alert.alert('تم بنجاح', 'تم تغيير كلمة المرور.');
    } catch (error) {
      Alert.alert('تعذر تغيير كلمة المرور', getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const saveProduct = async () => {
    if (!productForm?.name?.trim() || !productForm?.storeId || !productForm?.originalPrice || !can('products.write')) {
      Alert.alert('بيانات غير صالحة', 'اسم المنتج والمتجر والسعر الأصلي مطلوبة.');
      return;
    }
    setActionId('product-save');
    const payload = {
      ...productForm,
      name: productForm.name.trim(),
      storeId: Number(productForm.storeId),
      categoryId: productForm.categoryId ? Number(productForm.categoryId) : null,
      originalPrice: Number(productForm.originalPrice),
      discountValue: Number(productForm.discountValue || 0),
      isDemo: productForm.isDemo === true,
      isAvailable: productForm.isAvailable !== false,
    };
    try {
      if (productForm.id) await api.patch(`/admin/products/${productForm.id}`, payload);
      else await api.post('/admin/products', payload);
      setProductForm(null);
      await loadSection('products');
      Alert.alert('تم بنجاح', 'تم حفظ المنتج.');
    } catch (error) {
      Alert.alert('تعذر حفظ المنتج', getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const saveSubAdmin = async () => {
    // Keep this handler in component scope. The previous implementation nested
    // it inside saveProduct, so the modal's onPress referenced an undefined name.
    if (!subAdminForm?.name?.trim() || !subAdminForm?.phone?.trim()
      || (!subAdminForm.id && (subAdminForm.password || '').length < 8)
      || !subAdminForm.permissions?.length) {
      Alert.alert('بيانات غير صالحة', 'الاسم والهاتف والصلاحيات مطلوبة، وكلمة المرور 8 أحرف على الأقل للمشرف الجديد.');
      return;
    }
    setActionId('sub-admin-save');
    const payload = {
      name: subAdminForm.name.trim(),
      phone: subAdminForm.phone.trim(),
      email: subAdminForm.email?.trim() || '',
      permissions: [...new Set(subAdminForm.permissions)],
      ...(subAdminForm.password ? { password: subAdminForm.password } : {}),
    };
    try {
      if (subAdminForm.id) await api.patch(`/admin/sub-admins/${subAdminForm.id}`, payload);
      else await api.post('/admin/sub-admins', payload);
      setSubAdminForm(null);
      await loadSection('sub-admins');
      Alert.alert('تم بنجاح', 'تم حفظ بيانات المشرف والصلاحيات.');
    } catch (error) {
      Alert.alert('تعذر حفظ المشرف', getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const toggleSubAdmin = async (item) => {
    if (!isAdmin) return;
    setActionId(`sub-admin-toggle-${item.id}`);
    try {
      await api.patch(`/admin/sub-admins/${item.id}`, { isActive: item.isActive === false });
      await loadSection('sub-admins');
    } catch (error) {
      Alert.alert('تعذر تحديث الحالة', getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const sendNotification = async () => {
    if (!notification.title.trim() || !notification.body.trim() || !can('notifications.write')) {
      Alert.alert('بيانات غير صالحة', 'عنوان ونص الإشعار مطلوبان.');
      return;
    }
    setActionId('notification');
    try {
      const idempotencyKey = `broadcast-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await api.post('/admin/notifications/broadcast', {
        title: notification.title.trim(),
        body: notification.body.trim(),
        ...(notification.role ? { role: notification.role } : {}),
      }, { headers: { 'Idempotency-Key': idempotencyKey } });
      setNotification({ title: '', body: '', role: '' });
      Alert.alert('تم بنجاح', 'تم إرسال الإشعار.');
    } catch (error) {
      Alert.alert('تعذر الإرسال', getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const stats = dashboard.data || {};
  const sectionState = sectionStates[activeSection] || { data: [], loading: false, error: null };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={dashboard.loading || sectionState.loading} onRefresh={refreshActive} />}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.brand}>NOW</Text>
            <Text style={styles.title}>لوحة الإدارة</Text>
            <Text style={styles.subtitle}>مرحبًا {user?.name || 'مدير النظام'}</Text>
            {!isAdmin && <Text style={styles.roleBadge}>مشرف بصلاحيات محددة</Text>}
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>خروج</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sections}>
          {visibleSections.map((section) => (
            <TouchableOpacity
              key={section.key}
              style={[styles.sectionButton, activeSection === section.key && styles.sectionButtonActive]}
              onPress={() => selectSection(section.key)}
            >
              <View style={styles.sectionLabel}>
                <Text style={[styles.sectionButtonText, activeSection === section.key && styles.sectionButtonTextActive]}>
                  {section.label}
                </Text>
                {section.key === 'submissions' && listFromPayload(sectionStates.submissions?.data, 'submissions').length > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{listFromPayload(sectionStates.submissions.data, 'submissions').length}</Text></View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activeSection === 'dashboard' ? (
          <DashboardContent
            dashboard={dashboard}
            stats={stats}
            onRetry={loadDashboard}
          />
        ) : (
          <SectionContent
            name={activeSection}
            state={sectionState}
            can={can}
            filters={userFilters}
            setFilters={setUserFilters}
            onSearch={() => loadSection('users', Object.fromEntries(Object.entries(userFilters).filter(([, value]) => value)))}
            actionId={actionId}
            onAction={runAction}
            onReset={(item) => { setResetUser(item); setNewPassword(''); }}
            onProductCreate={() => setProductForm({ name: '', description: '', storeId: '', categoryId: '', originalPrice: '', discountValue: '', discountType: 'PERCENTAGE', image: '', isAvailable: true, isDemo: false })}
            onProductEdit={(item) => setProductForm({ ...item, storeId: item.storeId || item.store?.id, categoryId: item.categoryId || '' })}
            onSubAdminCreate={() => setSubAdminForm({ name: '', phone: '', email: '', password: '', permissions: [] })}
            onSubAdminEdit={(item) => setSubAdminForm({ ...item, password: '', permissions: item.permissions || [] })}
            onSubAdminToggle={toggleSubAdmin}
            notification={notification}
            setNotification={setNotification}
            onSendNotification={sendNotification}
            canWriteNotification={can('notifications.write')}
            onNotificationOpen={(item) => {
              const data = item?.data;
              if (data?.submissionType && data?.submissionId) {
                setSubmissionDetail({ ...data, id: data.submissionId });
              }
            }}
            isAdmin={isAdmin}
            onRetry={refreshActive}
            onSupportOpen={async (item) => {
              try {
                const response = await api.get(`/admin/support/sessions/${item.id}`);
                setSupportSession(getPayload(response));
              } catch (error) {
                Alert.alert('تعذر فتح المحادثة', getErrorMessage(error));
              }
            }}
            supportSession={supportSession}
            supportReply={supportReply}
            setSupportReply={setSupportReply}
            onSupportReply={sendSupportReply}
            onSupportStatus={updateSupportStatus}
            canSupportRead={can('support.read')}
            canSupportReply={can('support.reply')}
            canSupportStatus={can('support.status')}
            submissionDetail={submissionDetail}
            onSubmissionOpen={setSubmissionDetail}
            onSubmissionUpdate={updateSubmission}
          />
        )}
        {submissionDetail && (
          <ModalCard title={submissionDetail.submissionType === 'partner_user' ? 'تفاصيل طلب الشريك' : 'تفاصيل طلب البائع'} onClose={() => setSubmissionDetail(null)} scroll>
            <SubmissionDetails item={submissionDetail} />
            {can('stores.update') && (
              <View style={styles.modalActions}>
                <SmallButton
                  label="رفض الطلب"
                  secondary
                  onPress={() => {
                    setRejectionReason('');
                    setRejectionError('');
                    setRejectionTarget(submissionDetail);
                  }}
                  loading={actionId === `submission-REJECTED-${submissionDetail.id}`}
                />
                <SmallButton label="اعتماد ونشر" onPress={() => updateSubmission(submissionDetail, 'APPROVED')} loading={actionId === `submission-APPROVED-${submissionDetail.id}`} />
              </View>
            )}
          </ModalCard>
        )}
        {rejectionTarget && (
          <ModalCard title="سبب رفض الطلب" onClose={() => setRejectionTarget(null)}>
            <Text style={styles.detailText}>اكتب سببًا واضحًا ليتم إرساله إلى البائع.</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={rejectionReason}
              onChangeText={(value) => {
                setRejectionReason(value);
                if (rejectionError) setRejectionError('');
              }}
              placeholder="مثال: يرجى استكمال بيانات المتجر أو تعديل صورة المنتج"
              multiline
              maxLength={500}
              textAlign="right"
            />
            <Text style={styles.muted}>{rejectionReason.length}/500</Text>
            {rejectionError ? <Text style={styles.error}>{rejectionError}</Text> : null}
            <ModalActions
              onCancel={() => setRejectionTarget(null)}
              onSave={() => updateSubmission(rejectionTarget, 'REJECTED', rejectionReason)}
              loading={actionId === `submission-REJECTED-${rejectionTarget.id}`}
            />
          </ModalCard>
        )}
      </ScrollView>

      {resetUser && (
        <ModalCard title={`تغيير كلمة مرور ${resetUser.name}`} onClose={() => setResetUser(null)}>
          <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="كلمة المرور الجديدة" secureTextEntry textAlign="right" />
          <ModalActions onCancel={() => setResetUser(null)} onSave={resetPassword} loading={actionId === `reset-${resetUser.id}`} />
        </ModalCard>
      )}
      {productForm && (
        <ModalCard title={productForm.id ? 'تعديل المنتج' : 'إضافة منتج'} onClose={() => setProductForm(null)} scroll>
          {[
            ['name', 'اسم المنتج'], ['description', 'الوصف'], ['storeId', 'رقم المتجر'],
            ['categoryId', 'رقم التصنيف (اختياري)'], ['originalPrice', 'السعر الأصلي'],
            ['discountValue', 'قيمة الخصم'], ['image', 'رابط الصورة'],
          ].map(([key, placeholder]) => (
            <TextInput
              key={key}
              style={styles.input}
              value={String(productForm[key] ?? '')}
              onChangeText={(value) => setProductForm((current) => ({ ...current, [key]: value }))}
              placeholder={placeholder}
              keyboardType={['storeId', 'categoryId', 'originalPrice', 'discountValue'].includes(key) ? 'numeric' : 'default'}
              textAlign="right"
            />
          ))}
          <Chip label="منتج تجريبي" selected={productForm.isDemo} onPress={() => setProductForm((current) => ({ ...current, isDemo: !current.isDemo }))} />
          <ModalActions onCancel={() => setProductForm(null)} onSave={saveProduct} loading={actionId === 'product-save'} />
        </ModalCard>
      )}
      {subAdminForm && (
        <ModalCard title={subAdminForm.id ? 'تعديل مشرف' : 'إضافة مشرف جديد'} onClose={() => setSubAdminForm(null)} scroll>
          {[
            ['name', 'اسم المشرف'], ['phone', 'رقم الهاتف'], ['email', 'البريد الإلكتروني'],
            ...(!subAdminForm.id ? [['password', 'كلمة المرور']] : []),
          ].map(([key, placeholder]) => (
            <TextInput
              key={key}
              style={styles.input}
              value={String(subAdminForm[key] ?? '')}
              onChangeText={(value) => setSubAdminForm((current) => ({ ...current, [key]: value }))}
              placeholder={placeholder}
              secureTextEntry={key === 'password'}
              keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
              textAlign="right"
            />
          ))}
          <Text style={styles.formTitle}>الصلاحيات</Text>
          <View style={styles.chipRow}>
            <Chip label="تحديد الكل" onPress={() => setSubAdminForm((current) => ({ ...current, permissions: permissionOptions.map((item) => item.name) }))} />
            <Chip label="مسح الكل" onPress={() => setSubAdminForm((current) => ({ ...current, permissions: [] }))} />
          </View>
          <View style={styles.chipRow}>
            {permissionOptions.map((permission) => (
              <Chip
                key={permission.name}
                label={permission.label || permission.name}
                selected={subAdminForm.permissions.includes(permission.name)}
                onPress={() => setSubAdminForm((current) => ({
                  ...current,
                  permissions: current.permissions.includes(permission.name)
                    ? current.permissions.filter((item) => item !== permission.name)
                    : [...current.permissions, permission.name],
                }))}
              />
            ))}
          </View>
          <ModalActions onCancel={() => setSubAdminForm(null)} onSave={saveSubAdmin} loading={actionId === 'sub-admin-save'} />
        </ModalCard>
      )}
      {supportSession && (
        <ModalCard title={`محادثة الدعم #${supportSession.id}`} onClose={() => setSupportSession(null)} scroll>
          <Text style={styles.muted}>
            {supportSession.user?.name || 'عميل'} {supportSession.order?.id ? `• الطلب #${supportSession.order.id}` : ''}
          </Text>
          {(supportSession.messages || []).map((message) => (
            <View key={message.id} style={styles.panel}>
              <Text style={styles.muted}>{message.sender === 'ADMIN' || message.sender === 'SUBADMIN' ? 'الدعم' : 'العميل'} • {message.createdAt ? new Date(message.createdAt).toLocaleString('ar-EG') : ''}</Text>
              <Text style={styles.cardText}>{message.message}</Text>
            </View>
          ))}
          {can('support.reply') && supportSession.status !== 'CLOSED' && (
            <>
              <TextInput style={[styles.input, styles.textArea]} value={supportReply} onChangeText={setSupportReply} placeholder="اكتب الرد..." multiline textAlign="right" />
              <PrimaryButton label="إرسال الرد" onPress={sendSupportReply} loading={actionId === `support-reply-${supportSession.id}`} />
            </>
          )}
          {can('support.status') && (
            <View style={styles.chipRow}>
              {['OPEN', 'IN_PROGRESS', 'CLOSED'].map((status) => (
                <Chip key={status} label={adminLabel(status)} selected={supportSession.status === status} onPress={() => updateSupportStatus(status)} />
              ))}
            </View>
          )}
        </ModalCard>
      )}
    </SafeAreaView>
  );
};

const DashboardContent = ({ dashboard, stats, onRetry }) => {
  if (dashboard.loading && !dashboard.data) return <LoadingState />;
  if (dashboard.error && !dashboard.data) return <ErrorState message={dashboard.error} onRetry={onRetry} />;
  return (
    <View>
      {dashboard.error && <InlineError message={dashboard.error} onRetry={onRetry} />}
      <View style={styles.grid}>{DASHBOARD_CARD_KEYS.map(([label, key]) => <Stat key={label} label={label} value={key === 'sales' ? formatMoney(stats[key]) : stats[key]} />)}</View>
      <Text style={styles.sectionTitle}>آخر الطلبات</Text>
      {(stats.recentOrders || []).length === 0 ? <EmptyState text="لا توجد طلبات حديثة." /> : (
        stats.recentOrders.map((order) => (
          <InfoRow key={order.id} title={`طلب #${order.id}`} meta={`${order.customer?.name || '—'} • ${order.store?.name || '—'}`} value={formatMoney(order.totalPrice)} />
        ))
      )}
      <Text style={styles.sectionTitle}>آخر المستخدمين</Text>
      {(stats.recentUsers || []).length === 0 ? <EmptyState text="لا يوجد مستخدمون جدد." /> : (
        stats.recentUsers.map((item) => <InfoRow key={item.id} title={item.name} meta={`${adminLabel(item.role?.name) || '—'} • ${item.phone || '—'}`} />)
      )}
    </View>
  );
};

const SectionContent = (props) => {
  const {
    name, state, can, filters, setFilters, onSearch, actionId, onAction, onReset,
    onProductCreate, onProductEdit, onSubAdminCreate, onSubAdminEdit, onSubAdminToggle,
    notification, setNotification, onSendNotification, canWriteNotification, onNotificationOpen, isAdmin,
    onRetry, onSupportOpen, supportSession, supportReply, setSupportReply,
    onSupportReply, onSupportStatus, canSupportRead, canSupportReply, canSupportStatus,
    submissionDetail, onSubmissionOpen, onSubmissionUpdate,
  } = props;
  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState message={state.error} onRetry={onRetry} />;
  if (name === 'notifications') {
    return (
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>إرسال إشعار</Text>
        {!canWriteNotification && <Text style={styles.muted}>تحتاج إلى صلاحية إرسال الإشعارات.</Text>}
        <TextInput style={styles.input} value={notification.title} onChangeText={(title) => setNotification((current) => ({ ...current, title }))} placeholder="عنوان الإشعار" textAlign="right" />
        <TextInput style={[styles.input, styles.textArea]} value={notification.body} onChangeText={(body) => setNotification((current) => ({ ...current, body }))} placeholder="نص الإشعار" multiline textAlign="right" />
        <View style={styles.chipRow}>
          {['', 'customer', 'vendor', 'delivery'].map((value) => <Chip key={value || 'all'} label={value ? adminLabel(value) : 'كل المستخدمين'} selected={notification.role === value} onPress={() => setNotification((current) => ({ ...current, role: value }))} />)}
        </View>
        <PrimaryButton label="إرسال الإشعار" onPress={onSendNotification} loading={actionId === 'notification'} disabled={!canWriteNotification} />
        <Text style={styles.sectionTitle}>إشعارات طلبات الشركاء</Text>
        {listFromPayload(state.data, 'notifications').filter((item) => item.data?.submissionType).map((item) => (
          <TouchableOpacity key={item.id} style={styles.notificationCard} onPress={() => onNotificationOpen(item)}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowMeta}>{item.body}</Text>
            <Text style={styles.rowMeta}>اضغط لعرض الصور والبيانات كاملة</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }
  if (name === 'users') {
    const users = listFromPayload(state.data, 'users');
    return (
      <View>
        <View style={styles.panel}>
          <TextInput style={styles.input} value={filters.search} onChangeText={(search) => setFilters((current) => ({ ...current, search }))} placeholder="بحث بالاسم أو الهاتف أو الرقم" textAlign="right" />
          <View style={styles.chipRow}>
            {['', 'customer', 'vendor', 'delivery', 'sub_admin'].map((value) => <Chip key={value || 'all-role'} label={value ? adminLabel(value) : 'كل الأدوار'} selected={filters.role === value} onPress={() => setFilters((current) => ({ ...current, role: value }))} />)}
            {['', 'true', 'false'].map((value) => <Chip key={value || 'all-active'} label={value === 'true' ? 'نشط' : value === 'false' ? 'غير نشط' : 'كل الحالات'} selected={filters.active === value} onPress={() => setFilters((current) => ({ ...current, active: value }))} />)}
          </View>
          <PrimaryButton label="تطبيق الفلاتر" onPress={onSearch} />
        </View>
        {users.length === 0 ? <EmptyState text="لا توجد نتائج للمستخدمين." /> : users.map((item) => (
          <InfoRow
            key={item.id}
            title={item.name || `#${item.id}`}
            meta={`${adminLabel(item.role?.name) || '—'} • ${item.isActive === false ? 'غير نشط' : 'نشط'}`}
            actions={(
              <>
                {can('users.suspend') && <SmallButton label={item.isActive === false ? 'تفعيل' : 'تعطيل'} onPress={() => onAction(item, item.isActive === false ? 'user-activate' : 'user-suspend')} loading={actionId === `${item.isActive === false ? 'user-activate' : 'user-suspend'}-${item.id}`} />}
                {can('users.suspend') && <SmallButton label="حذف الحساب" secondary onPress={() => onAction(item, 'user-delete')} loading={actionId === `user-delete-${item.id}`} />}
                {can('users.update') && <SmallButton label="كلمة المرور" secondary onPress={() => onReset(item)} />}
              </>
            )}
          />
        ))}
      </View>
    );
  }
  if (name === 'support') {
    const sessions = Array.isArray(state.data) ? state.data : listFromPayload(state.data, 'sessions');
    if (!canSupportRead) return <EmptyState text="لا تملك صلاحية قراءة محادثات الدعم." />;
    return (
      <View>
        {sessions.length === 0 ? <EmptyState text="لا توجد محادثات دعم." /> : sessions.map((item) => (
          <InfoRow
            key={item.id}
            title={`محادثة #${item.id} • ${item.user?.name || 'عميل'}`}
            meta={`${adminLabel(item.status || 'OPEN')}${item.order?.id ? ` • الطلب #${item.order.id}` : ''}`}
            value={item.messages?.[item.messages.length - 1]?.message || 'بدون رسائل'}
            actions={<SmallButton label="فتح المحادثة" onPress={() => onSupportOpen(item)} />}
          />
        ))}
        {supportSession && <Text style={styles.muted}>المحادثة المحددة: #{supportSession.id}</Text>}
        {!canSupportReply && !canSupportStatus && <Text style={styles.muted}>صلاحية القراءة فقط.</Text>}
      </View>
    );
  }
  if (name === 'submissions') {
    const submissions = listFromPayload(state.data, 'submissions');
    return (
      <View>
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingBannerTitle}>طلبات بائعين جديدة</Text>
          <Text style={styles.pendingBannerText}>{submissions.length ? `يوجد ${submissions.length} طلب يحتاج المراجعة.` : 'لا توجد طلبات معلقة حاليًا.'}</Text>
        </View>
        {submissions.length === 0 ? <EmptyState text="لا توجد طلبات معلقة." /> : submissions.map((item) => (
          <TouchableOpacity key={`${item.submissionType}-${item.id}`} style={styles.submissionCard} onPress={() => onSubmissionOpen(item)}>
            <SubmissionImage item={item} />
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{item.name || item.title || `طلب #${item.id}`}</Text>
              <Text style={styles.rowMeta}>{item.submissionType === 'store' ? 'متجر' : item.submissionType === 'offer' ? 'عرض' : 'منتج'} • {item.store?.vendor?.name || item.vendor?.name || 'بائع'}</Text>
              <Text style={styles.rowMeta}>{item.store?.name || item.name || '—'} • اضغط لعرض كل البيانات</Text>
            </View>
            <View style={styles.newBadge}><Text style={styles.newBadgeText}>جديد</Text></View>
          </TouchableOpacity>
        ))}
      </View>
    );
  }
  if (name === 'products') {
    const products = listFromPayload(state.data, 'products');
    return (
      <View>
        {can('products.write') && <PrimaryButton label="إضافة منتج" onPress={onProductCreate} />}
        {products.length === 0 ? <EmptyState text="لا توجد منتجات." /> : products.map((item) => (
          <InfoRow key={item.id} title={item.name || `#${item.id}`} meta={`${item.store?.name || 'متجر #' + item.storeId} • ${item.isAvailable === false ? 'غير متاح' : 'متاح'}`} value={formatMoney(item.price)} actions={can('products.write') ? <><SmallButton label="تعديل" onPress={() => onProductEdit(item)} /><SmallButton label={item.isAvailable === false ? 'تفعيل' : 'تعطيل'} secondary onPress={() => onAction(item, 'product-toggle')} /></> : null} />
        ))}
      </View>
    );
  }
  if (name === 'stores') {
    const stores = listFromPayload(state.data, 'stores');
    return stores.length === 0 ? <EmptyState text="لا توجد متاجر." /> : stores.map((item) => (
      <InfoRow key={item.id} title={item.name || `#${item.id}`} meta={`${item.vendor?.name || '—'} • ${item.isActive === false ? 'غير نشط' : 'نشط'}`} value={item.isOpen ? 'مفتوح' : 'مغلق'} actions={(
        <>
          {can('stores.update') && <SmallButton label={item.isOpen ? 'غلق' : 'فتح'} onPress={() => onAction(item, item.isOpen ? 'store-close' : 'store-open')} />}
          {can('stores.suspend') && <SmallButton label={item.isActive === false ? 'تفعيل' : 'تعطيل'} secondary onPress={() => onAction(item, item.isActive === false ? 'store-activate' : 'store-suspend')} />}
        </>
      )} />
    ));
  }
  if (name === 'sub-admins') {
    const admins = listFromPayload(state.data, 'sub-admins');
    return (
      <View>
        {isAdmin && <PrimaryButton label="إضافة مشرف" onPress={onSubAdminCreate} />}
        {admins.length === 0 ? <EmptyState text="لا يوجد مشرفون فرعيون." /> : admins.map((item) => (
          <InfoRow key={item.id} title={item.name} meta={`${item.phone} • ${item.isActive === false ? 'غير نشط' : 'نشط'}`} value={`${item.permissions?.length || 0} صلاحيات`} actions={isAdmin ? <><SmallButton label="تعديل" onPress={() => onSubAdminEdit(item)} /><SmallButton label={item.isActive === false ? 'تفعيل' : 'تعطيل'} secondary onPress={() => onSubAdminToggle(item)} loading={actionId === `sub-admin-toggle-${item.id}`} /></> : null} />
        ))}
      </View>
    );
  }
  return <GenericSection data={state.data} name={name} />;
};

const GenericSection = ({ data, name }) => {
  const records = listFromPayload(data, name);
  if (records.length === 0) {
    if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0) {
      return <View style={styles.panel}>{Object.entries(data).map(([key, value]) => <InfoRow key={key} title={key} value={typeof value === 'object' ? JSON.stringify(value) : valueOrDash(value)} />)}</View>;
    }
    return <EmptyState text="لا توجد بيانات في هذا القسم." />;
  }
  return records.map((item, index) => <InfoRow key={item.id || `${name}-${index}`} title={item.name || item.title || item.id || `#${index + 1}`} meta={adminLabel(item.status || item.action || item.createdAt || '')} value={item.totalPrice ? formatMoney(item.totalPrice) : ''} />);
};

const getSubmissionImages = (item) => {
  if (item.submissionType === 'partner_user') {
    return [item.profileImage, item.idImage, item.motorcycleImage, item.motorcycleCardImage, item.store?.image].filter(Boolean);
  }
  return [item.submissionType === 'store'
    ? item.image || item.vendor?.profileImage
    : item.image || item.store?.image || item.store?.vendor?.profileImage].filter(Boolean);
};

const getSubmissionImage = (item) => getSubmissionImages(item)[0];

const SubmissionImage = ({ item, large = false }) => {
  const uri = getSubmissionImage(item);
  return uri
    ? <Image source={{ uri }} style={large ? styles.submissionImageLarge : styles.submissionImage} />
    : <View style={large ? styles.submissionImagePlaceholderLarge : styles.submissionImagePlaceholder}><Text style={styles.muted}>لا توجد صورة</Text></View>;
};

const SubmissionDetails = ({ item }) => {
  const vendor = item.vendor || item.store?.vendor;
  const isPartner = item.submissionType === 'partner_user';
  const roleLabel = item.submissionRole === 'delivery' ? 'مندوب' : 'بائع';
  const images = getSubmissionImages(item);
  const imageLabels = isPartner
    ? ['الصورة الشخصية', 'صورة البطاقة', 'صورة الدراجة', 'بطاقة الدراجة', 'صورة المتجر']
    : ['الصورة'];
  return (
    <View>
      {images.length
        ? images.map((uri, index) => (
          <View key={`${uri}-${index}`}>
            <Text style={styles.detailText}>{imageLabels[index] || 'صورة مرفقة'}</Text>
            <Image source={{ uri }} style={styles.submissionImageLarge} />
          </View>
        ))
        : <SubmissionImage item={item} large />}
      <Text style={styles.detailTitle}>{item.name || item.title || `طلب #${item.id}`}</Text>
      <Text style={styles.detailText}>نوع الطلب: {isPartner ? `طلب ${roleLabel}` : item.submissionType === 'store' ? 'متجر' : item.submissionType === 'offer' ? 'عرض' : 'منتج'}</Text>
      <Text style={styles.detailText}>{isPartner ? 'الاسم' : 'البائع'}: {isPartner ? item.name || '—' : vendor?.name || '—'}</Text>
      <Text style={styles.detailText}>الهاتف: {(isPartner ? item.phone : vendor?.phone) || '—'}</Text>
      {isPartner && item.email ? <Text style={styles.detailText}>البريد الإلكتروني: {item.email}</Text> : null}
      {isPartner && item.store?.name ? <Text style={styles.detailText}>اسم المتجر: {item.store.name}</Text> : null}
      {!isPartner && <Text style={styles.detailText}>المتجر: {item.store?.name || item.name || '—'}</Text>}
      {isPartner && item.submissionRole === 'delivery' && item.vehicleType ? <Text style={styles.detailText}>نوع المركبة: {item.vehicleType}</Text> : null}
      {isPartner && item.submissionRole === 'delivery' && item.vehiclePlate ? <Text style={styles.detailText}>رقم المركبة: {item.vehiclePlate}</Text> : null}
      {isPartner && (item.latitude !== null || item.longitude !== null) ? <Text style={styles.detailText}>الموقع: {item.latitude || '—'} ، {item.longitude || '—'}</Text> : null}
      {item.description ? <Text style={styles.detailText}>الوصف: {item.description}</Text> : null}
      {item.price !== undefined ? <Text style={styles.detailText}>السعر: {formatMoney(item.price)}</Text> : null}
      {item.originalPrice !== undefined ? <Text style={styles.detailText}>السعر الأصلي: {formatMoney(item.originalPrice)}</Text> : null}
      {item.discountValue !== undefined ? <Text style={styles.detailText}>الخصم: {valueOrDash(item.discountValue)}</Text> : null}
      <Text style={styles.detailText}>تاريخ التقديم: {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</Text>
    </View>
  );
};

const ModalCard = ({ title, onClose, children, scroll }) => (
  <View style={styles.modalOverlay}>
    {scroll ? <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalCard}><Text style={styles.modalTitle}>{title}</Text>{children}<TouchableOpacity style={styles.cancelButton} onPress={onClose}><Text>إغلاق</Text></TouchableOpacity></ScrollView> : <View style={styles.modalCard}><Text style={styles.modalTitle}>{title}</Text>{children}</View>}
  </View>
);

const ModalActions = ({ onCancel, onSave, loading }) => (
  <View style={styles.modalActions}><TouchableOpacity style={styles.cancelButton} onPress={onCancel}><Text>إلغاء</Text></TouchableOpacity><TouchableOpacity style={styles.primaryAction} onPress={onSave} disabled={loading}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryActionText}>حفظ</Text>}</TouchableOpacity></View>
);

const Stat = ({ label, value }) => <View style={styles.card}><Text style={styles.value}>{valueOrDash(value)}</Text><Text style={styles.label}>{label}</Text></View>;
const InfoRow = ({ title, meta, value, actions }) => <View style={styles.row}><View style={styles.rowInfo}><Text style={styles.rowTitle}>{valueOrDash(title)}</Text>{meta ? <Text style={styles.rowMeta}>{valueOrDash(meta)}</Text> : null}</View>{value ? <Text style={styles.rowValue}>{valueOrDash(value)}</Text> : null}{actions ? <View style={styles.rowActions}>{actions}</View> : null}</View>;
const Chip = ({ label, selected, onPress }) => <TouchableOpacity style={[styles.chip, selected && styles.chipActive]} onPress={onPress}><Text style={selected ? styles.chipTextActive : styles.chipText}>{label}</Text></TouchableOpacity>;
const PrimaryButton = ({ label, onPress, loading, disabled }) => <TouchableOpacity style={[styles.primaryButton, disabled && styles.disabled]} onPress={onPress} disabled={disabled || loading}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>{label}</Text>}</TouchableOpacity>;
const SmallButton = ({ label, onPress, secondary, loading }) => <TouchableOpacity style={[styles.smallButton, secondary && styles.secondaryButton]} onPress={onPress} disabled={loading}>{loading ? <ActivityIndicator size="small" color={secondary ? COLORS.text : '#FFF'} /> : <Text style={secondary ? styles.secondaryButtonText : styles.smallButtonText}>{label}</Text>}</TouchableOpacity>;
const LoadingState = () => <View style={styles.state}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.muted}>جاري تحميل البيانات...</Text></View>;
const EmptyState = ({ text }) => <View style={styles.state}><Text style={styles.muted}>{text}</Text></View>;
const ErrorState = ({ message, onRetry }) => <View style={styles.state}><Text style={styles.error}>{message}</Text>{onRetry && <PrimaryButton label="إعادة المحاولة" onPress={onRetry} />}</View>;
const InlineError = ({ message, onRetry }) => <View style={styles.inlineError}><Text style={styles.error}>{message}</Text><SmallButton label="إعادة المحاولة" secondary onPress={onRetry} /></View>;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  headerText: { flex: 1, alignItems: 'flex-end' },
  brand: { color: COLORS.primaryDark, fontSize: 15, fontWeight: '800' },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '800', marginTop: 3 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, marginTop: 4 },
  roleBadge: { color: COLORS.primaryDark, fontSize: 12, marginTop: 5 },
  logoutButton: { backgroundColor: '#FDE8EC', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 10 },
  logoutText: { color: COLORS.error, fontWeight: '800' },
  sections: { flexDirection: 'row-reverse', gap: 8, paddingBottom: 16 },
  sectionLabel: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#D92D20', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  sectionButton: { backgroundColor: '#E8EEF3', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9 },
  sectionButtonActive: { backgroundColor: COLORS.primaryDark },
  sectionButtonText: { color: COLORS.textSecondary, fontWeight: '700' },
  sectionButtonTextActive: { color: COLORS.white },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', minHeight: 96, backgroundColor: COLORS.surface, borderRadius: 14, padding: 12, justifyContent: 'center', alignItems: 'center' },
  value: { color: COLORS.primaryDark, fontSize: 21, fontWeight: '800' },
  label: { color: COLORS.textSecondary, marginTop: 7, fontWeight: '700', textAlign: 'center' },
  panel: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', textAlign: 'right', marginTop: 20, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, borderRadius: 9, padding: 11, marginBottom: 9 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7, marginBottom: 9 },
  chip: { backgroundColor: '#E8EEF3', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8 },
  chipActive: { backgroundColor: COLORS.primaryDark },
  chipText: { color: COLORS.textSecondary, fontSize: 12 },
  chipTextActive: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  primaryButton: { backgroundColor: COLORS.primaryDark, borderRadius: 10, padding: 13, alignItems: 'center', marginVertical: 5 },
  primaryButtonText: { color: COLORS.white, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 8, gap: 7 },
  rowInfo: { flex: 1, alignItems: 'flex-end' },
  rowTitle: { color: COLORS.text, fontWeight: '800', textAlign: 'right' },
  rowMeta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'right' },
  rowValue: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 12 },
  rowActions: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  pendingBanner: { backgroundColor: '#FFF4E5', borderColor: '#F59E0B', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  pendingBannerTitle: { color: '#92400E', fontWeight: '800', textAlign: 'right', fontSize: 16 },
  pendingBannerText: { color: '#92400E', textAlign: 'right', marginTop: 4 },
  submissionCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: 14, padding: 10, marginBottom: 8 },
  submissionImage: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#E8EEF3' },
  submissionImagePlaceholder: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#E8EEF3', alignItems: 'center', justifyContent: 'center' },
  submissionImageLarge: { width: '100%', height: 190, borderRadius: 12, backgroundColor: '#E8EEF3', marginBottom: 12 },
  submissionImagePlaceholderLarge: { width: '100%', height: 190, borderRadius: 12, backgroundColor: '#E8EEF3', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  newBadge: { backgroundColor: '#D92D20', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 },
  newBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  detailTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', textAlign: 'right', marginBottom: 10 },
  detailText: { color: COLORS.text, textAlign: 'right', marginBottom: 7 },
  smallButton: { backgroundColor: COLORS.primaryDark, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 8 },
  smallButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 11 },
  secondaryButton: { backgroundColor: '#E8EEF3' },
  secondaryButtonText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 11 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 35, gap: 10 },
  muted: { color: COLORS.textSecondary, textAlign: 'right' },
  cardText: { color: COLORS.text, textAlign: 'right', lineHeight: 21, marginTop: 5 },
  error: { color: COLORS.error, textAlign: 'center', marginBottom: 8 },
  inlineError: { backgroundColor: '#FDE8EC', borderRadius: 10, padding: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  notificationCard: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, marginBottom: 8 },
  modalOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 18 },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 18 },
  modalScroll: { maxHeight: '92%', backgroundColor: COLORS.surface, borderRadius: 16 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', textAlign: 'right', marginBottom: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-start', gap: 8, marginTop: 8 },
  cancelButton: { backgroundColor: '#E8EEF3', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start', marginTop: 10 },
  primaryAction: { backgroundColor: COLORS.primaryDark, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  primaryActionText: { color: COLORS.white, fontWeight: '800' },
  formTitle: { color: COLORS.text, fontWeight: '800', textAlign: 'right', marginVertical: 8 },
});

export default AdminDashboardScreen;
