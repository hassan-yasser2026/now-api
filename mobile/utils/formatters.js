import { CONFIG } from '../constants/config';

const STATUS_LABELS = {
  PENDING: 'في الانتظار',
  ACCEPTED: 'تم القبول',
  PREPARING: 'قيد التحضير',
  READY: 'جاهز للاستلام',
  PICKED_UP: 'تم الاستلام',
  ON_THE_WAY: 'في الطريق',
  DELIVERED: 'تم التوصيل',
  CANCELLED: 'ملغي',
};

export function formatPrice(price, currency = CONFIG.CURRENCY_SYMBOL) {
  const amount = Number(price || 0);
  try {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: CONFIG.CURRENCY || 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatOrderStatus(status) {
  return STATUS_LABELS[status] || status;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
