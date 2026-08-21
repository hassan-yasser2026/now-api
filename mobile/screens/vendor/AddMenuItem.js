import React, { useCallback, useMemo, useState } from 'react';

import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';
import { storeService } from '../../services/storeService';
import PrimaryButton from '../../components/PrimaryButton';

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 500;
const MIN_PRICE = 0.01;
const MAX_PRICE = 1000000;

const AddMenuItem = ({ navigation, route }) => {
  const { user } = useAppStore();
  const item = route?.params?.item || null;
  const isEditMode = Boolean(item || route?.params?.mode === 'edit');
  const storeId = route?.params?.storeId || user?.storeId || user?.store?.id || user?.id;

  const [name, setName] = useState(item?.name || '');
  const [price, setPrice] = useState(item?.price ? String(item.price) : '');
  const [description, setDescription] = useState(item?.description || '');
  const [imageUrl, setImageUrl] = useState(item?.image || item?.img || '');

  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  /*
   * ==========================================
   * القيم المنظفة
   * ==========================================
   */

  const trimmedName = useMemo(
    () => name.trim().replace(/\s+/g, ' '),
    [name]
  );

  const trimmedDescription = useMemo(
    () => description.trim(),
    [description]
  );

  /*
   * ==========================================
   * السعر
   * ==========================================
   */

  const normalizedPrice = useMemo(() => {
    const normalized = price
      .replace(',', '.')
      .replace(/[^0-9.]/g, '');

    const parts = normalized.split('.');

    if (parts.length > 2) {
      return `${parts[0]}.${parts.slice(1).join('')}`;
    }

    return normalized;
  }, [price]);

  const numericPrice = Number(normalizedPrice);

  /*
   * ==========================================
   * التحقق من البيانات
   * ==========================================
   */

  const validateForm = useCallback(() => {
    if (!user?.id) {
      return 'يجب تسجيل الدخول أولاً';
    }

    if (!trimmedName) {
      return 'يرجى إدخال اسم الصنف';
    }

    if (trimmedName.length < 2) {
      return 'اسم الصنف يجب أن يكون حرفين على الأقل';
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      return `اسم الصنف يجب ألا يتجاوز ${MAX_NAME_LENGTH} حرف`;
    }

    if (!normalizedPrice) {
      return 'يرجى إدخال سعر الصنف';
    }

    if (!Number.isFinite(numericPrice)) {
      return 'السعر غير صحيح';
    }

    if (numericPrice < MIN_PRICE) {
      return 'السعر يجب أن يكون أكبر من صفر';
    }

    if (numericPrice > MAX_PRICE) {
      return 'السعر المدخل كبير جدًا';
    }

    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      return `الوصف يجب ألا يتجاوز ${MAX_DESCRIPTION_LENGTH} حرف`;
    }

    return null;
  }, [
    user?.id,
    trimmedName,
    normalizedPrice,
    numericPrice,
    trimmedDescription,
  ]);

  /*
   * ==========================================
   * إضافة الصنف
   * ==========================================
   */

  const handleSubmit = useCallback(async () => {
    if (loading) return;

    Keyboard.dismiss();

    const validationError = validateForm();

    if (validationError) {
      Alert.alert('تنبيه', validationError);
      return;
    }

    const itemData = {
      name: trimmedName,
      price: Number(numericPrice.toFixed(2)),
      description: trimmedDescription,
      image: imageUrl.trim() || item?.image || item?.img || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
      isAvailable: item?.isAvailable !== false,
    };

    try {
      setLoading(true);

      const result = isEditMode
        ? await storeService.updateMenuItem(storeId, item?.id, itemData)
        : await storeService.addMenuItem(storeId, itemData);

      if (result?.success) {
        Alert.alert(
          'تم بنجاح 🎉',
          isEditMode ? 'تم تحديث الصنف بنجاح' : 'تمت إضافة الصنف إلى المنيو بنجاح',
          [
            {
              text: 'حسنًا',
              onPress: () => navigation.goBack(),
            },
          ],
          {
            cancelable: false,
          }
        );

        return;
      }

      Alert.alert(
        isEditMode ? 'تعذر تحديث الصنف' : 'تعذر إضافة الصنف',
        result?.message || 'حدث خطأ أثناء حفظ الصنف'
      );
    } catch (error) {
      console.error(
        'ADD MENU ITEM ERROR:',
        error?.response?.data || error?.message || error
      );

      Alert.alert(
        'خطأ',
        error?.response?.data?.message ||
          'تعذر الاتصال بالسيرفر، حاول مرة أخرى'
      );
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    validateForm,
    trimmedName,
    numericPrice,
    trimmedDescription,
    imageUrl,
    item,
    isEditMode,
    storeId,
    user?.id,
    navigation,
  ]);

  /*
   * ==========================================
   * الرجوع
   * ==========================================
   */

  const handleBack = useCallback(() => {
    if (loading) return;

    Keyboard.dismiss();
    navigation.goBack();
  }, [loading, navigation]);

  /*
   * ==========================================
   * هل يوجد تغييرات؟
   * ==========================================
   */

  const hasChanges = Boolean(
    name.trim() ||
      price.trim() ||
      description.trim() ||
      imageUrl.trim()
  );

  const handleSafeBack = useCallback(() => {
    if (loading) return;

    if (!hasChanges) {
      handleBack();
      return;
    }

    Alert.alert(
      'مغادرة الصفحة',
      'لديك بيانات لم يتم حفظها. هل تريد المغادرة؟',
      [
        {
          text: 'البقاء',
          style: 'cancel',
        },
        {
          text: 'مغادرة',
          style: 'destructive',
          onPress: handleBack,
        },
      ]
    );
  }, [loading, hasChanges, handleBack]);

  /*
   * ==========================================
   * تغيير الاسم
   * ==========================================
   */

  const handleNameChange = useCallback((value) => {
    if (value.length <= MAX_NAME_LENGTH) {
      setName(value);
    }
  }, []);

  /*
   * ==========================================
   * تغيير السعر
   * ==========================================
   */

  const handlePriceChange = useCallback((value) => {
    let cleanValue = value
      .replace(',', '.')
      .replace(/[^0-9.]/g, '');

    const firstDotIndex = cleanValue.indexOf('.');

    if (firstDotIndex !== -1) {
      cleanValue =
        cleanValue.slice(0, firstDotIndex + 1) +
        cleanValue
          .slice(firstDotIndex + 1)
          .replace(/\./g, '');
    }

    if (cleanValue.includes('.')) {
      const [integerPart, decimalPart] =
        cleanValue.split('.');

      cleanValue =
        `${integerPart}.${decimalPart.slice(0, 2)}`;
    }

    setPrice(cleanValue);
  }, []);

  /*
   * ==========================================
   * تغيير الوصف
   * ==========================================
   */

  const handleDescriptionChange = useCallback(
    (value) => {
      if (value.length <= MAX_DESCRIPTION_LENGTH) {
        setDescription(value);
      }
    },
    []
  );

  const imageSource = imageUrl.trim() || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View style={styles.container}>

          {/* ======================================
              HEADER
          ====================================== */}

          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleSafeBack}
              disabled={loading}
              style={[
                styles.headerButton,
                loading && styles.disabledButton,
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>
                {isEditMode ? 'تعديل الصنف' : 'إضافة صنف جديد'}
              </Text>

              <Text style={styles.headerSubtitle}>
                {isEditMode ? 'حدّث بيانات المنتج الحالي' : 'أضف منتجًا جديدًا إلى المنيو'}
              </Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          {/* ======================================
              CONTENT
          ====================================== */}

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* صورة الصنف */}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                صورة الصنف
              </Text>

              <View style={styles.imagePreviewWrapper}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.imagePlaceholder}
                  onPress={() =>
                    Alert.alert(
                      'رابط الصورة',
                      'أدخل رابط صورة مباشر من الإنترنت، أو اتركه فارغًا لاستخدام صورة افتراضية.'
                    )
                  }
                >
                  {imageSource ? (
                    <Image source={{ uri: imageSource }} style={styles.previewImage} resizeMode="cover" />
                  ) : (
                    <>
                      <View style={styles.imageIconContainer}>
                        <Ionicons
                          name="camera-outline"
                          size={30}
                          color={COLORS.primary}
                        />
                      </View>

                      <Text style={styles.imageTitle}>
                        إضافة صورة
                      </Text>

                      <Text style={styles.imageSubtitle}>
                        اختياري
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={[styles.inputContainer, { marginTop: 12 }]}>
                  <Ionicons name="link-outline" size={20} color={COLORS.primary} />
                  <TextInput
                    style={styles.input}
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    placeholder="رابط صورة المنتج"
                    placeholderTextColor={COLORS.textLight}
                    textAlign="right"
                    editable={!loading}
                  />
                </View>
              </View>
            </View>

            {/* اسم الصنف */}

            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  اسم الصنف
                </Text>

                <Text style={styles.required}>
                  مطلوب *
                </Text>
              </View>

              <View
                style={[
                  styles.inputContainer,
                  focusedInput === 'name' &&
                    styles.inputContainerFocused,
                ]}
              >
                <Ionicons
                  name="restaurant-outline"
                  size={21}
                  color={
                    focusedInput === 'name'
                      ? COLORS.primary
                      : COLORS.textSecondary
                  }
                />

                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={handleNameChange}
                  placeholder="مثال: بيتزا مارجريتا"
                  placeholderTextColor={COLORS.textLight}
                  textAlign="right"
                  maxLength={MAX_NAME_LENGTH}
                  returnKeyType="next"
                  editable={!loading}
                  onFocus={() =>
                    setFocusedInput('name')
                  }
                  onBlur={() =>
                    setFocusedInput(null)
                  }
                />
              </View>

              <Text style={styles.counter}>
                {name.length}/{MAX_NAME_LENGTH}
              </Text>
            </View>

            {/* السعر */}

            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  السعر
                </Text>

                <Text style={styles.required}>
                  مطلوب *
                </Text>
              </View>

              <View
                style={[
                  styles.inputContainer,
                  focusedInput === 'price' &&
                    styles.inputContainerFocused,
                ]}
              >
                <Ionicons
                  name="cash-outline"
                  size={21}
                  color={
                    focusedInput === 'price'
                      ? COLORS.primary
                      : COLORS.textSecondary
                  }
                />

                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={handlePriceChange}
                  placeholder="مثال: 120.00"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType={
                    Platform.OS === 'ios'
                      ? 'decimal-pad'
                      : 'numeric'
                  }
                  textAlign="right"
                  returnKeyType="next"
                  editable={!loading}
                  onFocus={() =>
                    setFocusedInput('price')
                  }
                  onBlur={() =>
                    setFocusedInput(null)
                  }
                />

                <Text style={styles.currency}>
                  ج.م
                </Text>
              </View>
            </View>

            {/* الوصف */}

            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  وصف الصنف
                </Text>

                <Text style={styles.optional}>
                  اختياري
                </Text>
              </View>

              <View
                style={[
                  styles.textAreaContainer,
                  focusedInput === 'description' &&
                    styles.inputContainerFocused,
                ]}
              >
                <TextInput
                  style={styles.textArea}
                  value={description}
                  onChangeText={
                    handleDescriptionChange
                  }
                  placeholder="اكتب وصفًا مختصرًا للصنف والمكونات..."
                  placeholderTextColor={COLORS.textLight}
                  multiline
                  numberOfLines={5}
                  maxLength={
                    MAX_DESCRIPTION_LENGTH
                  }
                  textAlign="right"
                  textAlignVertical="top"
                  editable={!loading}
                  onFocus={() =>
                    setFocusedInput('description')
                  }
                  onBlur={() =>
                    setFocusedInput(null)
                  }
                />

                <Text style={styles.descriptionCounter}>
                  {description.length}/
                  {MAX_DESCRIPTION_LENGTH}
                </Text>
              </View>
            </View>

            {/* حالة الصنف */}

            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={23}
                  color={COLORS.success}
                />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>
                  الصنف سيكون متاحًا مباشرة
                </Text>

                <Text style={styles.infoText}>
                  سيتم إنشاء الصنف بحالة "متاح"، ويمكنك
                  تغيير حالته لاحقًا من إدارة المنيو.
                </Text>
              </View>
            </View>

            {/* زر الإضافة */}

            <View style={styles.submitContainer}>
              <PrimaryButton
                title={
                  loading
                    ? (isEditMode ? 'جاري تحديث الصنف...' : 'جاري إضافة الصنف...')
                    : (isEditMode ? 'تحديث الصنف' : 'إضافة الصنف')
                }
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
              />
            </View>

            <Pressable
              onPress={handleSafeBack}
              disabled={loading}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>
                إلغاء
              </Text>
            </Pressable>

            <View style={styles.bottomSpace} />

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ==================================================
   STYLES
================================================== */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardContainer: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor:
      COLORS.white || '#FFFFFF',
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      COLORS.surface || '#F8FAFC',
  },

  disabledButton: {
    opacity: 0.4,
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  headerSpacer: {
    width: 42,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    padding: 16,
  },

  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 10,
  },

  labelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  label: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  required: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.error,
  },

  optional: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  imagePlaceholder: {
    minHeight: 180,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    backgroundColor:
      COLORS.surface || '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  imageIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  imageTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  imageSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  imagePreviewWrapper: {
    gap: 12,
  },

  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 20,
  },

  inputContainer: {
    minHeight: 54,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor:
      COLORS.surface || '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },

  inputContainerFocused: {
    borderColor: COLORS.primary,
    backgroundColor:
      COLORS.white || '#FFFFFF',
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },

  currency: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginLeft: 5,
  },

  counter: {
    marginTop: 5,
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: 'left',
  },

  textAreaContainer: {
    minHeight: 145,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor:
      COLORS.surface || '#FFFFFF',
    paddingHorizontal: 14,
  },

  textArea: {
    flex: 1,
    minHeight: 115,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 14,
    lineHeight: 23,
  },

  descriptionCounter: {
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: 'left',
    paddingBottom: 8,
  },

  infoCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 20,
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#166534',
    textAlign: 'right',
  },

  infoText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 18,
    color: '#15803D',
    textAlign: 'right',
  },

  submitContainer: {
    marginTop: 4,
  },

  submitButton: {
    minHeight: 52,
  },

  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },

  cancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },

  bottomSpace: {
    height: 30,
  },
});

export default AddMenuItem;