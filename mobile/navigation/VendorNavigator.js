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
import VendorOffers from '../screens/vendor/VendorOffers';
import VendorRatings from '../screens/vendor/VendorRatings';
import VendorNotifications from '../screens/vendor/VendorNotifications';
import AccountSettingsScreen from '../screens/customer/AccountSettingsScreen';
import AboutScreen from '../screens/auth/AboutScreen';
import VendorWorkingHours from '../screens/vendor/VendorWorkingHours';

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
      <Stack.Screen name="VendorOffers" component={VendorOffers} />
      <Stack.Screen name="AddMenuItem" component={AddMenuItem} />
      <Stack.Screen name="EditMenuItem" component={EditMenuItem} />
      <Stack.Screen name="VendorOrders" component={VendorOrders} />
      <Stack.Screen name="VendorOrderDetails" component={VendorOrderDetails} />
      <Stack.Screen name="VendorEarnings" component={VendorEarnings} />
      <Stack.Screen name="VendorRatings" component={VendorRatings} />
      <Stack.Screen name="VendorNotifications" component={VendorNotifications} />
      <Stack.Screen name="StoreSettings" component={StoreSettings} />
      <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
      <Stack.Screen name="VendorProfile" component={VendorProfile} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="VendorWorkingHours" component={VendorWorkingHours} />
    </Stack.Navigator>
  );
};

export default VendorNavigator;