import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import api from '../../services/api';

type EarningsPeriod = 'day' | 'week' | 'month';

type EarningsSummary = {
  total: number;
  count: number;
  orders: any[];
};

const VendorEarnings: React.FC = () => {
  const [period, setPeriod] = useState<EarningsPeriod>('day');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);

  const loadEarnings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/vendor/earnings?period=${period}`);
      const data = res.data?.data ?? res.data;
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
  }, [period]);

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
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
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
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
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