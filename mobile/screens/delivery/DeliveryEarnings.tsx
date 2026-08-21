import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import deliveryService from '../../services/deliveryService';

// ========== Types ==========
type EarningsPeriod = 'day' | 'week' | 'month';

type EarningsSummary = {
  totalEarnings: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  earningsList: EarningsItem[];
};

type EarningsItem = {
  id: string;
  orderId: string;
  amount: number;
  date: string;
  status: 'completed' | 'cancelled';
};

// ========== Component ==========
const DeliveryEarnings: React.FC = () => {
  const [period, setPeriod] = useState<EarningsPeriod>('day');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    earningsList: [],
  });

  const loadEarnings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await deliveryService.getEarnings({ period });
      // التعامل مع أشكال مختلفة للاستجابة
      const data = response?.data || response;
      setSummary({
        totalEarnings: data?.totalEarnings ?? 0,
        totalOrders: data?.totalOrders ?? 0,
        completedOrders: data?.completedOrders ?? 0,
        cancelledOrders: data?.cancelledOrders ?? 0,
        earningsList: data?.earningsList ?? [],
      });
    } catch (err: any) {
      setError(err?.message || 'فشل جلب الأرباح');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  const periods: { key: EarningsPeriod; label: string }[] = [
    { key: 'day', label: 'اليوم' },
    { key: 'week', label: 'الأسبوع' },
    { key: 'month', label: 'الشهر' },
  ];

  const renderEarningsItem = ({ item }: { item: EarningsItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemOrder}>طلب #{item.orderId}</Text>
        <Text
          style={[
            styles.itemAmount,
            item.status === 'completed' ? styles.amountPositive : styles.amountNegative,
          ]}
        >
          {item.amount} ج.م
        </Text>
      </View>
      <View style={styles.itemFooter}>
        <Text style={styles.itemDate}>{new Date(item.date).toLocaleDateString('ar-EG')}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === 'completed' ? styles.badgeCompleted : styles.badgeCancelled,
          ]}
        >
          <Text style={[styles.statusBadgeText, { color: item.status === 'completed' ? COLORS.success : COLORS.error }]}>
            {item.status === 'completed' ? 'مكتمل' : 'ملغي'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>أرباحي</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodButton, period === p.key && styles.periodButtonActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text
              style={[
                styles.periodText,
                period === p.key && styles.periodTextActive,
              ]}
            >
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
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>إجمالي الأرباح</Text>
              <Text style={styles.summaryValue}>{summary.totalEarnings} ج.م</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>إجمالي الطلبات</Text>
              <Text style={styles.summaryValue}>{summary.totalOrders}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>مكتملة</Text>
              <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                {summary.completedOrders}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>ملغاة</Text>
              <Text style={[styles.summaryValue, { color: COLORS.error }]}>
                {summary.cancelledOrders}
              </Text>
            </View>
          </View>

          {/* Earnings List */}
          <Text style={styles.sectionTitle}>سجل الأرباح</Text>
          {summary.earningsList.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cash-outline" size={48} color={COLORS.inactive} />
              <Text style={styles.emptyText}>لا توجد أرباح في هذه الفترة</Text>
            </View>
          ) : (
            <FlatList
              data={summary.earningsList}
              renderItem={renderEarningsItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </ScrollView>
      )}
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
    fontWeight: '600',
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

export default DeliveryEarnings;