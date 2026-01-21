import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Image,
  Pressable,
} from 'react-native';
import {
  Card,
  Text,
  Chip,
  useTheme,
  ActivityIndicator,
  Searchbar,
  SegmentedButtons,
  IconButton,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { eventsApi, Event } from '../api/client';
import { ALERT_COLORS, ALERT_LABELS, AlertCode } from '../theme';
import { useAuth } from '../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const EventsListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const { logout } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAlert, setFilterAlert] = useState<string>('all');

  const fetchEvents = useCallback(async () => {
    try {
      const alertFilter = filterAlert !== 'all' ? filterAlert : undefined;
      const data = await eventsApi.getAll(alertFilter);
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterAlert]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = events.filter((event) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        event.description.toLowerCase().includes(query) ||
        event.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderEventCard = ({ item }: { item: Event }) => (
    <Pressable
      onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
    >
      <Card style={styles.card} mode="elevated">
        {item.image_id && (
          <Card.Cover
            source={{ uri: eventsApi.getImageUrl(item.id) }}
            style={styles.cardImage}
          />
        )}
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Chip
              style={[
                styles.alertChip,
                { backgroundColor: ALERT_COLORS[item.alert_code as AlertCode] },
              ]}
              textStyle={styles.alertChipText}
            >
              {ALERT_LABELS[item.alert_code as AlertCode]}
            </Chip>
            {item.image_id && (
              <Text style={styles.photoIndicator}>📷</Text>
            )}
          </View>

          <Text variant="bodyLarge" numberOfLines={3} style={styles.description}>
            {item.description}
          </Text>

          <View style={styles.tags}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <Chip
                key={index}
                style={styles.tag}
                textStyle={styles.tagText}
                compact
              >
                #{tag}
              </Chip>
            ))}
            {item.tags.length > 3 && (
              <Text style={styles.moreTags}>+{item.tags.length - 3}</Text>
            )}
          </View>

          <View style={styles.cardFooter}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              📍 {item.location.coordinates[1].toFixed(4)}, {item.location.coordinates[0].toFixed(4)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              🕐 {formatDate(item.reported_at)}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Searchbar
            placeholder="Search events..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
          <IconButton
            icon="logout"
            mode="contained"
            onPress={logout}
            style={styles.logoutButton}
          />
        </View>

        <SegmentedButtons
          value={filterAlert}
          onValueChange={setFilterAlert}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'RED', label: 'Red' },
            { value: 'ORANGE', label: 'Orange' },
            { value: 'YELLOW', label: 'Yellow' },
            { value: 'GREEN', label: 'Green' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <FlatList
        data={filteredEvents}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              No events found
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchbar: {
    flex: 1,
  },
  logoutButton: {
    margin: 0,
  },
  segmentedButtons: {
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    gap: 16,
  },
  card: {
    marginBottom: 0,
  },
  cardImage: {
    height: 180,
  },
  cardContent: {
    paddingTop: 12,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertChip: {
    alignSelf: 'flex-start',
  },
  alertChipText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  photoIndicator: {
    fontSize: 16,
  },
  description: {
    lineHeight: 22,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#E8DEF8',
    height: 28,
  },
  tagText: {
    fontSize: 12,
  },
  moreTags: {
    fontSize: 12,
    color: '#666',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
});

export default EventsListScreen;
