import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import VendorDashboard from '../screens/vendor/VendorDashboard';
import VendorMenu from '../screens/vendor/VendorMenu';
import AddMenuItem from '../screens/vendor/AddMenuItem';
import EditMenuItem from '../screens/vendor/EditMenuItem';
import VendorOrders from '../screens/vendor/VendorOrders';
import VendorOrderDetails from '../screens/vendor/VendorOrderDetails';
import VendorEarnings from '../screens/vendor/VendorEarnings';
import StoreSettings from '../screens/vendor/StoreSettings';
import VendorProfile from '../screens/vendor/VendorProfile';
import AboutScreen from '../screens/auth/AboutScreen';

const Stack = createNativeStackNavigator();

const VendorNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="VendorDashboard"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        contentStyle: {
          backgroundColor: '#FFFFFF',
        },
      }}
    >
      <Stack.Screen name="VendorDashboard" component={VendorDashboard} />
      <Stack.Screen name="VendorMenu" component={VendorMenu} />
      <Stack.Screen name="AddMenuItem" component={AddMenuItem} />
      <Stack.Screen name="EditMenuItem" component={EditMenuItem} />
      <Stack.Screen name="VendorOrders" component={VendorOrders} />
      <Stack.Screen name="VendorOrderDetails" component={VendorOrderDetails} />
      <Stack.Screen name="VendorEarnings" component={VendorEarnings} />
      <Stack.Screen name="StoreSettings" component={StoreSettings} />
      <Stack.Screen name="VendorProfile" component={VendorProfile} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
};

export default VendorNavigator;