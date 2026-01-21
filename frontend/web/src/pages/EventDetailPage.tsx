import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Button,
  Grid,
  Divider,
  Paper,
  Modal,
  IconButton,
} from '@mui/material'
import { ArrowBack, LocationOn, AccessTime, Label, PhotoCamera, Map as MapIcon, Close, ZoomIn } from '@mui/icons-material'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { eventsApi, Event, ALERT_COLORS, ALERT_LABELS } from '../api'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
      ">
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 4px solid white;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute;
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
        "></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  })
}

const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [imageModalOpen, setImageModalOpen] = useState(false)

  useEffect(() => {
    if (id) fetchEvent()
  }, [id])

  const fetchEvent = async () => {
    try {
      const data = await eventsApi.getById(id!)
      setEvent(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={48} />
      </Box>
    )
  }

  if (!event) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <MapIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
        <Typography variant="h5" color="text.secondary" gutterBottom>Event not found</Typography>
        <Button variant="contained" onClick={() => navigate('/')} startIcon={<ArrowBack />} sx={{ mt: 2 }}>
          Back to map
        </Button>
      </Box>
    )
  }

  const imageUrl = event.image_id ? eventsApi.getImageUrl(event.id) : null

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 4 }}>
      <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/')}
          sx={{ color: 'text.secondary', '&:hover': { bgcolor: '#e2e8f0' } }}
        >
          Back to map
        </Button>
      </Box>

      <Box sx={{ px: { xs: 0, md: 3 } }}>
        {imageUrl && !imageError ? (
          <Card
            sx={{
              borderRadius: { xs: 0, md: 3 },
              overflow: 'hidden',
              mb: 3,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                '& .zoom-overlay': {
                  opacity: 1,
                },
              },
            }}
            onClick={() => setImageModalOpen(true)}
          >
            <Box sx={{ position: 'relative' }}>
              <img
                src={imageUrl}
                alt="Event image"
                style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }}
                onError={() => setImageError(true)}
              />
              <Box
                className="zoom-overlay"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                }}
              >
                <Box sx={{ bgcolor: 'white', borderRadius: '50%', p: 2 }}>
                  <ZoomIn sx={{ fontSize: 32, color: '#1e293b' }} />
                </Box>
              </Box>
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  display: 'flex',
                  gap: 1,
                }}
              >
                <Chip
                  label={ALERT_LABELS[event.alert_code]}
                  sx={{ bgcolor: ALERT_COLORS[event.alert_code], color: 'white', fontWeight: 'bold', fontSize: 13 }}
                />
                <Chip
                  icon={<PhotoCamera sx={{ color: 'white !important' }} />}
                  label="Click to zoom"
                  sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: 'white' }}
                />
              </Box>
            </Box>
          </Card>
        ) : (
          <Paper
            elevation={0}
            sx={{
              borderRadius: { xs: 0, md: 3 },
              mb: 3,
              p: 3,
              background: `linear-gradient(135deg, ${ALERT_COLORS[event.alert_code]} 0%, #667eea 100%)`,
              color: 'white',
            }}
          >
            <Chip
              label={ALERT_LABELS[event.alert_code]}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold', fontSize: 13, mb: 2 }}
            />
            <Typography variant="h5" fontWeight="bold">Reported Incident</Typography>
          </Paper>
        )}

        <Modal
          open={imageModalOpen}
          onClose={() => setImageModalOpen(false)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              maxWidth: '95vw',
              maxHeight: '95vh',
              outline: 'none',
            }}
          >
            <IconButton
              onClick={() => setImageModalOpen(false)}
              sx={{
                position: 'absolute',
                top: -48,
                right: 0,
                bgcolor: 'white',
                '&:hover': { bgcolor: '#f1f5f9' },
                boxShadow: 2,
              }}
            >
              <Close />
            </IconButton>
            <img
              src={imageUrl || ''}
              alt="Event image full"
              style={{
                maxWidth: '95vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              }}
            />
          </Box>
        </Modal>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ borderRadius: { xs: 0, md: 3 }, mb: 3 }}>
              <CardContent sx={{ p: { xs: 2, md: 4 } }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: '#1e293b' }}>
                  Description
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body1" sx={{ lineHeight: 1.8, color: '#475569', fontSize: { xs: 15, md: 16 } }}>
                  {event.description}
                </Typography>

                {event.tags.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Label fontSize="small" /> Tags
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {event.tags.map((tag) => (
                        <Chip key={tag} label={`#${tag}`} size="small" sx={{ bgcolor: '#f1f5f9', fontWeight: 500 }} />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card sx={{ borderRadius: { xs: 0, md: 3 }, mb: 3 }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Information</Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                  <Box sx={{ p: 1.5, bgcolor: '#f1f5f9', borderRadius: 2 }}>
                    <AccessTime sx={{ color: '#6366f1' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Reported Date</Typography>
                    <Typography variant="body2" fontWeight="500">{formatDate(event.reported_at)}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                  <Box sx={{ p: 1.5, bgcolor: '#f1f5f9', borderRadius: 2 }}>
                    <LocationOn sx={{ color: '#6366f1' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Location</Typography>
                    <Typography variant="body2" fontWeight="500">
                      {event.location.address || `${event.location.coordinates[1].toFixed(6)}, ${event.location.coordinates[0].toFixed(6)}`}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{ p: 1.5, bgcolor: ALERT_COLORS[event.alert_code], borderRadius: 2 }}>
                    <MapIcon sx={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Alert Level</Typography>
                    <Typography variant="body2" fontWeight="500">{ALERT_LABELS[event.alert_code]}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: { xs: 0, md: 3 }, overflow: 'hidden' }}>
              <Box sx={{ height: { xs: 250, md: 300 } }}>
                <MapContainer
                  center={[event.location.coordinates[1], event.location.coordinates[0]]}
                  zoom={15}
                  style={{ height: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                  <Marker
                    position={[event.location.coordinates[1], event.location.coordinates[0]]}
                    icon={createCustomIcon(ALERT_COLORS[event.alert_code])}
                  >
                    <Popup>
                      <Typography variant="body2" fontWeight="500">Incident Location</Typography>
                    </Popup>
                  </Marker>
                </MapContainer>
              </Box>
              <CardContent sx={{ bgcolor: '#f8fafc', py: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationOn fontSize="small" />
                  {event.location.coordinates[1].toFixed(6)}, {event.location.coordinates[0].toFixed(6)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default EventDetailPage
