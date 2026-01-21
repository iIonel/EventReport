import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip, ActivityIndicator, Button } from 'react-native-paper';
import * as Location from 'expo-location';
import OpenStreetMap from '../components/OpenStreetMap';
import { eventsApi, Event } from '../api/client';

const MapScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapCenter, setMapCenter] = useState({
    latitude: 44.4268,
    longitude: 26.1025,
  });

  useEffect(() => {
    loadEvents();
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(newLocation);
      setMapCenter(newLocation);
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await eventsApi.getAll();
      setEvents(data);
    } catch (error) {
      console.error('Failed to load events:', error);
      setError('Failed to load events. Tap retry to try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={loadEvents} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  const markers = events.map((event) => ({
    id: event.id,
    latitude: event.location.coordinates[1],
    longitude: event.location.coordinates[0],
    color: event.alert_code,
    title: event.alert_code,
    description: event.description.substring(0, 100) + (event.description.length > 100 ? '...' : ''),
  }));

  return (
    <View style={styles.container}>
      <OpenStreetMap
        latitude={mapCenter.latitude}
        longitude={mapCenter.longitude}
        zoom={12}
        markers={markers}
        showUserLocation={true}
        style={styles.map}
      />

      {/* Floating buttons */}
      <View style={styles.floatingButtons}>
        <Button
          mode="contained"
          onPress={loadEvents}
          icon="refresh"
          style={styles.floatingButton}
          compact
        >
          Refresh
        </Button>
      </View>

      {/* Events count */}
      <View style={styles.eventsCount}>
        <Chip icon="map-marker">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </Chip>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  floatingButtons: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  floatingButton: {
    marginBottom: 8,
  },
  eventsCount: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
});

export default MapScreen;
