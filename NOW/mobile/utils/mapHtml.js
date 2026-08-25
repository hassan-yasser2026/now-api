/**
 * Builds a self-contained Leaflet (OpenStreetMap) HTML document.
 *
 * The same document powers the native map (react-native-webview) and the web
 * map (iframe srcDoc). No API key required.
 *
 * Marker: { lat, lng, label?, color? ('primary'|'success'|'blue') }
 * In picker mode a tap moves the pin and posts { type: 'pick', lat, lng }.
 */

const MARKER_COLORS = {
  primary: '#EC4899',
  success: '#16A34A',
  blue: '#2563EB',
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const DEFAULT_CENTER = { lat: 30.0444, lng: 31.2357 }; // Cairo

export const buildMapHtml = ({
  markers = [],
  center,
  zoom = 14,
  picker = false,
  pickerLabel = '',
} = {}) => {
  const safeMarkers = markers
    .filter(
      (marker) =>
        Number.isFinite(Number(marker?.lat)) &&
        Number.isFinite(Number(marker?.lng))
    )
    .map((marker) => ({
      lat: Number(marker.lat),
      lng: Number(marker.lng),
      label: escapeHtml(marker.label || ''),
      color: MARKER_COLORS[marker.color] || MARKER_COLORS.primary,
    }));

  const mapCenter =
    center && Number.isFinite(Number(center.lat))
      ? { lat: Number(center.lat), lng: Number(center.lng) }
      : safeMarkers[0] || DEFAULT_CENTER;

  const config = JSON.stringify({
    markers: safeMarkers,
    center: mapCenter,
    zoom,
    picker,
    pickerLabel: escapeHtml(pickerLabel),
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
  .now-pin {
    width: 26px; height: 26px; border-radius: 13px 13px 13px 0;
    transform: rotate(-45deg); border: 3px solid #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,.35);
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var cfg = ${config};

  var map = L.map('map', { zoomControl: true, attributionControl: true })
    .setView([cfg.center.lat, cfg.center.lng], cfg.zoom);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  function pinIcon(color) {
    return L.divIcon({
      className: '',
      html: '<div class="now-pin" style="background:' + color + '"></div>',
      iconSize: [26, 26],
      iconAnchor: [4, 26]
    });
  }

  var bounds = [];
  cfg.markers.forEach(function (m) {
    var marker = L.marker([m.lat, m.lng], { icon: pinIcon(m.color) }).addTo(map);
    if (m.label) marker.bindPopup(m.label);
    bounds.push([m.lat, m.lng]);
  });

  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  function post(payload) {
    var json = JSON.stringify(payload);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(json);
    } else if (window.parent !== window) {
      window.parent.postMessage(json, '*');
    }
  }

  if (cfg.picker) {
    var picked = cfg.markers.length
      ? L.marker([cfg.markers[0].lat, cfg.markers[0].lng], {
          icon: pinIcon('${MARKER_COLORS.primary}'),
          draggable: true
        }).addTo(map)
      : null;

    function report(latlng) {
      post({ type: 'pick', lat: latlng.lat, lng: latlng.lng });
    }

    map.on('click', function (e) {
      if (!picked) {
        picked = L.marker(e.latlng, {
          icon: pinIcon('${MARKER_COLORS.primary}'),
          draggable: true
        }).addTo(map);
        picked.on('dragend', function () { report(picked.getLatLng()); });
      } else {
        picked.setLatLng(e.latlng);
      }
      report(e.latlng);
    });

    if (picked) {
      picked.on('dragend', function () { report(picked.getLatLng()); });
    }

    // The app can re-center the picker (e.g. "use my location").
    window.addEventListener('message', function (event) {
      try {
        var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'setPick') {
          var latlng = L.latLng(data.lat, data.lng);
          if (!picked) {
            picked = L.marker(latlng, {
              icon: pinIcon('${MARKER_COLORS.primary}'),
              draggable: true
            }).addTo(map);
            picked.on('dragend', function () { report(picked.getLatLng()); });
          } else {
            picked.setLatLng(latlng);
          }
          map.setView(latlng, Math.max(map.getZoom(), 15));
          report(latlng);
        }
      } catch (e) {}
    });
  }

  post({ type: 'ready' });
</script>
</body>
</html>`;
};

export default buildMapHtml;
