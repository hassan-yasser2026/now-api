import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import useAppStore from '../store/appStore';
import AuthNavigator from './AuthNavigator';
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

  const getNavigator = () => {
    switch (role) {
      case 'admin':
        return AdminNavigator;
      case 'vendor':
        return VendorNavigator;
      case 'delivery':
        return DeliveryNavigator;
      case 'customer':
      default:
        return CustomerNavigator;
    }
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="App" component={getNavigator()} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;