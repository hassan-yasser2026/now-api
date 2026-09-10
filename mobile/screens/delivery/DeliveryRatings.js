import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import deliveryService from '../../services/deliveryService';

const DeliveryRatings = ({ navigation }) => {
  const [data, setData] = useState({ ratings: [], average: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRatings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await deliveryService.getRatings();
      setData(response?.data || response || { ratings: [], average: 0, count: 0 });
    } catch (requestError) {
      setError(requestError?.message || 'تعذر تحميل التقييمات');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadRatings();
  }, [loadRatings]));

  const renderRating = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.customer}>{item.customer?.name || 'عميل'}</Text>
        <Text style={styles.stars}>{'★'.repeat(item.stars)}{'☆'.repeat(5 - item.stars)}</Text>
      </View>
      {!!item.comment && <Text style={styles.comment}>{item.comment}</Text>}
      <View style={styles.cardFooter}>
        <Text style={styles.order}>طلب #{item.order?.id}</Text>
        <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('ar-EG')}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="رجوع" onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>تقييمات العملاء</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color={COLORS.error} />
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRatings}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data.ratings}
          renderItem={renderRating}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={(
            <View style={styles.summary}>
              <Text style={styles.average}>★ {Number(data.average || 0).toFixed(1)}</Text>
              <Text style={styles.count}>{data.count || 0} تقييم من العملاء</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>لا توجد تقييمات من العملاء حتى الآن</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { padding: 4 },
  headerSpacer: { width: 32 },
  title: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  summary: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 18, marginBottom: 16, alignItems: 'center' },
  average: { color: '#fff', fontSize: 30, fontWeight: '800' },
  count: { color: '#fff', marginTop: 4 },
  list: { padding: 16, paddingBottom: 30 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  customer: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  stars: { color: '#F59E0B', fontSize: 18 },
  comment: { color: COLORS.textPrimary, textAlign: 'right', marginTop: 10, lineHeight: 22 },
  cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 10 },
  order: { color: COLORS.textSecondary, fontSize: 12 },
  date: { color: COLORS.textLight, fontSize: 12 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 30 },
  error: { color: COLORS.error, textAlign: 'center', marginTop: 12 },
  retryButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, marginTop: 16 },
  retryText: { color: '#fff', fontWeight: '700' },
});

export default DeliveryRatings;
