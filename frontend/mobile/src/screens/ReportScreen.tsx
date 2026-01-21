import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Modal } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  SegmentedButtons,
  Chip,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import OpenStreetMap from '../components/OpenStreetMap';
import { eventsApi } from '../api/client';

const ALERT_OPTIONS = [
  { value: 'GREEN', label: 'Green' },
  { value: 'YELLOW', label: 'Yellow' },
  { value: 'ORANGE', label: 'Orange' },
  { value: 'RED', label: 'Red' },
];

interface SelectedLocation {
  latitude: number;
  longitude: number;
}

const ReportScreen: React.FC = () => {
  const [description, setDescription] = useState('');
  const [alertCode, setAlertCode] = useState('YELLOW');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState({
    latitude: 44.4268,
    longitude: 26.1025,
  });

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is needed to report events');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setSelectedLocation(newLocation);
      setMapCenter(newLocation);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your current location');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleMapPress = (latitude: number, longitude: number) => {
    setSelectedLocation({ latitude, longitude });
  };

  const confirmLocation = () => {
    if (selectedLocation) {
      setShowMapPicker(false);
    } else {
      Alert.alert('Error', 'Please tap on the map to select a location');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Description is required');
      return;
    }

    if (!selectedLocation) {
      Alert.alert('Error', 'Please select a location for the event');
      return;
    }

    setLoading(true);
    try {
      const event = await eventsApi.create({
        location: {
          type: 'Point',
          coordinates: [selectedLocation.longitude, selectedLocation.latitude],
        },
        alert_code: alertCode as 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED',
        description,
        tags,
      });

      if (image) {
        await eventsApi.uploadImage(event.id, image);
      }

      Alert.alert('Success', 'Event reported successfully!');
      setDescription('');
      setTags([]);
      setImage(null);
      setAlertCode('YELLOW');
    } catch (error) {
      Alert.alert('Error', 'Failed to report event');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Location Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Location
          </Text>

          {loadingLocation ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" />
              <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
          ) : selectedLocation ? (
            <View>
              <View style={styles.miniMapContainer}>
                <OpenStreetMap
                  latitude={selectedLocation.latitude}
                  longitude={selectedLocation.longitude}
                  zoom={15}
                  selectedMarker={selectedLocation}
                />
              </View>
              <Text style={styles.coordsText}>
                {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
              </Text>
              <View style={styles.locationButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setShowMapPicker(true)}
                  icon="map-marker"
                  style={styles.locationButton}
                >
                  Change Location
                </Button>
                <Button
                  mode="text"
                  onPress={getCurrentLocation}
                  icon="crosshairs-gps"
                >
                  Use Current
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.locationButtons}>
              <Button
                mode="contained"
                onPress={() => setShowMapPicker(true)}
                icon="map-marker"
              >
                Select on Map
              </Button>
              <Button
                mode="outlined"
                onPress={getCurrentLocation}
                icon="crosshairs-gps"
              >
                Use Current Location
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Map Picker Modal */}
      <Modal visible={showMapPicker} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={styles.modalTitle}>Select Location</Text>
            <Text variant="bodySmall" style={styles.modalSubtitle}>
              Tap on the map to select event location
            </Text>
          </View>

          <View style={styles.fullMapContainer}>
            <OpenStreetMap
              latitude={selectedLocation?.latitude || mapCenter.latitude}
              longitude={selectedLocation?.longitude || mapCenter.longitude}
              zoom={14}
              onMapPress={handleMapPress}
              selectedMarker={selectedLocation}
            />
          </View>

          <View style={styles.modalFooter}>
            <Button
              mode="outlined"
              onPress={() => setShowMapPicker(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={confirmLocation}
              style={styles.modalButton}
              disabled={!selectedLocation}
            >
              Confirm Location
            </Button>
          </View>
        </View>
      </Modal>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Alert Level
          </Text>
          <SegmentedButtons
            value={alertCode}
            onValueChange={setAlertCode}
            buttons={ALERT_OPTIONS}
            style={styles.segmented}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Description
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Describe the incident..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Tags
          </Text>
          <View style={styles.tagInputRow}>
            <TextInput
              mode="outlined"
              placeholder="Add tag"
              value={tagInput}
              onChangeText={setTagInput}
              style={styles.tagInput}
              onSubmitEditing={addTag}
            />
            <Button mode="contained" onPress={addTag}>
              Add
            </Button>
          </View>
          <View style={styles.tagsContainer}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                onClose={() => removeTag(tag)}
                style={styles.tag}
              >
                {tag}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Photo (Optional)
          </Text>
          {image ? (
            <View>
              <Image source={{ uri: image }} style={styles.imagePreview} />
              <Button onPress={() => setImage(null)}>Remove</Button>
            </View>
          ) : (
            <Button mode="outlined" onPress={pickImage} icon="camera">
              Select Image
            </Button>
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading || !selectedLocation}
        style={styles.submitButton}
        icon="send"
      >
        Submit Report
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'white',
  },
  segmented: {
    marginTop: 8,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: 'white',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  tag: {
    marginRight: 4,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  submitButton: {
    marginBottom: 32,
    paddingVertical: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#666',
  },
  miniMapContainer: {
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  coordsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  locationButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  locationButton: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#6200EE',
  },
  modalTitle: {
    color: 'white',
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  fullMapContainer: {
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    flex: 1,
  },
});

export default ReportScreen;
