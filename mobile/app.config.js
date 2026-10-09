const appRoles = {
  customer: {
    name: 'چودي ستار',
    androidPackage: 'com.now.delivery',
    iosBundleIdentifier: 'com.now.delivery',
    scheme: 'now-delivery',
  },
  vendor: {
    name: 'چودي ستار بائع',
    androidPackage: 'com.now.delivery.vendor',
    iosBundleIdentifier: 'com.now.delivery.vendor',
    scheme: 'now-delivery-vendor',
  },
  delivery: {
    name: 'چودي ستار مندوب',
    androidPackage: 'com.now.delivery.courier',
    iosBundleIdentifier: 'com.now.delivery.courier',
    scheme: 'now-delivery-courier',
  },
};

module.exports = ({ config }) => {
  const appRole = process.env.EXPO_PUBLIC_APP_ROLE || 'customer';
  const roleConfig = appRoles[appRole];

  if (!roleConfig) {
    throw new Error(`Unsupported EXPO_PUBLIC_APP_ROLE: ${appRole}`);
  }

  return {
    ...config,
    name: roleConfig.name,
    scheme: roleConfig.scheme,
    android: {
      ...config.android,
      package: roleConfig.androidPackage,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: roleConfig.iosBundleIdentifier,
    },
    extra: {
      ...config.extra,
      appRole,
    },
  };
};
