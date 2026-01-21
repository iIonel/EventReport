import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.209:8000';

console.log('[API] Connecting to:', API_URL);

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('[API] Request timeout - server may be unreachable');
    } else if (!error.response) {
      console.error('[API] Network error - check if backend is running at:', API_URL);
    } else {
      console.error('[API] Error:', error.response?.status, error.response?.data);
    }
    return Promise.reject(error);
  }
);

// Token storage helpers
const TOKEN_KEY = 'auth_token';

export const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return await SecureStore.getItemAsync(TOKEN_KEY);
};

export const setToken = async (token: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
};

export const removeToken = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Types
export interface Location {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Event {
  id: string;
  location: Location;
  alert_code: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  description: string;
  tags: string[];
  reporter_id: string;
  image_id?: string;
  reported_at: string;
  created_at: string;
}

export interface EventCreate {
  location: Location;
  alert_code: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  description: string;
  tags: string[];
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// API Functions
export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    // Backend expects JSON with email and password
    const response = await api.post<AuthResponse>('/auth/login', {
      email: data.email,
      password: data.password,
    });
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<User> => {
    const response = await api.post<User>('/auth/register', data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};

export const eventsApi = {
  getAll: async (alertCode?: string): Promise<Event[]> => {
    const params = alertCode ? { alert_code: alertCode } : {};
    const response = await api.get<Event[]>('/events', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Event> => {
    const response = await api.get<Event>(`/events/${id}`);
    return response.data;
  },

  create: async (data: EventCreate): Promise<Event> => {
    const response = await api.post<Event>('/events', data);
    return response.data;
  },

  uploadImage: async (eventId: string, imageUri: string): Promise<void> => {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('file', blob, 'image.jpg');
    } else {
      const uriParts = imageUri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      formData.append('file', {
        uri: imageUri,
        name: `image.${fileType}`,
        type: `image/${fileType}`,
      } as unknown as Blob);
    }

    await api.post(`/events/${eventId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getImageUrl: (eventId: string): string => {
    return `${API_URL}/events/${eventId}/image`;
  },
};

export default api;
