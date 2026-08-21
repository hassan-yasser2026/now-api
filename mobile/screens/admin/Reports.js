import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const Reports = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const reportCards = [
    { label: 'إجمالي الطلبات', value: '324', change: '+12%', icon: 'bag-outline', color: COLORS.primary },
    { label: 'الإيرادات', value: '48,750 ج.م', change: '+8%', icon: 'cash-outline', color: COLORS.success },
    { label: 'المستخدمين الجدد', value: '28', change: '+15%', icon: 'people-outline', color: COLORS.secondary },
    { label: 'متوسط التقييم', value: '4.6 ★', change: '+0.2', icon: 'star-outline', color: COLORS.warning },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>التقارير</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        <View style={styles.statsGrid}>
          {reportCards.map((card, index) => (
            <View key={index} style={[styles.statCard, { borderLeftColor: card.color }]}>
              <View style={styles.statHeader}>
                <Ionicons name={card.icon} size={24} color={card.color} />
                <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
              </View>
              <Text style={styles.statLabel}>{card.label}</Text>
              <Text style={[styles.statChange, card.change.startsWith('+') ? styles.positive : styles.negative]}>
                {card.change}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>أكثر المتاجر مبيعاً</Text>
          {['بيتزا إيطاليا', 'مطعم الأهرام', 'سوشي بار'].map((store, index) => (
            <View key={index} style={styles.rankItem}>
              <Text style={styles.rankNumber}>#{index + 1}</Text>
              <Text style={styles.rankName}>{store}</Text>
              <Text style={styles.rankValue}>{[78, 45, 32][index]} طلب</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>أكثر المنتجات طلباً</Text>
          {['بيتزا مارجريتا', 'شاورما دجاج', 'كابتشينو'].map((item, index) => (
            <View key={index} style={styles.rankItem}>
              <Text style={styles.rankNumber}>#{index + 1}</Text>
              <Text style={styles.rankName}>{item}</Text>
              <Text style={styles.rankValue}>{[156, 89, 67][index]} طلب</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  content: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4, marginBottom: 12 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  statChange: { fontSize: 13, fontWeight: 'bold', marginTop: 4 },
  positive: { color: COLORS.success },
  negative: { color: COLORS.error },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  rankItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 6 },
  rankNumber: { width: 32, fontSize: 14, fontWeight: 'bold', color: COLORS.textSecondary },
  rankName: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  rankValue: { fontSize: 14, color: COLORS.primary, fontWeight: 'bold' },
});

export default Reports;