/**
 * Authentication Utilities
 * Handles session management and auth checks
 */

const Auth = {
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = localStorage.getItem('session_token');
    const developer = localStorage.getItem('developer');
    return !!(token && developer);
  },

  /**
   * Get current developer
   */
  getDeveloper() {
    const developerJson = localStorage.getItem('developer');
    if (!developerJson) return null;

    try {
      return JSON.parse(developerJson);
    } catch (error) {
      console.error('Failed to parse developer data:', error);
      return null;
    }
  },

  /**
   * Get session token
   */
  getToken() {
    return localStorage.getItem('session_token');
  },

  /**
   * Require authentication (redirect to login if not authenticated)
   */
  async requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }

    // Validate session with backend
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      });

      if (!response.ok) {
        // Session expired or invalid
        this.logout();
        window.location.href = 'login.html';
        return false;
      }

      const data = await response.json();

      // Update stored developer data
      localStorage.setItem('developer', JSON.stringify(data.developer));

      return true;
    } catch (error) {
      console.error('Failed to validate session:', error);
      this.logout();
      window.location.href = 'login.html';
      return false;
    }
  },

  /**
   * Login with email and password
   */
  async login(email, password) {
    const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Store session
    localStorage.setItem('session_token', data.sessionToken);
    localStorage.setItem('developer', JSON.stringify(data.developer));

    return data.developer;
  },

  /**
   * Register new account
   */
  async register(name, email, password) {
    const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    // Store session
    localStorage.setItem('session_token', data.sessionToken);
    localStorage.setItem('developer', JSON.stringify(data.developer));

    return data.developer;
  },

  /**
   * Logout
   */
  async logout() {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${CONFIG.API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('session_token');
      localStorage.removeItem('developer');

      // Redirect to login
      window.location.href = 'login.html';
    }
  },

  /**
   * Format credit balance (convert wei to ether with formatting)
   */
  formatCredits(credits) {
    if (!credits) return '0';

    const ether = BigInt(credits) / BigInt(10 ** 18);
    const remainder = BigInt(credits) % BigInt(10 ** 18);

    // Format with 4 decimal places
    const decimal = (Number(remainder) / 10 ** 18).toFixed(4).slice(2);

    return `${ether}.${decimal}`;
  },

  /**
   * Format credit balance in USD (assuming $2000/ETH for example)
   */
  formatCreditsUSD(credits) {
    const ether = this.formatCredits(credits);
    const usd = parseFloat(ether) * 2000; // Example rate
    return `$${usd.toFixed(2)}`;
  }
};

// Make available globally
window.Auth = Auth;
