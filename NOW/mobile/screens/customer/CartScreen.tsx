import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';

// ========== Types ==========
type CartScreenProps = {
  navigation: any;
};

// ========== Component ==========
const CartScreen: React.FC<CartScreenProps> = ({ navigation }) => {
  // الحصول على حالة السلة والدوال مباشرة من المتجر
  const cart = useAppStore((state) => state.cart);
  const updateQuantity = useAppStore((state) => state.updateQuantity);
  const removeFromCart = useAppStore((state) => state.removeFromCart);
  const clearCart = useAppStore((state) => state.clearCart);

  const currentStoreId = cart.length > 0 ? cart[0].storeId : null;

  const totalPrice = (cart as any[]).reduce((sum: any, item: any) => sum + Number(item.price) * item.quantity, 0);
  const totalItems = (cart as any[]).reduce((sum: any, item: any) => sum + item.quantity, 0);

  const deliveryFee = 25; // يمكن جعلها ديناميكية من المتجر

  const finalTotal = useMemo(() => {
    return totalPrice + deliveryFee;
  }, [totalPrice, deliveryFee]);

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('السلة فارغة', 'لا يمكن إتمام الطلب بدون منتجات');
      return;
    }
    navigation.navigate('OrderConfirmation', {
      storeId: currentStoreId,
    });
  };

  const handleClearCart = () => {
    Alert.alert('تفريغ السلة', 'هل تريد إزالة جميع المنتجات؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تفريغ', style: 'destructive', onPress: clearCart },
    ]);
  };

  const renderCartItem = ({ item }: { item: any }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>{Number(item.price).toFixed(2)} ج.م</Text>
      </View>

      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.storeId, item.quantity - 1)}
        >
          <Ionicons name="remove" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        <Text style={styles.quantityText}>{item.quantity}</Text>

        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.storeId, item.quantity + 1)}
        >
          <Ionicons name="add" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.id, item.storeId)}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>سلة المشتريات</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={64} color={COLORS.inactive} />
          <Text style={styles.emptyText}>سلتك فارغة</Text>
          <Text style={styles.emptySubText}>أضف منتجات من متجرك المفضل</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('CustomerHome')}
          >
            <Text style={styles.browseButtonText}>تصفح المتاجر</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>سلة المشتريات</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearAllText}>مسح الكل</Text>
        </TouchableOpacity>
      </View>

      {/* Cart Items */}
      <FlatList
        data={cart}
        renderItem={renderCartItem}
        keyExtractor={(item) => `${item.id}-${item.storeId}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>عدد المنتجات</Text>
          <Text style={styles.summaryValue}>{totalItems}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>المجموع</Text>
          <Text style={styles.summaryValue}>{totalPrice.toFixed(2)} ج.م</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>رسوم التوصيل</Text>
          <Text style={styles.summaryValue}>{deliveryFee.toFixed(2)} ج.م</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>الإجمالي</Text>
          <Text style={styles.totalValue}>{finalTotal.toFixed(2)} ج.م</Text>
        </View>
      </View>

      {/* Checkout Button */}
      <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
        <Text style={styles.checkoutText}>إتمام الطلب</Text>
      </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  clearAllText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 16,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  checkoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.secondaryText,
    marginTop: 8,
  },
  browseButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default CartScreen;