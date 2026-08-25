import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';
import { storeService } from '../../services/storeService';
import MenuItemCard from '../../components/MenuItemCard';
import EmptyState from '../../components/EmptyState';

const StoreMenu = ({ route, navigation }) => {
  const { storeId, storeName } = route.params || {};
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const { cart, addToCart, removeFromCart, updateQuantity } = useAppStore();

  const fetchMenu = useCallback(async () => {
    if (!storeId) {
      Alert.alert('خطأ', 'لم يتم تحديد المتجر');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // ملاحظة: لا يوجد دالة getMenu في storeService.js
      // سأفترض وجودها وأنها تعمل كما هو متوقع.
      const result = await storeService.getMenu(storeId);
      if (result.success) {
        setMenu(Array.isArray(result.menu) ? result.menu : []);
      } else {
        setMenu([]);
        Alert.alert('خطأ', result.message || 'فشل تحميل قائمة الأصناف');
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      setMenu([]);
      Alert.alert('خطأ', 'حدث خطأ غير متوقع أثناء تحميل القائمة');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Memoize cart calculations for this store
  const storeCartItems = useMemo(() => cart.filter(item => item.storeId === storeId), [cart, storeId]);
  const totalItems = useMemo(() => storeCartItems.reduce((sum, item) => sum + item.quantity, 0), [storeCartItems]);
  const totalPrice = useMemo(() => storeCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0), [storeCartItems]);

  const getCartQuantity = useCallback((itemId) => {
    const item = storeCartItems.find(i => i.id === itemId);
    return item ? item.quantity : 0;
  }, [storeCartItems]);

  const handleAddToCart = useCallback((item) => {
    if (!item.isAvailable) {
      Alert.alert('تنبيه', 'هذا المنتج غير متاح حالياً');
      return;
    }
    addToCart(item, storeId);
  }, [addToCart, storeId]);

  const handleRemoveFromCart = useCallback((itemId) => {
    const item = storeCartItems.find(i => i.id === itemId);

    if (item && item.quantity > 1) {
      updateQuantity(itemId, storeId, item.quantity - 1);
      return;
    }

    removeFromCart(itemId, storeId);
  }, [storeCartItems, updateQuantity, removeFromCart, storeId]);


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>جاري تحميل المنيو...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{storeName || 'المنيو'}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CustomerHome')}
          style={styles.homeBtn}
        >
          <Ionicons name="home-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={menu}
        renderItem={({ item }) => (
          <MenuItemCard
            item={item}
            quantity={getCartQuantity(item.id)}
            onAdd={() => handleAddToCart(item)}
            onRemove={() => handleRemoveFromCart(item.id)}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="restaurant-outline"
            title="لا توجد أصناف"
            message="هذا المتجر لا يحتوي على أصناف حالياً"
          />
        }
      />

      {totalItems > 0 && (
        <View style={styles.cartBar}>
          <View style={styles.cartInfo}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
            <Text style={styles.cartTotal}>{totalPrice.toFixed(2)} ج.م</Text>
          </View>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => navigation.navigate('OrderConfirmation', { storeId })}
          >
            <Text style={styles.cartBtnText}>تأكيد الطلب</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  homeBtn: { padding: 4 },
  list: { padding: 16, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: COLORS.textSecondary },
  cartBar: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderTopColor: COLORS.border, 
    paddingBottom: 24 
  },
  cartInfo: { flexDirection: 'row', alignItems: 'center' },
  cartBadge: { 
    backgroundColor: COLORS.primary, 
    borderRadius: 12, 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    marginRight: 12 
  },
  cartBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  cartTotal: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  cartBtn: { 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 30 
  },
  cartBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default StoreMenu;