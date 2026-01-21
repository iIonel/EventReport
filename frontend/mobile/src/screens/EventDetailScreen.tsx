import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
import { Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { RouteProp, useRoute } from '@react-navigation/native';
import { eventsApi, Event } from '../api/client';
import { RootStackParamList } from '../navigation/AppNavigator';

const ALERT_COLORS: Record<string, string> = {
  GREEN: '#22c55e',
  YELLOW: '#eab308',
  ORANGE: '#f97316',
  RED: '#ef4444',
};

const ALERT_LABELS: Record<string, string> = {
  GREEN: 'Green - Info',
  YELLOW: 'Yellow - Caution',
  ORANGE: 'Orange - Danger',
  RED: 'Red - Urgent',
};

type EventDetailRouteProp = RouteProp<RootStackParamList, 'EventDetail'>;

const EventDetailScreen: React.FC = () => {
  const route = useRoute<EventDetailRouteProp>();
  const { eventId } = route.params;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const data = await eventsApi.getById(eventId);
      setEvent(data);
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centered}>
        <Text>Event not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {event.image_id && (
        <Image
          source={{ uri: eventsApi.getImageUrl(event.id) }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      <View style={styles.content}>
        <Chip
          style={[styles.alertChip, { backgroundColor: ALERT_COLORS[event.alert_code] }]}
          textStyle={{ color: 'white', fontWeight: 'bold' }}
        >
          {ALERT_LABELS[event.alert_code]}
        </Chip>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.label}>Description</Text>
            <Text variant="bodyLarge">{event.description}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.label}>Location</Text>
            <Text variant="bodyMedium">
              Lat: {event.location.coordinates[1].toFixed(6)}
            </Text>
            <Text variant="bodyMedium">
              Long: {event.location.coordinates[0].toFixed(6)}
            </Text>
          </Card.Content>
        </Card>

        {event.tags.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.label}>Tags</Text>
              <View style={styles.tagsContainer}>
                {event.tags.map((tag) => (
                  <Chip key={tag} style={styles.tag}>
                    #{tag}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.label}>Reported At</Text>
            <Text variant="bodyMedium">
              {new Date(event.reported_at).toLocaleString()}
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: Dimensions.get('window').width,
    height: 250,
  },
  content: {
    padding: 16,
  },
  alertChip: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    marginRight: 4,
  },
});

export default EventDetailScreen;
