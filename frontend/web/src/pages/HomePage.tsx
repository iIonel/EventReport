import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Paper,
  Fade,
  Grid,
  useMediaQuery,
  useTheme,
  TextField,
  InputAdornment,
} from '@mui/material'
import {
  Refresh,
  AccessTime,
  Warning,
  PhotoCamera,
  Place,
  Search,
  Map as MapIcon,
  GridView,
  Today,
  CalendarMonth,
} from '@mui/icons-material'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { eventsApi, Event, ALERT_COLORS, ALERT_LABELS, createEventsWebSocket } from '../api'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const createCustomIcon = (color: string, isUrgent: boolean = false) => {
  const size = isUrgent ? 36 : 30
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
      ">
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 3px 12px rgba(0,0,0,0.4);
          ${isUrgent ? 'animation: pulse 1.5s infinite;' : ''}
        "></div>
        <div style="
          position: absolute;
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1) rotate(-45deg); }
          50% { transform: scale(1.15) rotate(-45deg); }
        }
      </style>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

const MapEvents: React.FC<{ events: Event[] }> = ({ events }) => {
  const map = useMap()

  useEffect(() => {
    if (events.length > 0) {
      const bounds = L.latLngBounds(events.map((e) => [e.location.coordinates[1], e.location.coordinates[0]]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
    }
  }, [events, map])

  return null
}

const isEventFromToday = (event: Event): boolean => {
  const eventDate = new Date(event.reported_at)
  const today = new Date()
  return (
    eventDate.getFullYear() === today.getFullYear() &&
    eventDate.getMonth() === today.getMonth() &&
    eventDate.getDate() === today.getDate()
  )
}

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [alertFilter, setAlertFilter] = useState('RED')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map')
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today')

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (alertFilter) params.alert_code = alertFilter
      const data = await eventsApi.getAll(params)
      setEvents(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [alertFilter])

  useEffect(() => {
    const ws = createEventsWebSocket((newEvent: Event) => {
      setEvents((prevEvents) => [newEvent, ...prevEvents])
    })

    return () => {
      ws.close()
    }
  }, [])

  const searchFilteredEvents = events.filter(e =>
    searchQuery === '' ||
    e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const mapEvents = searchFilteredEvents.filter(e =>
    dateFilter === 'all' || isEventFromToday(e)
  )

  const filteredEvents = searchFilteredEvents

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getAlertStats = (evts: Event[]) => ({
    RED: evts.filter(e => e.alert_code === 'RED').length,
    ORANGE: evts.filter(e => e.alert_code === 'ORANGE').length,
    YELLOW: evts.filter(e => e.alert_code === 'YELLOW').length,
    GREEN: evts.filter(e => e.alert_code === 'GREEN').length,
  })

  const stats = getAlertStats(viewMode === 'map' ? mapEvents : filteredEvents)

  const EventCard: React.FC<{ event: Event; index: number }> = ({ event, index }) => (
    <Fade in={true} timeout={200 + index * 50}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 3,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          border: '1px solid #e2e8f0',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            borderColor: ALERT_COLORS[event.alert_code],
          },
        }}
        onClick={() => navigate(`/event/${event.id}`)}
      >
        <Box sx={{ height: 6, bgcolor: ALERT_COLORS[event.alert_code] }} />

        <Box sx={{ position: 'relative', height: 160 }}>
          {event.image_id ? (
            <CardMedia
              component="img"
              height="160"
              image={eventsApi.getImageUrl(event.id)}
              alt="Event"
              sx={{ objectFit: 'cover' }}
            />
          ) : (
            <Box
              sx={{
                height: '100%',
                bgcolor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <MapIcon sx={{ fontSize: 48, color: '#cbd5e1' }} />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  bgcolor: 'rgba(255,255,255,0.9)',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Place sx={{ fontSize: 14, color: '#6366f1' }} />
                <Typography variant="caption" color="text.secondary">
                  {event.location.coordinates[1].toFixed(4)}, {event.location.coordinates[0].toFixed(4)}
                </Typography>
              </Box>
            </Box>
          )}

          <Chip
            label={ALERT_LABELS[event.alert_code]}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              bgcolor: ALERT_COLORS[event.alert_code],
              color: 'white',
              fontWeight: 'bold',
              fontSize: 11,
            }}
          />

          {event.image_id && (
            <Chip
              icon={<PhotoCamera sx={{ fontSize: 14 }} />}
              label="Photo"
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'rgba(0,0,0,0.6)',
                color: 'white',
                fontSize: 11,
                '& .MuiChip-icon': { color: 'white' }
              }}
            />
          )}
        </Box>

        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 500,
              mb: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4,
            }}
          >
            {event.description}
          </Typography>

          <Box sx={{ mt: 'auto' }}>
            {event.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                {event.tags.slice(0, 3).map(tag => (
                  <Chip
                    key={tag}
                    label={`#${tag}`}
                    size="small"
                    sx={{ height: 22, fontSize: 11, bgcolor: '#f1f5f9' }}
                  />
                ))}
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
              <AccessTime sx={{ fontSize: 14 }} />
              <Typography variant="caption">{formatDate(event.reported_at)}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Fade>
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          mb: 3,
          borderRadius: { xs: 0, md: 3 },
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Place /> Incidents Map
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              {viewMode === 'map'
                ? (dateFilter === 'today'
                    ? `${mapEvents.length} today's incidents (${events.length} total)`
                    : `${mapEvents.length} incidents displayed`)
                : `${filteredEvents.length} incidents`
              }
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {stats.RED > 0 && (
              <Chip icon={<Warning sx={{ color: 'white !important' }} />} label={`${stats.RED} Urgent`} sx={{ bgcolor: ALERT_COLORS.RED, color: 'white', fontWeight: 'bold' }} />
            )}
            {stats.ORANGE > 0 && (
              <Chip label={`${stats.ORANGE} Danger`} sx={{ bgcolor: ALERT_COLORS.ORANGE, color: 'white' }} />
            )}
            {stats.YELLOW > 0 && (
              <Chip label={`${stats.YELLOW} Caution`} sx={{ bgcolor: ALERT_COLORS.YELLOW, color: 'white' }} />
            )}
            {stats.GREEN > 0 && (
              <Chip label={`${stats.GREEN} Info`} sx={{ bgcolor: ALERT_COLORS.GREEN, color: 'white' }} />
            )}
          </Box>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ mx: { xs: 0, md: 2 }, mb: 3, p: 2, borderRadius: { xs: 0, md: 2 }, bgcolor: 'white' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search color="action" /></InputAdornment>,
            }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Alert Level</InputLabel>
            <Select value={alertFilter} label="Alert Level" onChange={(e) => setAlertFilter(e.target.value)}>
              <MenuItem value="RED"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: ALERT_COLORS.RED }} />Red</Box></MenuItem>
              <MenuItem value="ORANGE"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: ALERT_COLORS.ORANGE }} />Orange</Box></MenuItem>
              <MenuItem value="YELLOW"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: ALERT_COLORS.YELLOW }} />Yellow</Box></MenuItem>
              <MenuItem value="GREEN"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: ALERT_COLORS.GREEN }} />Green</Box></MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 0.5, bgcolor: '#f1f5f9', borderRadius: 1, p: 0.5 }}>
            <Tooltip title="Today's events only">
              <IconButton
                size="small"
                onClick={() => setDateFilter('today')}
                sx={{
                  bgcolor: dateFilter === 'today' ? 'white' : 'transparent',
                  boxShadow: dateFilter === 'today' ? 1 : 0,
                  color: dateFilter === 'today' ? 'primary.main' : 'inherit'
                }}
              >
                <Today fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="All events">
              <IconButton
                size="small"
                onClick={() => setDateFilter('all')}
                sx={{
                  bgcolor: dateFilter === 'all' ? 'white' : 'transparent',
                  boxShadow: dateFilter === 'all' ? 1 : 0,
                  color: dateFilter === 'all' ? 'primary.main' : 'inherit'
                }}
              >
                <CalendarMonth fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.5, bgcolor: '#f1f5f9', borderRadius: 1, p: 0.5 }}>
            <IconButton size="small" onClick={() => setViewMode('map')} sx={{ bgcolor: viewMode === 'map' ? 'white' : 'transparent', boxShadow: viewMode === 'map' ? 1 : 0 }}>
              <MapIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setViewMode('grid')} sx={{ bgcolor: viewMode === 'grid' ? 'white' : 'transparent', boxShadow: viewMode === 'grid' ? 1 : 0 }}>
              <GridView fontSize="small" />
            </IconButton>
          </Box>

          <Tooltip title="Refresh">
            <IconButton onClick={fetchEvents} sx={{ bgcolor: '#f1f5f9' }}>
              <Refresh color="primary" />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
        </Box>
      ) : viewMode === 'map' ? (
        <Box sx={{ display: 'flex', gap: 3, px: { xs: 0, md: 2 }, flexDirection: { xs: 'column', lg: 'row' } }}>
          <Card sx={{ flex: 2, borderRadius: { xs: 0, md: 3 }, overflow: 'hidden', minHeight: { xs: 350, md: 500 } }}>
            <Box sx={{
              bgcolor: dateFilter === 'today' ? 'info.main' : 'grey.600',
              color: 'white',
              px: 2,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              {dateFilter === 'today' ? <Today fontSize="small" /> : <CalendarMonth fontSize="small" />}
              <Typography variant="body2">
                {dateFilter === 'today'
                  ? `Today's events: ${mapEvents.length} (out of ${events.length} total)`
                  : `All events: ${mapEvents.length}`
                }
              </Typography>
            </Box>
            <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ height: '100%', minHeight: isMobile ? 350 : 500 }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              {mapEvents.map((event) => (
                <Marker
                  key={event.id}
                  position={[event.location.coordinates[1], event.location.coordinates[0]]}
                  icon={createCustomIcon(ALERT_COLORS[event.alert_code], event.alert_code === 'RED')}
                  eventHandlers={{ click: () => navigate(`/event/${event.id}`) }}
                >
                  <Popup>
                    <Box sx={{ minWidth: 250 }}>
                      {event.image_id && (
                        <img src={eventsApi.getImageUrl(event.id)} alt="Event" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
                      )}
                      <Chip label={ALERT_LABELS[event.alert_code]} size="small" sx={{ bgcolor: ALERT_COLORS[event.alert_code], color: 'white', fontWeight: 'bold', mb: 1 }} />
                      <Typography variant="body2" sx={{ mb: 1 }}>{event.description.slice(0, 120)}...</Typography>
                      <Typography variant="caption" color="text.secondary">{formatDate(event.reported_at)}</Typography>
                    </Box>
                  </Popup>
                </Marker>
              ))}
              <MapEvents events={mapEvents} />
            </MapContainer>
          </Card>

          {!isMobile && (
            <Card sx={{ flex: 1, maxHeight: 500, overflow: 'hidden', borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                <Typography variant="h6" fontWeight="bold">
                  {dateFilter === 'today' ? "Today's Events" : 'All Events'}
                </Typography>
                <Typography variant="body2" color="text.secondary">{mapEvents.length} results</Typography>
              </Box>
              <Box sx={{ overflow: 'auto', flex: 1, p: 2 }}>
                {mapEvents.slice(0, 10).map((event) => (
                  <Card
                    key={event.id}
                    sx={{ mb: 2, cursor: 'pointer', borderRadius: 2, overflow: 'hidden', transition: 'all 0.2s', '&:hover': { transform: 'translateX(4px)', boxShadow: 2 } }}
                    onClick={() => navigate(`/event/${event.id}`)}
                  >
                    <Box sx={{ display: 'flex' }}>
                      <Box sx={{ width: 6, bgcolor: ALERT_COLORS[event.alert_code] }} />
                      {event.image_id && (
                        <CardMedia component="img" sx={{ width: 80, height: 80 }} image={eventsApi.getImageUrl(event.id)} alt="" />
                      )}
                      <CardContent sx={{ flex: 1, py: 1.5, px: 2 }}>
                        <Chip label={event.alert_code} size="small" sx={{ bgcolor: ALERT_COLORS[event.alert_code], color: 'white', height: 20, fontSize: 10, mb: 0.5 }} />
                        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>{event.description}</Typography>
                        <Typography variant="caption" color="text.secondary">{formatDate(event.reported_at)}</Typography>
                      </CardContent>
                    </Box>
                  </Card>
                ))}
              </Box>
            </Card>
          )}
        </Box>
      ) : (
        <Box sx={{ px: { xs: 2, md: 2 } }}>
          <Grid container spacing={3}>
            {filteredEvents.map((event, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={event.id}>
                <EventCard event={event} index={index} />
              </Grid>
            ))}
          </Grid>
          {filteredEvents.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <MapIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No incidents found</Typography>
              <Typography variant="body2" color="text.secondary">Try adjusting your filters</Typography>
            </Box>
          )}
        </Box>
      )}

      {isMobile && viewMode === 'map' && filteredEvents.length > 0 && (
        <Box sx={{ px: 2, mt: 3 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Recent Events</Typography>
          <Grid container spacing={2}>
            {filteredEvents.slice(0, 6).map((event, index) => (
              <Grid item xs={12} sm={6} key={event.id}>
                <EventCard event={event} index={index} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  )
}

export default HomePage
