import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Button,
  Tooltip,
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  Event as EventIcon,
  Timeline,
  PieChart as PieChartIcon,
  Speed,
  Analytics,
  Refresh,
  Storage,
} from '@mui/icons-material'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import { eventsApi, Event, ALERT_COLORS } from '../api'

const processEventsByMonth = (events: Event[]) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthCounts: Record<string, number> = {}

  monthNames.forEach(m => monthCounts[m] = 0)

  events.forEach(event => {
    const date = new Date(event.reported_at)
    const month = monthNames[date.getMonth()]
    monthCounts[month] = (monthCounts[month] || 0) + 1
  })

  return monthNames.map(month => ({
    month,
    count: monthCounts[month],
  }))
}

const processEventsByAlertCode = (events: Event[]) => {
  const alertCounts: Record<string, number> = { GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0 }

  events.forEach(event => {
    alertCounts[event.alert_code] = (alertCounts[event.alert_code] || 0) + 1
  })

  const total = events.length || 1
  return Object.entries(alertCounts).map(([code, count]) => ({
    name: code,
    value: count,
    percentage: ((count / total) * 100).toFixed(1),
    fill: ALERT_COLORS[code],
  }))
}

const processEventsByDayOfWeek = (events: Event[]) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0]

  events.forEach(event => {
    const date = new Date(event.reported_at)
    dayCounts[date.getDay()]++
  })

  return dayNames.map((day, idx) => ({
    day,
    count: dayCounts[idx],
  }))
}

const processEventsByHour = (events: Event[]) => {
  const hourCounts: number[] = new Array(24).fill(0)

  events.forEach(event => {
    const date = new Date(event.reported_at)
    hourCounts[date.getHours()]++
  })

  return hourCounts.map((count, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    count,
  }))
}

const processTopTags = (events: Event[]) => {
  const tagCounts: Record<string, number> = {}

  events.forEach(event => {
    event.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
  })

  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }))
}

const processEventsTrend = (events: Event[]) => {
  const dateGroups: Record<string, number> = {}

  events.forEach(event => {
    const date = new Date(event.reported_at).toISOString().split('T')[0]
    dateGroups[date] = (dateGroups[date] || 0) + 1
  })

  return Object.entries(dateGroups)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
      count,
    }))
}

const calculateStatistics = (events: Event[]) => {
  if (events.length === 0) {
    return { total: 0, avgPerDay: 0, trend: 0, urgentPercent: 0 }
  }

  const dates = events.map(e => new Date(e.reported_at).getTime())
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  const daysDiff = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)))

  const lastWeek = events.filter(e => {
    const date = new Date(e.reported_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return date >= weekAgo
  }).length

  const prevWeek = events.filter(e => {
    const date = new Date(e.reported_at)
    const weekAgo = new Date()
    const twoWeeksAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    return date >= twoWeeksAgo && date < weekAgo
  }).length

  const trend = prevWeek > 0 ? ((lastWeek - prevWeek) / prevWeek) * 100 : 0
  const urgentCount = events.filter(e => e.alert_code === 'RED' || e.alert_code === 'ORANGE').length

  return {
    total: events.length,
    avgPerDay: (events.length / daysDiff).toFixed(1),
    trend: trend.toFixed(1),
    urgentPercent: ((urgentCount / events.length) * 100).toFixed(1),
  }
}

const AnalyticsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('all')

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await eventsApi.getAllForAnalytics()
      console.log(`[Analytics] Loaded ${data.length} events from backend`)
      setEvents(data)
    } catch (err) {
      console.error('[Analytics] Error loading events:', err)
      setError('Could not load data from server')
    } finally {
      setLoading(false)
    }
  }

  const displayEvents = useMemo(() => {
    let evts = events

    if (timeRange !== 'all') {
      const daysMap = { '7d': 7, '30d': 30, '90d': 90 }
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - daysMap[timeRange])
      evts = evts.filter(e => new Date(e.reported_at) >= cutoff)
    }

    return evts
  }, [events, timeRange])

  const eventsByMonth = useMemo(() => processEventsByMonth(displayEvents), [displayEvents])
  const eventsByAlertCode = useMemo(() => processEventsByAlertCode(displayEvents), [displayEvents])
  const eventsByDay = useMemo(() => processEventsByDayOfWeek(displayEvents), [displayEvents])
  const eventsByHour = useMemo(() => processEventsByHour(displayEvents), [displayEvents])
  const topTags = useMemo(() => processTopTags(displayEvents), [displayEvents])
  const eventsTrend = useMemo(() => processEventsTrend(displayEvents), [displayEvents])
  const stats = useMemo(() => calculateStatistics(displayEvents), [displayEvents])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Analytics sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Analytics Dashboard
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={(_, v) => v && setTimeRange(v)}
            size="small"
          >
            <ToggleButton value="7d">7 Days</ToggleButton>
            <ToggleButton value="30d">30 Days</ToggleButton>
            <ToggleButton value="90d">90 Days</ToggleButton>
            <ToggleButton value="all">All</ToggleButton>
          </ToggleButtonGroup>

          <Tooltip title="Reload data from database">
            <Button
              variant="outlined"
              size="small"
              startIcon={<Refresh />}
              onClick={loadEvents}
              disabled={loading}
            >
              Refresh
            </Button>
          </Tooltip>

          {events.length > 0 && (
            <Chip
              icon={<Storage />}
              label={`${events.length} events`}
              color="success"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {events.length === 0 && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No events in database. You can add events from the "Report" page.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.9 }}>Total Events</Typography>
                  <Typography variant="h3" fontWeight={700}>{stats.total}</Typography>
                </Box>
                <EventIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.9 }}>Avg/Day</Typography>
                  <Typography variant="h3" fontWeight={700}>{stats.avgPerDay}</Typography>
                </Box>
                <Speed sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.9 }}>Urgent</Typography>
                  <Typography variant="h3" fontWeight={700}>{stats.urgentPercent}%</Typography>
                </Box>
                <PieChartIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.9 }}>Weekly Trend</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h3" fontWeight={700}>{Math.abs(Number(stats.trend))}%</Typography>
                    {Number(stats.trend) >= 0 ? <TrendingUp /> : <TrendingDown />}
                  </Box>
                </Box>
                <Timeline sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Events Trend (Last 30 Days)
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Time-series analysis with window functions
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={eventsTrend}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <RechartsTooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8"
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  name="Events"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Alert Code Distribution
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Aggregation pipeline by alert_code
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={eventsByAlertCode}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {eventsByAlertCode.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 350 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Events by Month
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Group by month() aggregation
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={eventsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 350 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Events by Day of Week
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Group by dayOfWeek() aggregation
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={eventsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 350 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Events by Hour (Temporal Heatmap)
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Group by hour() - peak hours identification
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={eventsByHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                <YAxis />
                <RechartsTooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: '#f97316' }}
                  name="Events"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 350 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Top 10 Tags
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Unwind + group + sort aggregation
            </Typography>
            <Box sx={{ height: '85%', overflow: 'auto' }}>
              {topTags.map((tag, idx) => (
                <Box key={tag.tag} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={500}>
                      #{idx + 1} {tag.tag}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {tag.count}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'grey.200',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${(tag.count / (topTags[0]?.count || 1)) * 100}%`,
                        bgcolor: `hsl(${240 - idx * 20}, 70%, 50%)`,
                        borderRadius: 4,
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default AnalyticsPage
