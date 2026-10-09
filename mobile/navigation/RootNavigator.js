import React, { useEffect, useState } from 'react';
import useAppStore from '../store/appStore';
import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import VendorNavigator from './VendorNavigator';
import DeliveryNavigator from './DeliveryNavigator';
import AdminWebOnlyScreen from '../screens/auth/AdminWebOnlyScreen';
import RoleMismatchScreen from '../screens/auth/RoleMismatchScreen';
import { APP_ROLE } from '../constants/appRole';
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
  }, [restoreSession]);

  if (loading) {
    return <Loading text="جاري تحميل التطبيق..." />;
  }

  if (isAuthenticated && (role === 'admin' || role === 'sub_admin')) {
    return <AdminWebOnlyScreen />;
  }

  if (isAuthenticated && role !== APP_ROLE) {
    return <RoleMismatchScreen />;
  }

  const getNavigator = () => {
    switch (role) {
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
// مسودة المشروع - البشمهندس حسن ياسر