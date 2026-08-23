import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const PARTNER_OPTIONS = [
  {
    role: 'vendor',
    icon: 'storefront-outline',
    iconBg: '#FCE7F3',
    iconColor: COLORS.primary || '#EC4899',
    title: 'بائع',
    subtitle: 'افتح متجرك وابدأ بيع خدماتك ومنتجاتك',
    badge: '🏪',
  },
  {
    role: 'delivery',
    icon: 'bicycle-outline',
    iconBg: '#DCFCE7',
    iconColor: '#16A34A',
    title: 'مندوب توصيل',
    subtitle: 'وصّل الطلبات واكسب دخلاً إضافياً بمرونة',
    badge: '🛵',
  },
];

const PartnerJoinScreen = ({ navigation }) => {
  const handleSelect = (role) => {
    navigation.navigate('Register', { initialRole: role });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Back */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={26} color={COLORS.textPrimary} />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerIcon}>
          <Ionicons name="people-outline" size={44} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>انضم كشريك معنا</Text>
        <Text style={styles.subtitle}>
          اختر نوع الشراكة التي تناسبك وانطلق
        </Text>
      </View>

      {/* Partner Cards */}
      <View style={styles.cardsContainer}>
        {PARTNER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.role}
            style={styles.card}
            onPress={() => handleSelect(option.role)}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIcon, { backgroundColor: option.iconBg }]}>
              <Text style={styles.cardEmoji}>{option.badge}</Text>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
            </View>

            <View style={styles.cardArrow}>
              <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Benefits */}
      <View style={styles.benefitsCard}>
        <Text style={styles.benefitsTitle}>لماذا تنضم إلينا؟</Text>
        {[
          { icon: 'rocket-outline', text: 'انطلق في دقائق بدون رسوم مسبقة' },
          { icon: 'people-circle-outline', text: 'آلاف العملاء ينتظرون خدماتك' },
          { icon: 'stats-chart-outline', text: 'تتبع أرباحك وإحصاءاتك لحظياً' },
          { icon: 'headset-outline', text: 'دعم فني على مدار الساعة' },
        ].map((item, index) => (
          <View key={index} style={styles.benefitRow}>
            <Ionicons name={item.icon} size={18} color={COLORS.primary} />
            <Text style={styles.benefitText}>{item.text}</Text>
          </View>
        ))}
      </View>

      {/* Existing Account Login */}
      <TouchableOpacity
        style={styles.loginLink}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.loginLinkText}>
          عندك حساب شريك بالفعل؟{' '}
          <Text style={styles.loginHighlight}>سجل دخول</Text>
        </Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  backBtn: {
    marginTop: 54,
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  headerSection: {
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 28,
  },

  headerIcon: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  cardsContainer: {
    gap: 14,
    marginBottom: 20,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },

  cardIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardEmoji: {
    fontSize: 32,
  },

  cardBody: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 4,
  },

  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    lineHeight: 18,
  },

  cardArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },

  benefitsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 20,
    gap: 12,
  },

  benefitsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 4,
  },

  benefitRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },

  benefitText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },

  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },

  loginLinkText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  loginHighlight: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});

export default PartnerJoinScreen;
