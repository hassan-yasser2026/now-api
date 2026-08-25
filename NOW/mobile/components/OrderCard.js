import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import colors from '../constants/colors';
import { formatPrice } from '../utils/formatters';

export default function OrderCard({
  order,
  onPress,
}) {
  const statusMap = {
    Pending: {
      label: 'قيد الانتظار',
      color: '#B45309',
      bg: '#FEF3C7',
    },

    Preparing: {
      label: 'قيد التحضير',
      color: '#2563EB',
      bg: '#DBEAFE',
    },

    PickedUp: {
      label: 'في الطريق',
      color: '#7C3AED',
      bg: '#EDE9FE',
    },

    Delivered: {
      label: 'تم التوصيل',
      color: '#15803D',
      bg: '#DCFCE7',
    },

    Cancelled: {
      label: 'ملغي',
      color: '#DC2626',
      bg: '#FEE2E2',
    },
  };

  const status =
    statusMap[order.status] ||
    statusMap.Pending;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.top}>
        <Text style={styles.number}>
          طلب #{order.id}
        </Text>

        <View
          style={[
            styles.status,
            {
              backgroundColor:
                status.bg,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: status.color,
              },
            ]}
          >
            {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons
          name="storefront-outline"
          size={17}
          color={colors.textSecondary}
        />

        <Text style={styles.infoText}>
          {order.storeName ||
            'متجر ناو'}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons
          name="location-outline"
          size={17}
          color={colors.textSecondary}
        />

        <Text
          numberOfLines={1}
          style={styles.infoText}
        >
          {order.address ||
            'عنوان التوصيل'}
        </Text>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.total}>
          {formatPrice(order.totalPrice)}
        </Text>

        <Text style={styles.date}>
          {order.createdAt ||
            'اليوم'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },

  top: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  number: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },

  status: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  infoRow: {
    marginTop: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 7,
  },

  infoText: {
    flex: 1,
    color: colors.textSecondary,
    textAlign: 'right',
    fontSize: 12,
  },

  bottom: {
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  total: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 15,
  },

  date: {
    color: colors.textSecondary,
    fontSize: 11,
  },
});