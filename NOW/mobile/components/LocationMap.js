import React, { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { buildMapHtml } from '../utils/mapHtml';

/**
 * Native Leaflet map (WebView). The web build resolves LocationMap.web.js.
 *
 * Props:
 *   markers  [{ lat, lng, label, color }]
 *   center   { lat, lng } (defaults to first marker)
 *   zoom     number
 *   picker   boolean — tap/drag to choose a point
 *   onPick   ({ lat, lng }) => void
 *   height   number (default 220)
 */
const LocationMap = ({
  markers = [],
  center,
  zoom = 14,
  picker = false,
  onPick,
  height = 220,
  style,
  mapRef,
}) => {
  const webViewRef = useRef(null);

  const html = useMemo(
    () => buildMapHtml({ markers, center, zoom, picker }),
    // Rebuilding on every marker identity change would reset the view while
    // dragging; key on the serialized values instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(markers), JSON.stringify(center), zoom, picker]
  );

  if (mapRef) {
    mapRef.current = {
      setPick: (lat, lng) => {
        webViewRef.current?.postMessage(
          JSON.stringify({ type: 'setPick', lat, lng })
        );
      },
    };
  }

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'pick' && onPick) {
        onPick({ lat: data.lat, lng: data.lng });
      }
    } catch {
      // Ignore malformed messages.
    }
  };

  return (
    <View style={[styles.container, { height }, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        setBuiltInZoomControls={false}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
});

export default LocationMap;
