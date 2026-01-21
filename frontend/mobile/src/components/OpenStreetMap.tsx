import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  color?: string;
  title?: string;
  description?: string;
}

interface OpenStreetMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  markers?: Marker[];
  onMapPress?: (latitude: number, longitude: number) => void;
  selectedMarker?: { latitude: number; longitude: number } | null;
  showUserLocation?: boolean;
  style?: object;
}

const OpenStreetMap: React.FC<OpenStreetMapProps> = ({
  latitude,
  longitude,
  zoom = 13,
  markers = [],
  onMapPress,
  selectedMarker,
  showUserLocation = false,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);

  const getMarkerColor = (color?: string) => {
    const colors: Record<string, string> = {
      GREEN: '#22c55e',
      YELLOW: '#eab308',
      ORANGE: '#f97316',
      RED: '#ef4444',
    };
    return colors[color || ''] || color || '#6200EE';
  };

  const markersJson = JSON.stringify(
    markers.map((m) => ({
      ...m,
      color: getMarkerColor(m.color),
    }))
  );

  const selectedMarkerJson = selectedMarker ? JSON.stringify(selectedMarker) : 'null';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; }
        html, body, #map { width: 100%; height: 100%; }
        .custom-marker {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        .selected-marker {
          width: 30px;
          height: 30px;
          background: #6200EE;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        .user-location {
          width: 16px;
          height: 16px;
          background: #4285F4;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 0 8px rgba(66, 133, 244, 0.2);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', {
          zoomControl: true,
          attributionControl: false
        }).setView([${latitude}, ${longitude}], ${zoom});

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        // Add markers
        const markers = ${markersJson};
        markers.forEach(marker => {
          const icon = L.divIcon({
            className: 'custom-marker-container',
            html: '<div class="custom-marker" style="background: ' + marker.color + '"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const m = L.marker([marker.latitude, marker.longitude], { icon }).addTo(map);

          if (marker.title || marker.description) {
            let popupContent = '';
            if (marker.title) popupContent += '<strong>' + marker.title + '</strong><br/>';
            if (marker.description) popupContent += marker.description;
            m.bindPopup(popupContent);
          }
        });

        // Add selected marker (for location picker)
        let selectedMarkerLayer = null;
        const selectedMarkerData = ${selectedMarkerJson};

        function updateSelectedMarker(lat, lng) {
          if (selectedMarkerLayer) {
            map.removeLayer(selectedMarkerLayer);
          }
          const icon = L.divIcon({
            className: 'selected-marker-container',
            html: '<div class="selected-marker"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });
          selectedMarkerLayer = L.marker([lat, lng], { icon }).addTo(map);
        }

        if (selectedMarkerData) {
          updateSelectedMarker(selectedMarkerData.latitude, selectedMarkerData.longitude);
        }

        // Handle map clicks
        map.on('click', function(e) {
          const { lat, lng } = e.latlng;
          updateSelectedMarker(lat, lng);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapPress',
            latitude: lat,
            longitude: lng
          }));
        });

        // Show user location
        ${showUserLocation ? `
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
              const userLat = position.coords.latitude;
              const userLng = position.coords.longitude;

              const userIcon = L.divIcon({
                className: 'user-location-container',
                html: '<div class="user-location"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
              });

              L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
            });
          }
        ` : ''}

        // Function to center map (called from React Native)
        window.centerMap = function(lat, lng, newZoom) {
          map.setView([lat, lng], newZoom || map.getZoom());
        };
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapPress' && onMapPress) {
        onMapPress(data.latitude, data.longitude);
      }
    } catch (e) {
      console.error('Error parsing map message:', e);
    }
  };

  const centerMap = (lat: number, lng: number, newZoom?: number) => {
    webViewRef.current?.injectJavaScript(`
      window.centerMap(${lat}, ${lng}, ${newZoom || 'null'});
      true;
    `);
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={showUserLocation}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
});

export default OpenStreetMap;
