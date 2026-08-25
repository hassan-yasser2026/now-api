import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors'
 import  adminService  from '../../services/adminService';

// ========== Types ==========
type Permission = {
  key: string;
  label: string;
};

type PermissionGroup = {
  title: string;
  permissions: Permission[];
};

type SubAdminData = {
  id?: string | number;
  name: string;
  phone: string;
  email?: string;
  role: 'sub_admin';
  permissions: string[];
};

// ========== Permission Config ==========
const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: 'إدارة الطلبات',
    permissions: [
      { key: 'orders.read', label: 'عرض الطلبات' },
      { key: 'orders.update', label: 'تعديل الطلبات' },
      { key: 'orders.cancel', label: 'إلغاء الطلبات' },
    ],
  },
  {
    title: 'إدارة المتاجر',
    permissions: [
      { key: 'stores.read', label: 'عرض المتاجر' },
      { key: 'stores.update', label: 'تعديل المتاجر' },
      { key: 'stores.suspend', label: 'تعليق المتاجر' },
    ],
  },
  {
    title: 'إدارة المستخدمين',
    permissions: [
      { key: 'users.read', label: 'عرض المستخدمين' },
      { key: 'users.update', label: 'تعديل المستخدمين' },
      { key: 'users.suspend', label: 'تعليق المستخدمين' },
    ],
  },
  {
    title: 'إدارة المندوبين',
    permissions: [
      { key: 'delivery.read', label: 'عرض المندوبين' },
      { key: 'delivery.update', label: 'تعديل المندوبين' },
      { key: 'delivery.suspend', label: 'تعليق المندوبين' },
    ],
  },
  {
    title: 'التقارير',
    permissions: [
      { key: 'reports.read', label: 'عرض التقارير' },
    ],
  },
  {
    title: 'الإعدادات',
    permissions: [
      { key: 'settings.read', label: 'عرض الإعدادات' },
      { key: 'settings.update', label: 'تعديل الإعدادات' },
    ],
  },
];

// ========== Component ==========
const SubAdminPermissions: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  // لو تم تمرير subAdminId أو بيانات subAdmin، نكون في وضع تعديل
  const editingSubAdmin: SubAdminData | undefined = route.params?.subAdmin;
  const subAdminId: string | undefined = route.params?.subAdminId;

  const [name, setName] = useState<string>(editingSubAdmin?.name || '');
  const [phone, setPhone] = useState<string>(editingSubAdmin?.phone || '');
  const [email, setEmail] = useState<string>(editingSubAdmin?.email || '');
  const [password, setPassword] = useState<string>('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    () => new Set(editingSubAdmin?.permissions || [])
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubAdminData = useCallback(async () => {
    if (subAdminId && !editingSubAdmin) {
      setLoading(true);
      setError(null);
      try {
        // يمكن هنا استدعاء adminService.getSubAdminById إذا وجدت
        // لكننا نعتمد على البيانات الواردة للتوضيح
      } catch (err: any) {
        setError(err?.message || 'فشل جلب بيانات المدير');
      } finally {
        setLoading(false);
      }
    }
  }, [subAdminId, editingSubAdmin]);

  useEffect(() => {
    loadSubAdminData();
  }, [loadSubAdminData]);

  const togglePermission = (permissionKey: string) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permissionKey)) {
        newSet.delete(permissionKey);
      } else {
        newSet.add(permissionKey);
      }
      return newSet;
    });
  };

  const toggleGroup = (group: PermissionGroup) => {
    const allSelected = group.permissions.every((p) =>
      selectedPermissions.has(p.key)
    );
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        group.permissions.forEach((p) => newSet.delete(p.key));
      } else {
        group.permissions.forEach((p) => newSet.add(p.key));
      }
      return newSet;
    });
  };

  const validate = (): boolean => {
    if (!name.trim()) {
      Alert.alert('خطأ', 'اسم المدير مطلوب');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('خطأ', 'رقم الهاتف مطلوب');
      return false;
    }
    if (!subAdminId && !editingSubAdmin?.id && password.length < 8) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return false;
    }
    if (password && password.length < 8) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return false;
    }
    if (selectedPermissions.size === 0) {
      Alert.alert('خطأ', 'يجب اختيار صلاحية واحدة على الأقل');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        role: 'sub_admin' as const,
        permissions: Array.from(selectedPermissions),
        ...(password && { password }),
      };

      let result;
      if (subAdminId || editingSubAdmin?.id) {
        const id = subAdminId || editingSubAdmin?.id;
        result = await adminService.updateSubAdmin(id!, payload);
      } else {
        result = await adminService.createSubAdmin(payload);
      }

      if (result.success) {
        Alert.alert('نجاح', 'تم حفظ الصلاحيات بنجاح', [
          { text: 'حسناً', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('خطأ', result.message || 'فشل حفظ الصلاحيات');
      }
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل حفظ الصلاحيات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {subAdminId || editingSubAdmin?.id ? 'تعديل مدير فرعي' : 'إنشاء مدير فرعي'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* الاسم */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>الاسم</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color={COLORS.secondaryText} />
            <TextInput
              style={styles.input}
              placeholder="اسم المدير"
              placeholderTextColor={COLORS.textLight}
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        {/* الهاتف */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>رقم الهاتف</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={20} color={COLORS.secondaryText} />
            <TextInput
              style={styles.input}
              placeholder="01xxxxxxxxx"
              placeholderTextColor={COLORS.textLight}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* البريد الإلكتروني (اختياري) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>البريد الإلكتروني (اختياري)</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={COLORS.secondaryText} />
            <TextInput
              style={styles.input}
              placeholder="example@now.com"
              placeholderTextColor={COLORS.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            {subAdminId || editingSubAdmin?.id ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.secondaryText} />
            <TextInput
              style={styles.input}
              placeholder="8 أحرف على الأقل"
              placeholderTextColor={COLORS.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        {/* الصلاحيات */}
        <Text style={styles.sectionTitle}>الصلاحيات</Text>

        {PERMISSION_GROUPS.map((group) => {
          const allSelected = group.permissions.every((p) =>
            selectedPermissions.has(p.key)
          );
          return (
            <View key={group.title} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <TouchableOpacity onPress={() => toggleGroup(group)}>
                  <Text style={styles.groupToggleText}>
                    {allSelected ? 'إلغاء الكل' : 'تحديد الكل'}
                  </Text>
                </TouchableOpacity>
              </View>
              {group.permissions.map((permission) => (
                <View key={permission.key} style={styles.permissionRow}>
                  <Text style={styles.permissionLabel}>{permission.label}</Text>
                  <Switch
                    value={selectedPermissions.has(permission.key)}
                    onValueChange={() => togglePermission(permission.key)}
                    trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
                    thumbColor={selectedPermissions.has(permission.key) ? COLORS.primary : '#f4f3f4'}
                  />
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* زر الحفظ */}
      <View style={styles.saveContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveText}>حفظ الصلاحيات</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ========== Styles ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 12,
  },
  groupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  groupToggleText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  permissionLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  saveContainer: {
    paddingVertical: 12,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SubAdminPermissions;