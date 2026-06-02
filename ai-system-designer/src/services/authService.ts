import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/auth`;

export interface UserState {
  email: string;
}

export const authService = {
  // Register a new user
  async register(email: string, password: string): Promise<string> {
    const response = await axios.post(`${API_URL}/register`, {
      email,
      password
    });
    return response.data;
  },

  // Login
  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; email: string }> {
    const response = await axios.post(`${API_URL}/login`, {
      email,
      password
    });
    const { accessToken, refreshToken } = response.data;
    
    // Save tokens in localStorage
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userEmail', email);

    return { accessToken, refreshToken, email };
  },

  // Logout
  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
  },

  // Get current user email if logged in
  getCurrentUser(): UserState | null {
    const email = localStorage.getItem('userEmail');
    if (!email) return null;
    return { email };
  },

  // Get Authorization headers
  getAuthHeaders(): { Authorization: string } | {} {
    const token = localStorage.getItem('accessToken');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  },

  // Check if authenticated
  isAuthenticated(): boolean {
    return localStorage.getItem('accessToken') !== null;
  }
};

// Global response interceptor to handle token expiration/invalidity
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Clear localStorage and force reload to show the landing/login modal cleanly
      authService.logout();
      window.location.reload();
    }
    return Promise.reject(error);
  }
);
