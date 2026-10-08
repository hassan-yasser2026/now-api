import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import walletService from '../../services/walletService';

const WalletScreen = () => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await walletService.getWallet();
    if (result.success) setWallet(result.wallet);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>المحفظة</Text>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>الرصيد الحالي</Text>
        <Text style={styles.balance}>{Number(wallet?.balance || 0).toFixed(2)} ج.م</Text>
      </View>
      <Text style={styles.sectionTitle}>سجل العمليات</Text>
      <FlatList
        data={wallet?.transactions || []}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.empty}>لا توجد عمليات مالية بعد.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('ar-EG')}</Text>
            </View>
            <Text style={styles.amount}>+{Number(item.amount).toFixed(2)} ج.م</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 25, fontWeight: '900', color: COLORS.textPrimary, textAlign: 'right', marginBottom: 18 },
  balanceCard: { padding: 24, borderRadius: 20, backgroundColor: COLORS.primary, marginBottom: 24 },
  balanceLabel: { color: COLORS.white, textAlign: 'right', fontWeight: '700' },
  balance: { color: COLORS.white, textAlign: 'right', fontSize: 30, fontWeight: '900', marginTop: 8 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900', textAlign: 'right', marginBottom: 10 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', padding: 15, marginBottom: 8, borderRadius: 14, backgroundColor: COLORS.surface },
  copy: { flex: 1, alignItems: 'flex-end' },
  description: { color: COLORS.textPrimary, fontWeight: '800', textAlign: 'right' },
  date: { color: COLORS.textLight, fontSize: 11, marginTop: 4 },
  amount: { color: COLORS.success, fontWeight: '900', marginLeft: 12 },
  empty: { textAlign: 'center', color: COLORS.secondaryText, marginTop: 30 },
});

export default WalletScreen;
// مسودة المشروع - البشمهندس حسن ياسر
