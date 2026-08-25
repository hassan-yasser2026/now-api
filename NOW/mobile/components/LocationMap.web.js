import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { buildMapHtml } from '../utils/mapHtml';

/**
 * Web variant of LocationMap: renders the Leaflet document in an iframe.
 * Same props as the native version.
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
  const iframeRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const html = useMemo(
    () => buildMapHtml({ markers, center, zoom, picker }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(markers), JSON.stringify(center), zoom, picker]
  );

  if (mapRef) {
    mapRef.current = {
      setPick: (lat, lng) => {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ type: 'setPick', lat, lng }),
          '*'
        );
      },
    };
  }

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      try {
        const data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'pick' && onPickRef.current) {
          onPickRef.current({ lat: data.lat, lng: data.lng });
        }
      } catch {
        // Ignore messages from other embeds.
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <View style={[styles.container, { height }, style]}>
      <iframe
        ref={iframeRef}
        title="map"
        srcDoc={html}
        style={{ border: 0, width: '100%', height: '100%' }}
        sandbox="allow-scripts"
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
});

export default LocationMap;
