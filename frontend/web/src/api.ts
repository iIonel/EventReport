import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const WS_URL = API_URL.replace('http', 'ws')

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  role: 'user' | 'admin'
}

export interface EventsByMonth {
  month: string
  count: number
}

export interface EventsByAlertCode {
  alert_code: string
  count: number
  percentage: number
}

export interface EventsByDay {
  day: string
  count: number
}

export interface EventsByHour {
  hour: number
  count: number
}

export interface TopTag {
  tag: string
  count: number
}

export interface AnalyticsData {
  total_events: number
  events_by_month: EventsByMonth[]
  events_by_alert_code: EventsByAlertCode[]
  events_by_day_of_week: EventsByDay[]
  events_by_hour: EventsByHour[]
  top_tags: TopTag[]
  avg_events_per_day: number
  trend_percentage: number
}

export interface Location {
  type: string
  coordinates: [number, number]
  address?: string
}

export interface Event {
  id: string
  location: Location
  alert_code: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED'
  description: string
  tags: string[]
  reporter_id: string
  image_id?: string
  reported_at: string
}

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    return res.data
  },
  register: async (data: { first_name: string; last_name: string; email: string; password: string; phone: string }) => {
    const res = await api.post('/auth/register', data)
    return res.data
  },
  getMe: async () => {
    const res = await api.get('/auth/me')
    return res.data
  },
}

export const eventsApi = {
  getAll: async (params?: Record<string, string>) => {
    const res = await api.get<Event[]>('/events', { params })
    return res.data
  },
  getAllForAnalytics: async (): Promise<Event[]> => {
    const allEvents: Event[] = []
    let skip = 0
    const limit = 100
    let hasMore = true

    while (hasMore) {
      const res = await api.get<Event[]>('/events', {
        params: { skip: skip.toString(), limit: limit.toString() }
      })
      allEvents.push(...res.data)
      if (res.data.length < limit) {
        hasMore = false
      } else {
        skip += limit
      }
    }
    return allEvents
  },
  getById: async (id: string) => {
    const res = await api.get<Event>(`/events/${id}`)
    return res.data
  },
  create: async (data: { location: Location; alert_code: string; description: string; tags: string[] }) => {
    const res = await api.post<Event>('/events', data)
    return res.data
  },
  uploadImage: async (eventId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post(`/events/${eventId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },
  getImageUrl: (eventId: string) => `${API_URL}/events/${eventId}/image`,
}

export const ALERT_COLORS: Record<string, string> = {
  GREEN: '#22c55e',
  YELLOW: '#eab308',
  ORANGE: '#f97316',
  RED: '#ef4444',
}

export const ALERT_LABELS: Record<string, string> = {
  GREEN: 'Green - Info',
  YELLOW: 'Yellow - Caution',
  ORANGE: 'Orange - Danger',
  RED: 'Red - Urgent',
}

export const createEventsWebSocket = (onNewEvent: (event: Event) => void) => {
  const ws = new WebSocket(`${WS_URL}/ws/events`)

  ws.onmessage = (message) => {
    try {
      const data = JSON.parse(message.data)
      if (data.type === 'new_event' && data.event) {
        onNewEvent(data.event)
      }
    } catch (e) {
      console.error('WebSocket message parse error:', e)
    }
  }

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }

  return ws
}

export const analyticsApi = {
  getAnalytics: async (): Promise<AnalyticsData> => {
    const res = await api.get<AnalyticsData>('/analytics')
    return res.data
  },

  getTimeSeries: async (startDate: string, endDate: string) => {
    const res = await api.get('/analytics/timeseries', {
      params: { start_date: startDate, end_date: endDate }
    })
    return res.data
  },
}
