import React, { useMemo, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { COLORS } from '../constants/colors';

/**
 * خريطة تفاعلية مبنية على Leaflet + OpenStreetMap داخل WebView.
 * لا تحتاج أي مفتاح API وتعمل داخل Expo Go مباشرة.
 *
 * Props:
 * - markers: [{ id, latitude, longitude, title, type: 'store'|'customer'|'driver'|'pin' }]
 * - center: { latitude, longitude } (اختياري - الافتراضي أول ماركر أو القاهرة)
 * - zoom: رقم (افتراضي 14)
 * - height: ارتفاع الخريطة (افتراضي 220)
 * - onPickLocation: (coords) => void — لو موجودة تتحول الخريطة لوضع اختيار موقع بالضغط
 * - showRoute: يرسم خطاً بين الماركرات بترتيبها (افتراضي false)
 */

const DEFAULT_CENTER = {
  latitude: 30.0444,
  longitude: 31.2357,
};

const MARKER_COLORS = {
  store: '#EC4899',
  customer: '#16A34A',
  driver: '#2563EB',
  pin: '#DC2626',
};

const isValidCoord = (value) => {
  const number = Number(value);
  return Number.isFinite(number);
};

const sanitizeMarkers = (markers) => {
  if (!Array.isArray(markers)) {
    return [];
  }

  return markers
    .filter(
      (marker) =>
        isValidCoord(marker?.latitude) &&
        isValidCoord(marker?.longitude)
    )
    .map((marker, index) => ({
      id: String(marker.id ?? index),
      latitude: Number(marker.latitude),
      longitude: Number(marker.longitude),
      title: String(marker.title || ''),
      type: MARKER_COLORS[marker.type]
        ? marker.type
        : 'pin',
    }));
};

const buildHtml = ({ center, zoom, pickMode, showRoute }) => `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
  .now-marker {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid #ffffff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  }
  .now-marker span {
    transform: rotate(45deg);
    font-size: 16px;
    line-height: 1;
  }
  .leaflet-popup-content { text-align: center; font-family: sans-serif; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: true, attributionControl: false })
    .setView([${center.latitude}, ${center.longitude}], ${zoom});

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  var markerColors = ${JSON.stringify(MARKER_COLORS)};
  var markerIcons = {
    store: '🏪',
    customer: '🏠',
    driver: '🛵',
    pin: '📍',
  };

  var markerLayer = L.layerGroup().addTo(map);
  var routeLine = null;
  var pickMarker = null;

  function makeIcon(type) {
    var color = markerColors[type] || markerColors.pin;
    var emoji = markerIcons[type] || markerIcons.pin;
    return L.divIcon({
      className: '',
      html: '<div class="now-marker" style="background:' + color + '"><span>' + emoji + '</span></div>',
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34],
    });
  }

  function setMarkers(markers) {
    markerLayer.clearLayers();

    if (routeLine) {
      map.removeLayer(routeLine);
      routeLine = null;
    }

    if (!markers || !markers.length) {
      return;
    }

    var points = [];

    markers.forEach(function (marker) {
      var point = [marker.latitude, marker.longitude];
      points.push(point);

      var leafletMarker = L.marker(point, { icon: makeIcon(marker.type) });

      if (marker.title) {
        leafletMarker.bindPopup(marker.title);
      }

      markerLayer.addLayer(leafletMarker);
    });

    if (${showRoute ? 'true' : 'false'} && points.length > 1) {
      routeLine = L.polyline(points, {
        color: '#EC4899',
        weight: 3,
        dashArray: '8 8',
      }).addTo(map);
    }

    if (points.length === 1) {
      map.setView(points[0], ${zoom});
    } else {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }

  function setPickedLocation(latitude, longitude, moveView) {
    if (pickMarker) {
      map.removeLayer(pickMarker);
    }

    pickMarker = L.marker([latitude, longitude], { icon: makeIcon('pin') }).addTo(map);

    if (moveView) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), 15));
    }
  }

  if (${pickMode ? 'true' : 'false'}) {
    map.on('click', function (event) {
      setPickedLocation(event.latlng.lat, event.latlng.lng, false);

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'pick',
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      }));
    });
  }

  window.__setMarkers = setMarkers;
  window.__setPickedLocation = setPickedLocation;

  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
</script>
</body>
</html>`;

const AppMap = ({
  markers,
  center,
  zoom = 14,
  height = 220,
  onPickLocation,
  showRoute = false,
  style,
}) => {
  const webViewRef = useRef(null);
  const readyRef = useRef(false);

  const safeMarkers = useMemo(
    () => sanitizeMarkers(markers),
    [markers]
  );

  const initialCenter = useMemo(() => {
    if (
      isValidCoord(center?.latitude) &&
      isValidCoord(center?.longitude)
    ) {
      return {
        latitude: Number(center.latitude),
        longitude: Number(center.longitude),
      };
    }

    if (safeMarkers.length > 0) {
      return {
        latitude: safeMarkers[0].latitude,
        longitude: safeMarkers[0].longitude,
      };
    }

    return DEFAULT_CENTER;
    // الـ HTML يُبنى مرة واحدة فقط، وتحديث الماركرات يتم عبر injectJavaScript
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const html = useMemo(
    () =>
      buildHtml({
        center: initialCenter,
        zoom,
        pickMode: Boolean(onPickLocation),
        showRoute,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const pushMarkers = useCallback(
    (list) => {
      if (!webViewRef.current || !readyRef.current) {
        return;
      }

      webViewRef.current.injectJavaScript(
        `window.__setMarkers(${JSON.stringify(list)}); true;`
      );
    },
    []
  );

  // تحديث الماركرات عند تغيّرها (تتبع مباشر)
  React.useEffect(() => {
    pushMarkers(safeMarkers);
  }, [safeMarkers, pushMarkers]);

  const handleMessage = useCallback(
    (event) => {
      let data = null;

      try {
        data = JSON.parse(event?.nativeEvent?.data || '{}');
      } catch {
        return;
      }

      if (data?.type === 'ready') {
        readyRef.current = true;
        pushMarkers(safeMarkers);
        return;
      }

      if (data?.type === 'pick' && typeof onPickLocation === 'function') {
        onPickLocation({
          latitude: data.latitude,
          longitude: data.longitude,
        });
      }
    },
    [onPickLocation, pushMarkers, safeMarkers]
  );

  return (
    <View style={[styles.container, { height }, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        style={styles.webview}
        containerStyle={styles.webview}
        androidLayerType="hardware"
        setBuiltInZoomControls={false}
        overScrollMode="never"
        bounces={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },

  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default AppMap;
