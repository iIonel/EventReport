import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi, User } from '../api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { first_name: string; last_name: string; email: string; password: string; phone: string }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const userData = await authApi.getMe()
        setUser(userData)
      } catch {
        localStorage.removeItem('token')
      }
    }
    setIsLoading(false)
  }

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    localStorage.setItem('token', res.access_token)
    const userData = await authApi.getMe()
    setUser(userData)
  }

  const register = async (data: { first_name: string; last_name: string; email: string; password: string; phone: string }) => {
    await authApi.register(data)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
