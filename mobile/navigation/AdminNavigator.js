import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminDashboard from '../screens/admin/AdminDashboard';
import UsersManagement from '../screens/admin/UsersManagement';
import StoresManagement from '../screens/admin/StoresManagement';
import OrdersManagement from '../screens/admin/OrdersManagement';
import DeliveryManagement from '../screens/admin/DeliveryManagement';
import SubAdminsManagement from '../screens/admin/SubAdminsManagement';
import SubAdminPermissions from '../screens/admin/SubAdminPermissions';
import Reports from '../screens/admin/Reports';
import AboutScreen from '../screens/auth/AboutScreen';

const Stack = createNativeStackNavigator();

const AdminNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="UsersManagement" component={UsersManagement} />
      <Stack.Screen name="StoresManagement" component={StoresManagement} />
      <Stack.Screen name="OrdersManagement" component={OrdersManagement} />
      <Stack.Screen name="DeliveryManagement" component={DeliveryManagement} />
      <Stack.Screen name="SubAdminsManagement" component={SubAdminsManagement} />
      <Stack.Screen name="SubAdminPermissions" component={SubAdminPermissions} />
      <Stack.Screen name="Reports" component={Reports} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
};

export default AdminNavigator;