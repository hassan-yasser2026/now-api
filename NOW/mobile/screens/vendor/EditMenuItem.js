import React from 'react';
import AddMenuItem from './AddMenuItem';

export default function EditMenuItem({ navigation, route }) {
  const item = route?.params?.item || null;

  return (
    <AddMenuItem
      navigation={navigation}
      route={{
        ...route,
        params: {
          ...route?.params,
          item,
          mode: 'edit',
        },
      }}
    />
  );
}
