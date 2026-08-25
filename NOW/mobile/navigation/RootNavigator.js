import React, { useEffect, useState } from 'react';
import useAppStore from '../store/appStore';
import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import VendorNavigator from './VendorNavigator';
import DeliveryNavigator from './DeliveryNavigator';
import AdminNavigator from './AdminNavigator';
import Loading from '../components/Loading';

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
      case 'sub_admin':
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

  // Render a fresh navigation tree when authentication changes. This avoids
  // retaining the Auth stack after setAuth() succeeds.
  const ActiveNavigator = isAuthenticated ? getNavigator() : AuthNavigator;
  return <ActiveNavigator />;
};

export default RootNavigator;
