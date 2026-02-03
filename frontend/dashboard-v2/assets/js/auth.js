/**
 * Sorted.fund Dashboard - Authentication Utility
 * Privy-based session management
 */

class Auth {
  // Privy token
  static PRIVY_TOKEN_KEY = 'sorted_privy_token';
  static DEVELOPER_KEY = 'sorted_developer';

  /**
   * Get session token from localStorage
   */
  static getToken() {
    return localStorage.getItem(this.PRIVY_TOKEN_KEY);
  }

  /**
   * Store session token in localStorage
   */
  static setToken(token) {
    localStorage.setItem(this.PRIVY_TOKEN_KEY, token);
  }

  /**
   * Remove all tokens from localStorage
   */
  static clearToken() {
    localStorage.removeItem(this.PRIVY_TOKEN_KEY);
    localStorage.removeItem(this.DEVELOPER_KEY);
    localStorage.removeItem('sorted_privy_user');
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
        }
      });

      if (!response.ok) {
        this.clearToken();
        return false;
      }

      // Update developer info
      const data = await response.json();
      if (data.developer) {
        localStorage.setItem(this.DEVELOPER_KEY, JSON.stringify(data.developer));
      }

      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  }

  /**
   * Redirect to login if not authenticated
   */
  static async requireAuth() {
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      window.location.href = '/login/';
      throw new Error('Authentication required');
    }
  }

  /**
   * Logout and redirect to login page
   */
  static async logout() {
    this.clearToken();
    window.location.href = '/login/';
  }
}

// Make Auth available globally
if (typeof window !== 'undefined') {
  window.Auth = Auth;
}
