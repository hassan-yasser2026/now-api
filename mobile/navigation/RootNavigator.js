import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import useAppStore from '../store/appStore';
import CustomerNavigator from './CustomerNavigator';
import VendorNavigator from './VendorNavigator';
import DeliveryNavigator from './DeliveryNavigator';
import AdminNavigator from './AdminNavigator';
import Loading from '../components/Loading';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { isAuthenticated, role, restoreSession } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await restoreSession();
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return <Loading text="جاري تحميل التطبيق..." />;
  }

  // الزوار والعملاء كلاهم يستخدم CustomerNavigator
  // الأدوار الأخرى تحصل على Navigator خاص بها عند تسجيل الدخول
  const getNavigatorForRole = () => {
    if (!isAuthenticated) return CustomerNavigator;
    switch (role) {
      case 'admin':
        return AdminNavigator;
      case 'vendor':
        return VendorNavigator;
      case 'delivery':
        return DeliveryNavigator;
      default:
        return CustomerNavigator;
    }
  };

  const ActiveNavigator = getNavigatorForRole();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="App" component={ActiveNavigator} />
    </Stack.Navigator>
  );
};

export default RootNavigator;