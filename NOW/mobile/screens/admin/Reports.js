import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import Loading from '../../components/Loading';
import adminService from '../../services/adminService';

const Reports = ({ navigation }) => {
  const [report, setReport] = useState({
    totalOrders: 0,
    revenue: 0,
    newUsers: 0,
    activeStores: 0,
    topStores: [],
    topItems: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReport = async () => {
    const response = await adminService.getReports();
    setReport(response.data);
  };

  useEffect(() => {
    loadReport()
      .catch(() => Alert.alert('خطأ', 'تعذر تحميل التقارير'))
      .finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadReport();
    } catch (error) {
      Alert.alert('خطأ', 'تعذر تحديث التقارير');
    } finally {
      setRefreshing(false);
    }
  };

  const reportCards = [
    { label: 'إجمالي الطلبات', value: report.totalOrders, icon: 'bag-outline', color: COLORS.primary },
    { label: 'الإيرادات', value: `${Number(report.revenue).toFixed(2)} ج.م`, icon: 'cash-outline', color: COLORS.success },
    { label: 'مستخدمو الشهر', value: report.newUsers, icon: 'people-outline', color: COLORS.secondary },
    { label: 'المتاجر النشطة', value: report.activeStores, icon: 'storefront-outline', color: COLORS.warning },
  ];

  if (loading) {
    return <Loading text="جاري تحميل التقارير..." />;
  }

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
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>أكثر المتاجر مبيعاً</Text>
          {report.topStores.map((store, index) => (
            <View key={store.id} style={styles.rankItem}>
              <Text style={styles.rankNumber}>#{index + 1}</Text>
              <Text style={styles.rankName}>{store.name}</Text>
              <Text style={styles.rankValue}>{store.orders} طلب</Text>
            </View>
          ))}
          {report.topStores.length === 0 && (
            <Text style={styles.emptyText}>لا توجد طلبات لعرض ترتيب المتاجر</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>أكثر المنتجات طلباً</Text>
          {report.topItems.map((item, index) => (
            <View key={item.id} style={styles.rankItem}>
              <Text style={styles.rankNumber}>#{index + 1}</Text>
              <Text style={styles.rankName}>{item.name}</Text>
              <Text style={styles.rankValue}>{item.quantity} قطعة</Text>
            </View>
          ))}
          {report.topItems.length === 0 && (
            <Text style={styles.emptyText}>لا توجد طلبات لعرض ترتيب المنتجات</Text>
          )}
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
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  rankItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 6 },
  rankNumber: { width: 32, fontSize: 14, fontWeight: 'bold', color: COLORS.textSecondary },
  rankName: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  rankValue: { fontSize: 14, color: COLORS.primary, fontWeight: 'bold' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 20 },
});

export default Reports;