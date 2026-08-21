import React from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS } from '../../constants/colors';
import { CONFIG } from '../../constants/config';

const AboutScreen = ({ navigation }) => {
  const features = [
    {
      icon: 'storefront-outline',
      title: 'تصفح المتاجر',
      description: 'استعرض المتاجر والأصناف المتاحة بسهولة.',
    },
    {
      icon: 'cart-outline',
      title: 'طلب المنتجات',
      description: 'أضف المنتجات إلى السلة وأنشئ طلبك بسهولة.',
    },
    {
      icon: 'calendar-outline',
      title: 'جدولة التوصيل',
      description: 'اختر اليوم والوقت المناسبين لاستلام طلبك.',
    },
    {
      icon: 'bicycle-outline',
      title: 'إدارة التوصيل',
      description: 'نظام مخصص للمندوبين لإدارة الطلبات.',
    },
    {
      icon: 'receipt-outline',
      title: 'متابعة الطلب',
      description: 'تابع حالة طلبك من الإنشاء حتى التسليم.',
    },
  ];

  const upcomingFeatures = [
    {
      icon: 'chatbubble-ellipses-outline',
      title: 'المساعد الذكي',
      description: 'دعم ذكي لمساعدة العملاء والإجابة عن الاستفسارات.',
    },
    {
      icon: 'card-outline',
      title: 'الدفع الإلكتروني',
      description: 'دعم وسائل دفع إلكترونية متعددة.',
    },
    {
      icon: 'analytics-outline',
      title: 'الإحصائيات',
      description: 'تقارير وإحصائيات متقدمة لأصحاب المتاجر والإدارة.',
    },
    {
      icon: 'location-outline',
      title: 'التتبع المباشر',
      description: 'متابعة موقع المندوب والطلب بشكل مباشر.',
    },
    {
      icon: 'notifications-outline',
      title: 'الإشعارات',
      description: 'تنبيهات فورية لحالة الطلب والتحديثات المهمة.',
    },
  ];

  const openUrl = async (url, errorMessage) => {
    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert('تنبيه', errorMessage);
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('خطأ', errorMessage);
    }
  };

  const handleEmail = () => {
    openUrl(
      `mailto:${CONFIG.SUPPORT_EMAIL}`,
      'لا يمكن فتح تطبيق البريد الإلكتروني على هذا الجهاز.'
    );
  };

  const handlePhone = () => {
    openUrl(
      `tel:${CONFIG.SUPPORT_PHONE}`,
      'لا يمكن إجراء المكالمة من هذا الجهاز.'
    );
  };

  const handleWhatsApp = () => {
    const phone = String(CONFIG.SUPPORT_PHONE || '')
      .replace(/\+/g, '')
      .replace(/\s/g, '');

    const whatsappUrl = `https://wa.me/${phone}`;

    openUrl(
      whatsappUrl,
      'لا يمكن فتح واتساب على هذا الجهاز.'
    );
  };

  const renderFeature = (item, index) => (
    <View key={`${item.title}-${index}`} style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Ionicons
          name={item.icon}
          size={22}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.featureInfo}>
        <Text style={styles.featureTitle}>{item.title}</Text>
        <Text style={styles.featureDescription}>
          {item.description}
        </Text>
      </View>

      <Ionicons
        name="checkmark-circle"
        size={22}
        color={COLORS.success}
      />
    </View>
  );

  const renderUpcomingFeature = (item, index) => (
    <View key={`${item.title}-${index}`} style={styles.upcomingRow}>
      <View style={styles.upcomingIcon}>
        <Ionicons
          name={item.icon}
          size={21}
          color={COLORS.secondary}
        />
      </View>

      <View style={styles.featureInfo}>
        <Text style={styles.featureTitle}>{item.title}</Text>
        <Text style={styles.featureDescription}>
          {item.description}
        </Text>
      </View>

      <View style={styles.soonBadge}>
        <Text style={styles.soonText}>قريبًا</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>حول التطبيق</Text>
          <Text style={styles.headerSubtitle}>
            كل ما تريد معرفته عن ناو
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* App Identity */}
        <View style={styles.appIdentity}>
          <View style={styles.logoWrapper}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.logo}
            >
              <Ionicons
                name="bicycle"
                size={42}
                color="#FFFFFF"
              />
            </LinearGradient>
          </View>

          <Text style={styles.appName}>
            {CONFIG.APP_NAME}
          </Text>

          <Text style={styles.appDescription}>
            منصة ذكية لطلب وتوصيل المنتجات
          </Text>

          <View style={styles.versionBadge}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={COLORS.primary}
            />

            <Text style={styles.versionText}>
              الإصدار {CONFIG.APP_VERSION}
            </Text>
          </View>
        </View>

        {/* Vision */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons
                name="rocket-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.cardTitle}>
              رؤيتنا
            </Text>
          </View>

          <Text style={styles.cardText}>
            ناو هو تطبيق متعدد الأطراف يربط بين العميل
            والبائع والمندوب في منصة واحدة، بهدف جعل تجربة
            الطلب والتوصيل أسهل وأسرع وأكثر تنظيمًا.
          </Text>
        </View>

        {/* Current Features */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons
                name="checkmark-done-outline"
                size={22}
                color={COLORS.success}
              />
            </View>

            <Text style={styles.cardTitle}>
              الميزات الحالية
            </Text>
          </View>

          <View style={styles.featureList}>
            {features.map(renderFeature)}
          </View>
        </View>

        {/* Upcoming Features */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIconSecondary}>
              <Ionicons
                name="sparkles-outline"
                size={22}
                color={COLORS.secondary}
              />
            </View>

            <View style={styles.titleWithBadge}>
              <Text style={styles.cardTitle}>
                الميزات القادمة
              </Text>

              <View style={styles.v2Badge}>
                <Text style={styles.v2Text}>
                  V2.0
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.featureList}>
            {upcomingFeatures.map(renderUpcomingFeature)}
          </View>
        </View>

        {/* Support */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons
                name="headset-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.cardTitle}>
              خدمة العملاء
            </Text>
          </View>

          <Text style={styles.cardText}>
            لو عندك استفسار أو مشكلة، تقدر تتواصل مع فريق
            الدعم من خلال إحدى الطرق التالية:
          </Text>

          {/* WhatsApp */}
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleWhatsApp}
            activeOpacity={0.8}
          >
            <View style={styles.contactIconWhatsApp}>
              <Ionicons
                name="logo-whatsapp"
                size={23}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>
                واتساب
              </Text>

              <Text style={styles.contactValue}>
                تواصل معنا مباشرة
              </Text>
            </View>

            <Ionicons
              name="chevron-back"
              size={20}
              color={COLORS.textLight}
            />
          </TouchableOpacity>

          {/* Email */}
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleEmail}
            activeOpacity={0.8}
          >
            <View style={styles.contactIcon}>
              <Ionicons
                name="mail-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>
                البريد الإلكتروني
              </Text>

              <Text style={styles.contactValue}>
                {CONFIG.SUPPORT_EMAIL}
              </Text>
            </View>

            <Ionicons
              name="chevron-back"
              size={20}
              color={COLORS.textLight}
            />
          </TouchableOpacity>

          {/* Phone */}
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handlePhone}
            activeOpacity={0.8}
          >
            <View style={styles.contactIcon}>
              <Ionicons
                name="call-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>
                الهاتف
              </Text>

              <Text style={styles.contactValue}>
                {CONFIG.SUPPORT_PHONE}
              </Text>
            </View>

            <Ionicons
              name="chevron-back"
              size={20}
              color={COLORS.textLight}
            />
          </TouchableOpacity>
        </View>

        {/* Security / Reliability */}
        <View style={styles.securityCard}>
          <View style={styles.securityIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={28}
              color={COLORS.success}
            />
          </View>

          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>
              تجربة آمنة وموثوقة
            </Text>

            <Text style={styles.securityText}>
              نعمل على تطوير ناو باستمرار لتحسين الأمان
              وسرعة الاستخدام وجودة تجربة العملاء.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerAppName}>
            {CONFIG.APP_NAME}
          </Text>

          <Text style={styles.footerText}>
            تطبيق توصيل مصمم لتسهيل حياتك
          </Text>

          <Text style={styles.footerCopyright}>
            © 2026 {CONFIG.APP_NAME} - جميع الحقوق محفوظة
          </Text>

          <Text style={styles.footerVersion}>
            Version {CONFIG.APP_VERSION}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 45,
  },

  header: {
    minHeight: 125,
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },

  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 4,
  },

  headerSpacer: {
    width: 44,
  },

  appIdentity: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 26,
  },

  logoWrapper: {
    marginBottom: 12,
  },

  logo: {
    width: 82,
    height: 82,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },

  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primary,
  },

  appDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },

  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
  },

  versionText: {
    marginLeft: 6,
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  cardHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    marginRight: 10,
  },

  cardHeaderIconSecondary: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondaryLight,
    marginRight: 10,
  },

  cardTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  titleWithBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  v2Badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.secondaryLight,
    marginLeft: 8,
  },

  v2Text: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '800',
  },

  cardText: {
    fontSize: 15,
    lineHeight: 25,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },

  featureList: {
    gap: 12,
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    marginRight: 10,
  },

  upcomingIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondaryLight,
    marginRight: 10,
  },

  featureInfo: {
    flex: 1,
  },

  featureTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },

  featureDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginTop: 3,
    textAlign: 'right',
  },

  soonBadge: {
    backgroundColor: COLORS.warning + '18',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 8,
  },

  soonText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '800',
  },

  contactButton: {
    minHeight: 70,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    marginTop: 10,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    marginRight: 11,
  },

  contactIconWhatsApp: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    marginRight: 11,
  },

  contactInfo: {
    flex: 1,
  },

  contactTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },

  contactValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
    textAlign: 'right',
  },

  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '10',
    borderWidth: 1,
    borderColor: COLORS.success + '30',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },

  securityIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success + '18',
    marginRight: 12,
  },

  securityInfo: {
    flex: 1,
  },

  securityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },

  securityText: {
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },

  footer: {
    alignItems: 'center',
    paddingTop: 10,
  },

  footerAppName: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
  },

  footerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  footerCopyright: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 12,
    textAlign: 'center',
  },

  footerVersion: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
});

export default AboutScreen;