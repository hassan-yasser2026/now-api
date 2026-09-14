import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  View,
} from 'react-native';
import api from '../../services/api';
import useAppStore from '../../store/appStore';

const getPayload = (response) => response.data?.data ?? response.data ?? {};

const AdminDashboardScreen = () => {
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);
  const [dashboard, setDashboard] = useState(null);
  const [section, setSection] = useState('dashboard');
  const [sectionData, setSectionData] = useState([]);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userActive, setUserActive] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [notificationRole, setNotificationRole] = useState('');
  const [productForm, setProductForm] = useState(null);
  const [subAdminForm, setSubAdminForm] = useState(null);
  const [loading, setLoading] = useState(true);

  const permissionOptions = [
    ['users.read', 'عرض المستخدمين'],
    ['users.update', 'تعديل المستخدمين'],
    ['users.suspend', 'تفعيل وتعطيل المستخدمين'],
    ['stores.read', 'عرض المتاجر'],
    ['stores.update', 'إدارة المتاجر والمنتجات'],
    ['stores.suspend', 'تفعيل وتعطيل المتاجر'],
    ['orders.read', 'عرض الطلبات'],
    ['delivery.read', 'إدارة التوصيل'],
    ['finance.read', 'عرض المالية'],
    ['notifications.read', 'عرض الإشعارات'],
    ['notifications.write', 'إرسال الإشعارات'],
    ['reports.read', 'عرض التقارير'],
    ['audit.read', 'عرض سجل العمليات'],
  ];

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/dashboard');
      setDashboard(getPayload(response));
    } catch (error) {
      Alert.alert('تعذر تحميل لوحة الإدارة', error.response?.data?.message || 'حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  }, []);

  const confirm = (title, message) => new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'إلغاء', style: 'cancel', onPress: () => resolve(false) },
      { text: 'تأكيد', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });

  const runAction = async (item, action) => {
    const confirmed = await confirm('تأكيد العملية', 'هل تريد تنفيذ هذه العملية؟');
    if (!confirmed) return;
    setActionId(`${action}-${item.id}`);
    try {
      if (action === 'activate' || action === 'suspend') {
        await api.patch(`/admin/users/${item.id}/${action}`, action === 'suspend' ? { reason: 'إجراء إداري' } : {});
      } else if (action === 'store-open' || action === 'store-close') {
        await api.patch(`/admin/stores/${item.id}`, { isOpen: action === 'store-open' });
      } else if (action === 'store-activate' || action === 'store-suspend') {
        await api.patch(`/admin/stores/${item.id}/${action === 'store-activate' ? 'activate' : 'suspend'}`);
      } else if (action === 'product-toggle') {
        await api.patch(`/admin/products/${item.id}`, { isAvailable: item.isAvailable === false });
      }
      Alert.alert('تم بنجاح', 'تم تنفيذ العملية بنجاح');
      await loadSection(section);
      if (section === 'dashboard') await loadDashboard();
    } catch (error) {
      Alert.alert('تعذر التنفيذ', error.response?.data?.message || 'حدث خطأ أثناء تنفيذ العملية');
    } finally {
      setActionId(null);
    }
  };

  const resetPassword = async () => {
    if (!resetUser || newPassword.length < 8) {
      Alert.alert('بيانات غير صالحة', 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    setActionId(`reset-${resetUser.id}`);
    try {
      await api.post(`/admin/users/${resetUser.id}/reset-password`, { newPassword });
      setResetUser(null);
      setNewPassword('');
      Alert.alert('تم بنجاح', 'تم تغيير كلمة المرور');
    } catch (error) {
      Alert.alert('تعذر تغيير كلمة المرور', error.response?.data?.message || 'حدث خطأ');
    } finally {
      setActionId(null);
    }
  };

  const loadSection = useCallback(async (name, params = {}) => {
    setSection(name);
    if (name === 'dashboard') return;
    setSectionLoading(true);
    try {
      const response = await api.get(`/admin/${name}`, { params });
      const payload = getPayload(response);
      setSectionData(
        Array.isArray(payload)
          ? payload
          : Array.isArray(payload[name])
            ? payload[name]
            : Object.entries(payload).map(([key, value]) => ({ id: key, name: key, value }))
      );
    } catch (error) {
      setSectionData([]);
      Alert.alert('تعذر تحميل البيانات', error.response?.data?.message || 'لا تملك الصلاحية أو حدث خطأ');
    } finally {
      setSectionLoading(false);
    }
  }, []);

  const loadUsers = () => loadSection('users', {
    ...(userSearch.trim() ? { search: userSearch.trim() } : {}),
    ...(userRole ? { role: userRole } : {}),
    ...(userActive ? { active: userActive } : {}),
  });

  const sendNotification = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      Alert.alert('بيانات غير صالحة', 'عنوان ونص الإشعار مطلوبان');
      return;
    }
    setActionId('notification');
    try {
      const response = await api.post('/admin/notifications/broadcast', {
        title: notificationTitle.trim(),
        body: notificationBody.trim(),
        ...(notificationRole ? { role: notificationRole } : {}),
      });
      setNotificationTitle('');
      setNotificationBody('');
      Alert.alert('تم بنجاح', `تم إرسال الإشعار إلى ${getPayload(response).sent || 0} مستخدم`);
    } catch (error) {
      Alert.alert('تعذر الإرسال', error.response?.data?.message || 'حدث خطأ أثناء إرسال الإشعار');
    } finally {
      setActionId(null);
    }
  };

  const saveProduct = async () => {
    if (!productForm?.name?.trim() || !productForm?.storeId || !productForm?.originalPrice) {
      Alert.alert('بيانات غير صالحة', 'اسم المنتج والمتجر والسعر الأصلي مطلوبة');
      return;
    }
    setActionId('product-save');
    try {
      const payload = {
        ...productForm,
        name: productForm.name.trim(),
        originalPrice: Number(productForm.originalPrice),
        discountValue: Number(productForm.discountValue || 0),
        storeId: Number(productForm.storeId),
        isDemo: productForm.isDemo === true,
      };

      const saveSubAdmin = async () => {
        if (!subAdminForm?.name?.trim() || !subAdminForm?.phone?.trim()) {
          Alert.alert('بيانات غير صالحة', 'اسم المشرف ورقم الهاتف مطلوبان');
          return;
        }
        if (!subAdminForm.id && (!subAdminForm.password || subAdminForm.password.length < 8)) {
          Alert.alert('بيانات غير صالحة', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
          return;
        }
        if (!subAdminForm.permissions?.length) {
          Alert.alert('بيانات غير صالحة', 'اختر صلاحية واحدة على الأقل');
          return;
        }

        setActionId('sub-admin-save');
        try {
          const payload = {
            name: subAdminForm.name.trim(),
            phone: subAdminForm.phone.trim(),
            email: subAdminForm.email?.trim() || '',
            permissions: subAdminForm.permissions,
            ...(subAdminForm.password ? { password: subAdminForm.password } : {}),
          };
          if (subAdminForm.id) {
            await api.patch(`/admin/sub-admins/${subAdminForm.id}`, payload);
          } else {
            await api.post('/admin/sub-admins', payload);
          }
          setSubAdminForm(null);
          Alert.alert('تم بنجاح', 'تم حفظ بيانات المشرف والصلاحيات');
          await loadSection('sub-admins');
        } catch (error) {
          Alert.alert('تعذر حفظ المشرف', error.response?.data?.message || 'حدث خطأ أثناء حفظ البيانات');
        } finally {
          setActionId(null);
        }
      };

      const toggleSubAdmin = async (item) => {
        setActionId(`sub-admin-toggle-${item.id}`);
        try {
          await api.patch(`/admin/sub-admins/${item.id}`, { isActive: item.isActive === false });
          Alert.alert('تم بنجاح', item.isActive === false ? 'تم تفعيل المشرف' : 'تم تعطيل المشرف');
          await loadSection('sub-admins');
        } catch (error) {
          Alert.alert('تعذر تحديث الحالة', error.response?.data?.message || 'حدث خطأ');
        } finally {
          setActionId(null);
        }
      };
      if (productForm.id) {
        await api.patch(`/admin/products/${productForm.id}`, payload);
      } else {
        await api.post('/admin/products', payload);
      }
      setProductForm(null);
      Alert.alert('تم بنجاح', 'تم حفظ المنتج');
      await loadSection('products');
    } catch (error) {
      Alert.alert('تعذر حفظ المنتج', error.response?.data?.message || 'حدث خطأ');
    } finally {
      setActionId(null);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = dashboard?.stats || dashboard || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDashboard} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>NOW</Text>
            <Text style={styles.title}>لوحة الإدارة</Text>
            <Text style={styles.subtitle}>مرحبًا {user?.name || 'مدير النظام'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>خروج</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0B8FA3" style={styles.loader} />
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sections}>
              {[
                ['dashboard', 'الرئيسية'],
                ['users', 'المستخدمون'],
                ['stores', 'المتاجر'],
                ['products', 'المنتجات'],
                ['orders', 'الطلبات'],
                ['delivery', 'التوصيل'],
                ['reports', 'التقارير'],
                ['sub-admins', 'المشرفون الفرعيون'],
                ['notifications', 'الإشعارات'],
              ].map(([name, label]) => (
                <TouchableOpacity
                  key={name}
                  style={[styles.sectionButton, section === name && styles.sectionButtonActive]}
                  onPress={() => loadSection(name)}
                >
                  <Text style={[styles.sectionButtonText, section === name && styles.sectionButtonTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {section === 'dashboard' ? (
              <>
                <View style={styles.grid}>
                  <Stat label="المستخدمون" value={stats.users} />
                  <Stat label="العملاء" value={stats.customers} />
                  <Stat label="البائعون" value={stats.vendors} />
                  <Stat label="المندوبون" value={stats.deliveries} />
                  <Stat label="الطلبات" value={stats.orders} />
                  <Stat label="قيد التنفيذ" value={stats.activeOrders} />
                  <Stat label="المكتملة" value={stats.completedOrders} />
                  <Stat label="المتاجر المفتوحة" value={stats.openStores} />
                  <Stat label="المنتجات" value={stats.products} />
                  <Stat label="الإيرادات" value={stats.sales} />
                </View>
                <TouchableOpacity style={styles.refreshButton} onPress={loadDashboard}>
                  <Text style={styles.refreshText}>تحديث البيانات</Text>
                </TouchableOpacity>
              </>
            ) : sectionLoading ? (
              <ActivityIndicator size="large" color="#0B8FA3" style={styles.loader} />
            ) : section === 'products' ? (
              <View>
                <TouchableOpacity style={styles.refreshButton} onPress={() => setProductForm({ name: '', description: '', storeId: '', categoryId: '', originalPrice: '', discountValue: '', discountType: 'PERCENTAGE', image: '', isAvailable: true, isDemo: false })}>
                  <Text style={styles.refreshText}>إضافة منتج</Text>
                </TouchableOpacity>
                {sectionData.map((item) => (
                  <View key={item.id} style={styles.row}>
                    <View style={styles.rowActions}>
                      <TouchableOpacity style={styles.smallButton} onPress={() => setProductForm({ ...item, storeId: item.storeId || item.store?.id, categoryId: item.categoryId || '' })}>
                        <Text style={styles.smallButtonText}>تعديل</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.resetButton} onPress={() => runAction(item, 'product-toggle')}>
                        <Text style={styles.resetButtonText}>{item.isAvailable === false ? 'تفعيل' : 'تعطيل'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View>
                      <Text style={styles.rowMeta}>{item.store?.name || `متجر #${item.storeId}`} {item.isDemo ? '• تجريبي' : ''}</Text>
                      <Text style={styles.rowTitle}>{item.name}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : section === 'sub-admins' ? (
              <View>
                <View style={styles.sectionHeading}>
                  <View>
                    <Text style={styles.sectionTitle}>إدارة المشرفين</Text>
                    <Text style={styles.sectionDescription}>أنشئ حسابات المشرفين وحدد صلاحياتهم بدقة</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryAction}
                    onPress={() => setSubAdminForm({ name: '', phone: '', email: '', password: '', permissions: [] })}
                  >
                    <Text style={styles.primaryActionText}>إضافة مشرف</Text>
                  </TouchableOpacity>
                </View>
                {sectionData.map((item) => (
                  <View key={item.id} style={styles.adminCard}>
                    <View style={styles.rowActions}>
                      <TouchableOpacity
                        style={styles.smallButton}
                        onPress={() => setSubAdminForm({
                          ...item,
                          password: '',
                          permissions: item.permissions || [],
                        })}
                      >
                        <Text style={styles.smallButtonText}>تعديل</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.resetButton}
                        onPress={() => toggleSubAdmin(item)}
                        disabled={Boolean(actionId)}
                      >
                        {actionId === `sub-admin-toggle-${item.id}` ? (
                          <ActivityIndicator size="small" color="#52606D" />
                        ) : (
                          <Text style={styles.resetButtonText}>{item.isActive === false ? 'تفعيل' : 'تعطيل'}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    <View style={styles.adminCardInfo}>
                      <Text style={styles.rowTitle}>{item.name}</Text>
                      <Text style={styles.rowMeta}>{item.phone}{item.email ? ` • ${item.email}` : ''}</Text>
                      <Text style={styles.permissionSummary}>
                        {item.isActive === false ? 'غير نشط' : 'نشط'} • {item.permissions?.length || 0} صلاحيات
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : section === 'notifications' ? (
              <View style={styles.notificationCard}>
                <Text style={styles.modalTitle}>إرسال إشعار حقيقي</Text>
                <TextInput
                  style={styles.filterInput}
                  value={notificationTitle}
                  onChangeText={setNotificationTitle}
                  placeholder="عنوان الإشعار"
                  textAlign="right"
                  maxLength={120}
                />
                <TextInput
                  style={[styles.filterInput, styles.notificationBody]}
                  value={notificationBody}
                  onChangeText={setNotificationBody}
                  placeholder="نص الإشعار"
                  textAlign="right"
                  multiline
                  maxLength={1000}
                />
                <View style={styles.filterRow}>
                  {[
                    ['', 'كل المستخدمين'],
                    ['customer', 'العملاء'],
                    ['vendor', 'البائعون'],
                    ['delivery', 'المندوبون'],
                  ].map(([value, label]) => (
                    <TouchableOpacity key={value || 'all-notification'} style={[styles.filterChip, notificationRole === value && styles.filterChipActive]} onPress={() => setNotificationRole(value)}>
                      <Text style={notificationRole === value ? styles.filterChipTextActive : styles.filterChipText}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.refreshButton} onPress={sendNotification} disabled={Boolean(actionId)}>
                  {actionId === 'notification' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.refreshText}>إرسال الإشعار</Text>}
                </TouchableOpacity>
              </View>
            ) : sectionData.length === 0 ? (
              <Text style={styles.empty}>لا توجد بيانات أو لا تملك الصلاحية</Text>
            ) : (
              <>
              {section === 'users' && (
                <View style={styles.filters}>
                  <TextInput style={styles.filterInput} value={userSearch} onChangeText={setUserSearch} placeholder="بحث بالاسم أو الهاتف أو ID" textAlign="right" />
                  <View style={styles.filterRow}>
                    {[
                      ['', 'كل الأدوار'],
                      ['customer', 'عملاء'],
                      ['vendor', 'بائعون'],
                      ['delivery', 'مندوبون'],
                      ['sub_admin', 'مشرفون'],
                    ].map(([value, label]) => (
                      <TouchableOpacity key={value || 'all'} style={[styles.filterChip, userRole === value && styles.filterChipActive]} onPress={() => setUserRole(value)}>
                        <Text style={userRole === value ? styles.filterChipTextActive : styles.filterChipText}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.filterRow}>
                    {[
                      ['', 'كل الحالات'],
                      ['true', 'نشط'],
                      ['false', 'غير نشط'],
                    ].map(([value, label]) => (
                      <TouchableOpacity key={value || 'all-status'} style={[styles.filterChip, userActive === value && styles.filterChipActive]} onPress={() => setUserActive(value)}>
                        <Text style={userActive === value ? styles.filterChipTextActive : styles.filterChipText}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.refreshButton} onPress={loadUsers}>
                    <Text style={styles.refreshText}>تطبيق البحث والفلاتر</Text>
                  </TouchableOpacity>
                </View>
              )}
              {sectionData.map((item) => (
                <View key={item.id} style={styles.row}>
                  <View style={styles.rowActions}>
                    {section === 'users' && (
                      <>
                        <TouchableOpacity
                          style={styles.smallButton}
                          disabled={Boolean(actionId)}
                          onPress={() => runAction(item, item.isActive === false ? 'activate' : 'suspend')}
                        >
                          {actionId === `${item.isActive === false ? 'activate' : 'suspend'}-${item.id}`
                            ? <ActivityIndicator color="#FFF" size="small" />
                            : <Text style={styles.smallButtonText}>{item.isActive === false ? 'تفعيل' : 'تعطيل'}</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.resetButton} onPress={() => setResetUser(item)}>
                          <Text style={styles.resetButtonText}>كلمة المرور</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {section === 'stores' && (
                      <>
                        <TouchableOpacity style={styles.smallButton} onPress={() => runAction(item, item.isOpen === false ? 'store-open' : 'store-close')}>
                          <Text style={styles.smallButtonText}>{item.isOpen === false ? 'فتح' : 'غلق'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.resetButton} onPress={() => runAction(item, item.isActive === false ? 'store-activate' : 'store-suspend')}>
                          <Text style={styles.resetButtonText}>{item.isActive === false ? 'تفعيل' : 'تعطيل'}</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                  <View>
                    <Text style={styles.rowMeta}>
                      {item.status || item.role?.name || (item.isActive === false ? 'غير نشط' : 'نشط')}
                    </Text>
                    <Text style={styles.rowTitle}>{item.name || `#${item.id}`}</Text>
                  </View>
                </View>
              ))}
              </>
            )}
          </>
        )}
      </ScrollView>
      {resetUser && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>تغيير كلمة مرور {resetUser.name}</Text>
            <TextInput
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="كلمة المرور الجديدة"
              secureTextEntry
              textAlign="right"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setResetUser(null)}>
                <Text>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={resetPassword} disabled={Boolean(actionId)}>
                {actionId === `reset-${resetUser.id}` ? <ActivityIndicator color="#FFF" /> : <Text style={styles.smallButtonText}>حفظ</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      {productForm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{productForm.id ? 'تعديل المنتج' : 'إضافة منتج'}</Text>
            {[
              ['name', 'اسم المنتج'],
              ['description', 'وصف المنتج'],
              ['storeId', 'رقم المتجر'],
              ['categoryId', 'رقم التصنيف (اختياري)'],
              ['originalPrice', 'السعر الأصلي'],
              ['discountValue', 'قيمة الخصم'],
              ['image', 'رابط الصورة'],
            ].map(([key, placeholder]) => (
              <TextInput
                key={key}
                style={styles.passwordInput}
                value={String(productForm[key] ?? '')}
                onChangeText={(value) => setProductForm((current) => ({ ...current, [key]: value }))}
                placeholder={placeholder}
                keyboardType={['storeId', 'originalPrice', 'discountValue'].includes(key) ? 'numeric' : 'default'}
                textAlign="right"
              />
            ))}
            <View style={styles.filterRow}>
              <TouchableOpacity style={[styles.filterChip, productForm.isDemo && styles.filterChipActive]} onPress={() => setProductForm((current) => ({ ...current, isDemo: !current.isDemo }))}>
                <Text style={productForm.isDemo ? styles.filterChipTextActive : styles.filterChipText}>منتج تجريبي</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setProductForm(null)}>
                <Text>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={saveProduct} disabled={Boolean(actionId)}>
                {actionId === 'product-save' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.smallButtonText}>حفظ</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      {subAdminForm && (
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{subAdminForm.id ? 'تعديل مشرف' : 'إضافة مشرف جديد'}</Text>
              {[
                ['name', 'اسم المشرف'],
                ['phone', 'رقم الهاتف'],
                ['email', 'البريد الإلكتروني (اختياري)'],
                ...(!subAdminForm.id ? [['password', 'كلمة المرور']] : []),
              ].map(([key, placeholder]) => (
                <TextInput
                  key={key}
                  style={styles.passwordInput}
                  value={String(subAdminForm[key] ?? '')}
                  onChangeText={(value) => setSubAdminForm((current) => ({ ...current, [key]: value }))}
                  placeholder={placeholder}
                  secureTextEntry={key === 'password'}
                  keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
                  textAlign="right"
                />
              ))}
              <Text style={styles.permissionTitle}>الصلاحيات المتاحة</Text>
              <View style={styles.permissionGrid}>
                {permissionOptions.map(([value, label]) => {
                  const selected = Array.isArray(subAdminForm.permissions)
                    && subAdminForm.permissions.includes(value);
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.permissionChip, selected && styles.permissionChipActive]}
                      onPress={() => setSubAdminForm((current) => ({
                        ...current,
                        permissions: selected
                          ? current.permissions.filter((permission) => permission !== value)
                          : [...(Array.isArray(current.permissions) ? current.permissions : []), value],
                      }))}
                    >
                      <Text style={selected ? styles.filterChipTextActive : styles.filterChipText}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setSubAdminForm(null)}>
                  <Text>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallButton} onPress={saveSubAdmin} disabled={Boolean(actionId)}>
                  {actionId === 'sub-admin-save' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.smallButtonText}>حفظ المشرف</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

const Stat = ({ label, value }) => (
  <View style={styles.card}>
    <Text style={styles.value}>{value ?? '—'}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { padding: 20 },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brand: { color: '#0B8FA3', fontSize: 16, fontWeight: '800', textAlign: 'right' },
  title: { color: '#102A43', fontSize: 28, fontWeight: '800', textAlign: 'right', marginTop: 4 },
  subtitle: { color: '#6B7C93', fontSize: 15, textAlign: 'right', marginTop: 6 },
  logoutButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FDE8EC' },
  logoutText: { color: '#D33B5D', fontWeight: '800' },
  loader: { marginTop: 48 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  card: { width: '48%', minHeight: 110, padding: 16, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  value: { color: '#0B8FA3', fontSize: 28, fontWeight: '800' },
  label: { color: '#52606D', marginTop: 8, fontWeight: '700' },
  refreshButton: { marginTop: 24, padding: 15, borderRadius: 12, backgroundColor: '#0B8FA3', alignItems: 'center' },
  refreshText: { color: '#FFF', fontWeight: '800' },
  sections: { flexDirection: 'row-reverse', gap: 8, paddingBottom: 16 },
  sectionButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#E8EEF3' },
  sectionButtonActive: { backgroundColor: '#0B8FA3' },
  sectionButtonText: { color: '#52606D', fontWeight: '700' },
  sectionButtonTextActive: { color: '#FFF' },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8 },
  rowTitle: { color: '#102A43', fontWeight: '800' },
  rowMeta: { color: '#6B7C93', fontSize: 12 },
  empty: { textAlign: 'center', color: '#6B7C93', marginTop: 24 },
  rowActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  smallButton: { backgroundColor: '#0B8FA3', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  smallButtonText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  resetButton: { backgroundColor: '#E8EEF3', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  resetButtonText: { color: '#52606D', fontWeight: '700', fontSize: 12 },
  modalOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#102A43', textAlign: 'right', marginBottom: 16 },
  passwordInput: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-start', gap: 10, marginTop: 16 },
  cancelButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: '#E8EEF3' },
  filters: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12 },
  filterInput: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10 },
  filterRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  filterChip: { borderRadius: 16, backgroundColor: '#E8EEF3', paddingHorizontal: 10, paddingVertical: 7 },
  filterChipActive: { backgroundColor: '#0B8FA3' },
  filterChipText: { color: '#52606D', fontSize: 12 },
  filterChipTextActive: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  notificationCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14 },
  notificationBody: { minHeight: 100, marginTop: 10, textAlignVertical: 'top' },
  sectionHeading: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: { color: '#102A43', fontSize: 18, fontWeight: '800', textAlign: 'right' },
  sectionDescription: { color: '#6B7C93', fontSize: 12, marginTop: 5, textAlign: 'right' },
  primaryAction: { backgroundColor: '#0B8FA3', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  primaryActionText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  adminCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  adminCardInfo: { flex: 1, alignItems: 'flex-end', marginLeft: 12 },
  permissionSummary: { color: '#0B8FA3', fontSize: 12, fontWeight: '700', marginTop: 5 },
  permissionTitle: { color: '#102A43', fontWeight: '800', textAlign: 'right', marginTop: 16, marginBottom: 8 },
  permissionGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  permissionChip: { borderRadius: 10, backgroundColor: '#E8EEF3', paddingHorizontal: 10, paddingVertical: 9 },
  permissionChipActive: { backgroundColor: '#0B8FA3' },
  modalScrollView: { flex: 1, width: '100%' },
  modalScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 20 },
});

export default AdminDashboardScreen;
