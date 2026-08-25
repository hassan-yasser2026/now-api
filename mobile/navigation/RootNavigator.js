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
    let isMounted = true;
    const init = async () => {
      try {
        await restoreSession();
      } catch (error) {
        console.error("Session restore error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [isAuthenticated, restoreSession]);

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

  const ActiveNavigator = isAuthenticated ? getNavigator() : AuthNavigator;
  return <ActiveNavigator key={isAuthenticated ? `app-${role}` : 'auth'} />;
};

export default RootNavigator;