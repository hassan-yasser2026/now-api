import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import PartnerRegistrationScreen from '../screens/auth/PartnerRegistrationScreen';
import SellerLegalDocumentScreen from '../screens/auth/SellerLegalDocumentScreen';
import AboutScreen from '../screens/auth/AboutScreen';
import { APP_ROLE } from '../constants/appRole';
import CustomerHome from '../screens/customer/CustomerHome';
import StoreMenu from '../screens/customer/StoreMenu';
import ProductDetails from '../screens/customer/ProductDetails';
import SearchScreen from '../screens/customer/SearchScreen';
import SettingsScreen from '../screens/customer/SettingsScreen';
import DeliverySchedule from '../screens/customer/DeliverySchedule';
import VerifyPhoneScreen from '../screens/auth/VerifyPhoneScreen';

const Stack = createNativeStackNavigator();
const isPartnerApp = APP_ROLE === 'vendor' || APP_ROLE === 'delivery';

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName={isPartnerApp ? 'PartnerLogin' : 'GuestHome'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      {isPartnerApp ? (
        <Stack.Screen
          initialParams={{ role: APP_ROLE }}
          name="PartnerLogin"
          component={LoginScreen}
        />
      ) : (
        <Stack.Screen name="Register" component={RegisterScreen} />
      )}
      <Stack.Screen name="VerifyPhone" component={VerifyPhoneScreen} />
      {isPartnerApp && (
        <Stack.Screen
          initialParams={{ role: APP_ROLE }}
          name="PartnerRegistration"
          component={PartnerRegistrationScreen}
        />
      )}
      {APP_ROLE === 'vendor' && (
        <Stack.Screen
          name="SellerLegalDocument"
          component={SellerLegalDocumentScreen}
        />
      )}
      <Stack.Screen name="About" component={AboutScreen} />
      {!isPartnerApp && (
        <>
          <Stack.Screen name="GuestHome" component={CustomerHome} />
          <Stack.Screen name="StoreMenu" component={StoreMenu} />
          <Stack.Screen name="ProductDetails" component={ProductDetails} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="DeliverySchedule" component={DeliverySchedule} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AuthNavigator;
// مسودة المشروع - البشمهندس حسن ياسر