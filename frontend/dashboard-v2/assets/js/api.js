/**
 * Sorted.fund Dashboard - API Client
 * REST API wrapper for backend communication
 */

/**
 * API Client class
 */
class ApiClient {
  constructor() {
    // Use CONFIG from config.js if available, otherwise fallback
    this.baseUrl = (typeof CONFIG !== 'undefined') ? CONFIG.API_BASE_URL : 'http://localhost:3000';
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Get session token from localStorage
   * @private
   */
  _getSessionToken() {
    return localStorage.getItem('session_token');
  }

  /**
   * Make HTTP request
   * @private
   */
  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    // Auto-inject session token if available (unless Authorization header already provided)
    const sessionToken = this._getSessionToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add session token if available and no Authorization header provided
    if (sessionToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const config = {
      ...options,
      headers,
      credentials: 'include', // Include cookies
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        // Clear session
        localStorage.removeItem('session_token');
        localStorage.removeItem('developer');

        // Redirect to login (avoid redirect loop if already on login page)
        if (!window.location.pathname.includes('login.html')) {
          window.location.href = 'login.html';
        }

        throw new Error('Session expired. Please login again.');
      }

      // Handle non-OK responses
      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`
        }));

        throw new Error(error.error || error.message || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * GET request
   * @private
   */
  async _get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this._request(url, { method: 'GET' });
  }

  /**
   * POST request
   * @private
   */
  async _post(endpoint, data = {}, headers = {}) {
    return this._request(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   * @private
   */
  async _delete(endpoint) {
    return this._request(endpoint, { method: 'DELETE' });
  }

  // ===== Projects =====

  /**
   * Get project by ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Project data
   */
  async getProject(projectId) {
    return this._get(`/projects/${projectId}`);
  }

  /**
   * Get all projects
   * @returns {Promise<Array>} List of projects
   */
  async getAllProjects() {
    return this._get('/projects');
  }

  /**
   * Create new project
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} Created project
   */
  async createProject(projectData) {
    return this._post('/projects', projectData);
  }

  /**
   * Get project gas tank balance
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Balance data
   */
  async getGasTankBalance(projectId) {
    return this._get(`/projects/${projectId}/balance`);
  }

  /**
   * Get refuel history
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Refuel history
   */
  async getRefuelHistory(projectId) {
    return this._get(`/projects/${projectId}/refuels`);
  }

  /**
   * Refuel gas tank
   * @param {string} projectId - Project ID
   * @param {Object} refuelData - { amount, note }
   * @returns {Promise<Object>} Refuel record
   */
  async refuelGasTank(projectId, refuelData) {
    return this._post(`/projects/${projectId}/refuel`, refuelData);
  }

  // ===== API Keys =====

  /**
   * Get project API keys
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} List of API keys
   */
  async getApiKeys(projectId) {
    return this._get(`/projects/${projectId}/apikeys`);
  }

  /**
   * Generate new API key
   * @param {string} projectId - Project ID
   * @param {Object} keyData - { rateLimit }
   * @returns {Promise<Object>} New API key (full key only shown once!)
   */
  async generateApiKey(projectId, keyData = {}) {
    return this._post(`/projects/${projectId}/apikeys`, keyData);
  }

  // ===== Allowlist =====

  /**
   * Get project allowlist
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Allowlist entries
   */
  async getAllowlist(projectId) {
    return this._get(`/projects/${projectId}/allowlist`);
  }

  /**
   * Add allowlist entry
   * @param {string} projectId - Project ID
   * @param {Object} entryData - { targetContract, functionSelector }
   * @returns {Promise<Object>} Created entry
   */
  async addAllowlistEntry(projectId, entryData) {
    return this._post(`/projects/${projectId}/allowlist`, entryData);
  }

  /**
   * Delete allowlist entry
   * @param {string} projectId - Project ID
   * @param {Object} entryData - { targetContract, functionSelector }
   * @returns {Promise<Object>} Result
   */
  async deleteAllowlistEntry(projectId, entryData) {
    return this._delete(`/projects/${projectId}/allowlist?targetContract=${entryData.targetContract}&functionSelector=${entryData.functionSelector}`);
  }

  // ===== Analytics =====

  /**
   * Get overview analytics
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Overview data
   */
  async getAnalyticsOverview(projectId) {
    return this._get(`/analytics/overview`, { projectId });
  }

  /**
   * Get timeline analytics
   * @param {string} projectId - Project ID
   * @param {string} period - Period (24h, 7d, 30d)
   * @param {string} granularity - Granularity (hour, day)
   * @returns {Promise<Object>} Timeline data
   */
  async getAnalyticsTimeline(projectId, period = '7d', granularity = 'day') {
    return this._get(`/analytics/timeline`, { projectId, period, granularity });
  }

  /**
   * Get recent events
   * @param {string} projectId - Project ID
   * @param {Object} params - { limit, offset, status }
   * @returns {Promise<Object>} Events data
   */
  async getAnalyticsEvents(projectId, params = {}) {
    return this._get(`/analytics/events`, { projectId, ...params });
  }

  // ===== Sponsorship =====

  /**
   * Request sponsorship authorization
   * @param {Object} request - Authorization request
   * @param {string} apiKey - API key for authentication
   * @returns {Promise<Object>} Authorization response
   */
  async requestSponsorship(request, apiKey) {
    return this._post('/sponsor/authorize', request, {
      'Authorization': `Bearer ${apiKey}`
    });
  }

  // ===== Blockchain =====

  /**
   * Get counter value for user
   * @param {string} contractAddress - Counter contract address
   * @param {string} userAddress - User address
   * @returns {Promise<Object>} Counter data
   */
  async getCounterValue(contractAddress, userAddress) {
    return this._get(`/blockchain/counter/${contractAddress}/${userAddress}`);
  }

  /**
   * Get account balance
   * @param {string} address - Account address
   * @returns {Promise<Object>} Balance data
   */
  async getAccountBalance(address) {
    return this._get(`/blockchain/balance/${address}`);
  }

  /**
   * Get current block number
   * @returns {Promise<Object>} Block number
   */
  async getCurrentBlock() {
    return this._get('/blockchain/block');
  }

  // ===== Health Check =====

  /**
   * Check API health
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    return this._get('/health');
  }
}

// Create singleton instance
const api = new ApiClient();

// Export for use in other files
if (typeof window !== 'undefined') {
  window.api = api;
}
