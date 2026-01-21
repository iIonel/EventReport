import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  IconButton,
  Grid,
} from '@mui/material'
import { CloudUpload, Close, Send, LocationOn } from '@mui/icons-material'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { eventsApi, ALERT_COLORS, ALERT_LABELS } from '../api'

// Fix leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const LocationPicker: React.FC<{ position: [number, number]; setPosition: (pos: [number, number]) => void }> = ({
  position,
  setPosition,
}) => {
  useMapEvents({
    click: (e) => {
      setPosition([e.latlng.lat, e.latlng.lng])
    },
  })

  return <Marker position={position} draggable />
}

const ReportPage: React.FC = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [position, setPosition] = useState<[number, number]>([44.4268, 26.1025])
  const [address, setAddress] = useState('')
  const [alertCode, setAlertCode] = useState('YELLOW')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onload = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      setError('Description is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const eventData = {
        location: {
          type: 'Point',
          coordinates: [position[1], position[0]] as [number, number],
          address: address || undefined,
        },
        alert_code: alertCode,
        description,
        tags,
      }

      const event = await eventsApi.create(eventData)

      if (image) {
        await eventsApi.uploadImage(event.id, image)
      }

      setSuccess(true)
      setTimeout(() => navigate('/'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error submitting report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Report an Incident
      </Typography>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOn color="primary" /> 1. Select Location
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Click on the map to select the incident location
                </Typography>
                <Box sx={{ height: 300, borderRadius: 2, overflow: 'hidden' }}>
                  <MapContainer center={position} zoom={13} style={{ height: '100%' }}>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap'
                    />
                    <LocationPicker position={position} setPosition={setPosition} />
                  </MapContainer>
                </Box>
                <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                  Coordinates: {position[0].toFixed(6)}, {position[1].toFixed(6)}
                </Typography>
                <TextField
                  fullWidth
                  label="Address (optional)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  size="small"
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  4. Add Image (optional)
                </Typography>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                />
                {imagePreview ? (
                  <Box sx={{ position: 'relative' }}>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }}
                    />
                    <IconButton
                      sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)' }}
                      onClick={() => {
                        setImage(null)
                        setImagePreview(null)
                      }}
                    >
                      <Close sx={{ color: 'white' }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<CloudUpload />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ py: 3 }}
                  >
                    Select Image
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  2. Alert Level
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Select level</InputLabel>
                  <Select value={alertCode} label="Select level" onChange={(e) => setAlertCode(e.target.value)}>
                    {Object.entries(ALERT_LABELS).map(([code, label]) => (
                      <MenuItem key={code} value={code}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              bgcolor: ALERT_COLORS[code],
                            }}
                          />
                          {label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  3. Description and Tags
                </Typography>
                <TextField
                  fullWidth
                  label="Incident description *"
                  multiline
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    size="small"
                    label="Add tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    sx={{ flex: 1 }}
                  />
                  <Button variant="outlined" onClick={addTag}>
                    +
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {tags.map((tag) => (
                    <Chip key={tag} label={tag} onDelete={() => removeTag(tag)} size="small" />
                  ))}
                </Box>
              </CardContent>
            </Card>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>Report submitted successfully!</Alert>}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              startIcon={<Send />}
              disabled={loading}
              sx={{ py: 2 }}
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Box>
  )
}

export default ReportPage
