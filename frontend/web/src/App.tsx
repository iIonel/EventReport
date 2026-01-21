import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { CircularProgress, Box } from '@mui/material'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import ReportPage from './pages/ReportPage'
import EventDetailPage from './pages/EventDetailPage'
import AnalyticsPage from './pages/AnalyticsPage'
import Layout from './components/Layout'

function App() {
  const { isLoading, isAuthenticated, user } = useAuth()
  const isAdmin = user?.role === 'admin'

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" />} />
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Layout>
              <HomePage />
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/report"
        element={
          isAuthenticated ? (
            <Layout>
              <ReportPage />
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/event/:id"
        element={
          isAuthenticated ? (
            <Layout>
              <EventDetailPage />
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/analytics"
        element={
          isAuthenticated && isAdmin ? (
            <Layout>
              <AnalyticsPage />
            </Layout>
          ) : isAuthenticated ? (
            <Navigate to="/" />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  )
}

export default App
