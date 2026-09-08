import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import api from '../../services/api';
import useAppStore from '../../store/appStore';

type EarningsPeriod = 'day' | 'week' | 'month';

type EarningsSummary = {
  total: number;
  count: number;
  orders: any[];
};

const VendorEarnings: React.FC = () => {
  const user = useAppStore((state) => state.user);
  const [period, setPeriod] = useState<EarningsPeriod>('day');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);

  const loadEarnings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      try {
        const res = await api.get(`/vendor/earnings?period=${period}`);
        data = res.data?.data ?? res.data;
      } catch (err: any) {
        if (err?.response?.status !== 404 || !user?.id) {
          throw err;
        }
        const res = await api.get(`/vendor/${user.id}/orders`);
        const allOrders = res.data?.data ?? res.data ?? [];
        const startDate = new Date();
        if (period === 'day') startDate.setHours(0, 0, 0, 0);
        if (period === 'week') startDate.setDate(startDate.getDate() - 7);
        if (period === 'month') startDate.setDate(startDate.getDate() - 30);
        const orders = allOrders.filter(
          (order: any) =>
            order.status === 'DELIVERED' &&
            new Date(order.createdAt) >= startDate
        );
        data = {
          total: orders.reduce(
            (sum: number, order: any) => sum + Number(order.totalPrice || 0),
            0
          ),
          count: orders.length,
          orders,
        };
      }
      setSummary({
        total: data?.total || 0,
        count: data?.count || 0,
        orders: data?.orders || [],
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'فشل جلب الأرباح');
    } finally {
      setLoading(false);
    }
  }, [period, user?.id]);

  useEffect(() => { loadEarnings(); }, [loadEarnings]);

  const periods: { key: EarningsPeriod; label: string }[] = [
    { key: 'day', label: 'اليوم' },
    { key: 'week', label: 'الأسبوع' },
    { key: 'month', label: 'الشهر' },
  ];
  const renderOrderItem = ({ item }: { item: any }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemOrder}>طلب #{item.id}</Text>
        <Text style={[styles.itemAmount, styles.amountPositive]}>
          {Number(item.totalPrice || 0).toFixed(0)} ج.م
        </Text>
      </View>
      <View style={styles.itemFooter}>
        <Text style={styles.itemDate}>
          {new Date(item.createdAt).toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' })}
        </Text>
        <View style={[styles.statusBadge, styles.badgeCompleted]}>
          <Text style={[styles.statusBadgeText, { color: COLORS.success }]}>مكتمل</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoRed}>N</Text>
          <Text style={styles.logoBlack}>OW</Text>
        </View>
        <Text style={styles.headerTitle}>إيرادات المتجر</Text>
      </View>

      <View style={styles.periodSelector}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodButton, period === p.key && styles.periodButtonActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadEarnings}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      ) : summary ? (
        <FlatList
          data={summary.orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            <>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>إجمالي الإيرادات</Text>
                  <Text style={styles.summaryValue}>{summary.total.toFixed(0)} ج.م</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>عدد الطلبات</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.primary }]}>{summary.count}</Text>
                </View>
              </View>
              <Text style={styles.sectionTitle}>سجل الطلبات</Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.inactive} />
              <Text style={styles.emptyText}>لا توجد طلبات في هذه الفترة</Text>
            </View>
          }
        />
      ) : null}
    </SafeAreaView>
  );
};

// ========== Styles ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  header: {
    height: 148,
    backgroundColor: '#10C7E8',
    borderBottomWidth: 7,
    borderBottomColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRed: {
    color: '#D92838',
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: -7,
  },
  logoBlack: {
    color: '#050505',
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: -7,
  },
  headerTitle: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '800',
    color: '#050505',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 5,
    margin: 16,
    marginBottom: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#10C7E8',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondaryText,
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 16,
    borderTopWidth: 5,
    borderTopColor: '#10C7E8',
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.secondaryText,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 12,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 16,
    marginBottom: 8,
    borderRightWidth: 5,
    borderRightColor: '#10C7E8',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemOrder: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  amountPositive: {
    color: COLORS.success,
  },
  amountNegative: {
    color: COLORS.error,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  itemDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeCompleted: {
    backgroundColor: COLORS.success + '20',
  },
  badgeCancelled: {
    backgroundColor: COLORS.error + '20',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.inactive,
    marginTop: 12,
  },
});

export default VendorEarnings;