import Constants from 'expo-constants';

const configuredRole = Constants.expoConfig?.extra?.appRole || 'customer';

if (!['customer', 'vendor', 'delivery'].includes(configuredRole)) {
  throw new Error(`Unsupported EXPO_PUBLIC_APP_ROLE: ${configuredRole}`);
}

export const APP_ROLE = configuredRole;
export const APP_ROLE_LABEL = {
  customer: 'العميل',
  vendor: 'البائع',
  delivery: 'المندوب',
}[APP_ROLE];
