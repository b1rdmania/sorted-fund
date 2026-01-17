/**
 * Sorted.fund Dashboard - Authentication Utility
 * Session management and auth state handling
 */

class Auth {
  static TOKEN_KEY = 'sorted_session_token';
  static DEVELOPER_KEY = 'sorted_developer';

  /**
   * Get session token from localStorage
   */
  static getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Store session token in localStorage
   */
  static setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Remove session token from localStorage
   */
  static clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.DEVELOPER_KEY);
  }

  /**
   * Get developer info from localStorage
   */
  static getDeveloper() {
    const dev = localStorage.getItem(this.DEVELOPER_KEY);
    return dev ? JSON.parse(dev) : null;
  }

  /**
   * Check if user is authenticated by verifying token with backend
   */
  static async isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch(`${api.baseUrl}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        // Token invalid or expired
        this.clearToken();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  }

  /**
   * Redirect to login if not authenticated
   * Call this at the top of every dashboard page
   */
  static async requireAuth() {
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      window.location.href = '/login.html';
      throw new Error('Authentication required'); // Stop execution
    }
  }

  /**
   * Login with email and password
   */
  static async login(email, password) {
    const response = await fetch(`${api.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Login failed');
    }

    const data = await response.json();
    this.setToken(data.sessionToken);
    localStorage.setItem(this.DEVELOPER_KEY, JSON.stringify(data.developer));

    return data;
  }

  /**
   * Register new developer account
   */
  static async register(email, password, name) {
    const response = await fetch(`${api.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Registration failed');
    }

    const data = await response.json();
    this.setToken(data.sessionToken);
    localStorage.setItem(this.DEVELOPER_KEY, JSON.stringify(data.developer));

    return data;
  }

  /**
   * Logout and redirect to login page
   */
  static async logout() {
    const token = this.getToken();

    if (token) {
      try {
        await fetch(`${api.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }

    this.clearToken();
    window.location.href = '/login.html';
  }
}

// Make Auth available globally
if (typeof window !== 'undefined') {
  window.Auth = Auth;
}
