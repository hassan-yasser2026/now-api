import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';

const ACCENT = '#0B8FA3';

export default function VendorRatings() {
  const [data, setData] = useState({ ratings: [], average: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendor/ratings');
      setData(response.data?.data || { ratings: [], average: 0, count: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /></View>;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>تقييمات العملاء</Text>
      <View style={styles.summary}>
        <Text style={styles.average}>⭐ {data.average.toFixed(1)}</Text>
        <Text style={styles.count}>{data.count} تقييم</Text>
      </View>
      <FlatList
        data={data.ratings}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>لا توجد تقييمات بعد</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.customer?.name || 'عميل'}</Text>
              <Text style={styles.stars}>{'★'.repeat(item.stars)}{'☆'.repeat(5 - item.stars)}</Text>
            </View>
            {!!item.comment && <Text style={styles.comment}>{item.comment}</Text>}
            <Text style={styles.order}>طلب #{item.order?.id}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FBFC', padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#111', fontSize: 28, fontWeight: '900', textAlign: 'right', marginTop: 30 },
  summary: { backgroundColor: ACCENT, borderRadius: 18, padding: 18, marginVertical: 18, alignItems: 'center' },
  average: { color: '#fff', fontSize: 30, fontWeight: '900' },
  count: { color: '#D9F8FC', fontSize: 14, marginTop: 4 },
  list: { paddingBottom: 30 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2EEF0' },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#111', fontSize: 16, fontWeight: '800' },
  stars: { color: '#F59E0B', fontSize: 18 },
  comment: { color: '#333', textAlign: 'right', marginTop: 10, lineHeight: 22 },
  order: { color: '#777', textAlign: 'right', fontSize: 12, marginTop: 8 },
  empty: { textAlign: 'center', color: '#777', marginTop: 30 },
});
