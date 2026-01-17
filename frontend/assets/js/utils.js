/**
 * Sorted.fund Dashboard - Utility Functions
 * Helper functions for formatting, validation, and common operations
 */

// ===== Number Formatting =====

/**
 * Format wei to ETH/S with proper decimals
 * @param {string|number} wei - Amount in wei
 * @param {number} decimals - Number of decimal places (default: 4)
 * @returns {string} Formatted amount (e.g., "0.1234")
 */
function formatWei(wei, decimals = 4) {
  if (!wei || wei === '0') return '0';

  const weiStr = wei.toString();
  const ethValue = parseFloat(weiStr) / 1e18;

  return ethValue.toFixed(decimals);
}

/**
 * Format wei to ETH with unit label
 * @param {string|number} wei - Amount in wei
 * @param {string} unit - Unit label (default: 'S')
 * @returns {string} Formatted with unit (e.g., "0.1234 S")
 */
function formatWeiWithUnit(wei, unit = 'S') {
  return `${formatWei(wei)} ${unit}`;
}

/**
 * Format large numbers with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number (e.g., "1,234,567")
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US');
}

/**
 * Format number with K/M/B suffix
 * @param {number} num - Number to format
 * @returns {string} Compact format (e.g., "1.2K", "3.4M")
 */
function formatCompact(num) {
  if (num === null || num === undefined || num === 0) return '0';

  const abs = Math.abs(num);
  if (abs >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (num / 1e3).toFixed(1) + 'K';

  return num.toString();
}

// ===== Date/Time Formatting =====

/**
 * Format ISO timestamp to readable date
 * @param {string} isoString - ISO 8601 timestamp
 * @returns {string} Formatted date (e.g., "Jan 8, 2026")
 */
function formatDate(isoString) {
  if (!isoString) return '';

  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format ISO timestamp to time
 * @param {string} isoString - ISO 8601 timestamp
 * @returns {string} Formatted time (e.g., "3:45 PM")
 */
function formatTime(isoString) {
  if (!isoString) return '';

  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format ISO timestamp to date and time
 * @param {string} isoString - ISO 8601 timestamp
 * @returns {string} Formatted datetime (e.g., "Jan 8, 2026 3:45 PM")
 */
function formatDateTime(isoString) {
  if (!isoString) return '';

  return `${formatDate(isoString)} ${formatTime(isoString)}`;
}

/**
 * Get relative time (e.g., "2 minutes ago")
 * @param {string} isoString - ISO 8601 timestamp
 * @returns {string} Relative time string
 */
function formatRelativeTime(isoString) {
  if (!isoString) return '';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;

  return formatDate(isoString);
}

// ===== Address Formatting =====

/**
 * Shorten Ethereum address
 * @param {string} address - Full address
 * @param {number} startChars - Chars to show at start (default: 6)
 * @param {number} endChars - Chars to show at end (default: 4)
 * @returns {string} Shortened address (e.g., "0x1234...abcd")
 */
function shortenAddress(address, startChars = 6, endChars = 4) {
  if (!address) return '';
  if (address.length < startChars + endChars) return address;

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Shorten transaction hash
 * @param {string} hash - Full hash
 * @returns {string} Shortened hash (e.g., "0xabcd...1234")
 */
function shortenHash(hash) {
  return shortenAddress(hash, 8, 6);
}

// ===== Validation =====

/**
 * Check if string is valid Ethereum address
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid
 */
function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if string is valid function selector
 * @param {string} selector - Selector to validate (0x + 8 hex chars)
 * @returns {boolean} True if valid
 */
function isValidSelector(selector) {
  return /^0x[a-fA-F0-9]{8}$/.test(selector);
}

// ===== String Utilities =====

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
function truncate(str, maxLength) {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

// ===== Status Helpers =====

/**
 * Get CSS class for status badge
 * @param {string} status - Status value
 * @returns {string} CSS class name
 */
function getStatusClass(status) {
  const statusMap = {
    'success': 'badge-success',
    'pending': 'badge-warning',
    'failed': 'badge-error',
    'error': 'badge-error',
    'active': 'badge-success',
    'suspended': 'badge-warning',
    'killed': 'badge-error'
  };

  return statusMap[status?.toLowerCase()] || 'badge-info';
}

/**
 * Get color class for text
 * @param {string} status - Status value
 * @returns {string} CSS class name
 */
function getStatusTextClass(status) {
  const statusMap = {
    'success': 'text-success',
    'pending': 'text-warning',
    'failed': 'text-error',
    'error': 'text-error',
    'active': 'text-success',
    'suspended': 'text-warning',
    'killed': 'text-error'
  };

  return statusMap[status?.toLowerCase()] || 'text-info';
}

// ===== Local Storage =====

/**
 * Save data to localStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON stringified)
 */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Failed to save to storage:', err);
  }
}

/**
 * Load data from localStorage
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Parsed value or default
 */
function loadFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.error('Failed to load from storage:', err);
    return defaultValue;
  }
}

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 */
function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Failed to remove from storage:', err);
  }
}

// ===== DOM Utilities =====

/**
 * Show element
 * @param {HTMLElement|string} element - Element or selector
 */
function show(element) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (el) el.classList.remove('hidden');
}

/**
 * Hide element
 * @param {HTMLElement|string} element - Element or selector
 */
function hide(element) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (el) el.classList.add('hidden');
}

/**
 * Toggle element visibility
 * @param {HTMLElement|string} element - Element or selector
 */
function toggle(element) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (el) el.classList.toggle('hidden');
}

/**
 * Add loading state to button
 * @param {HTMLButtonElement} button - Button element
 * @param {string} loadingText - Text to show while loading
 */
function setButtonLoading(button, loadingText = 'Loading...') {
  if (!button) return;

  button.disabled = true;
  button.dataset.originalText = button.textContent;
  button.textContent = loadingText;
}

/**
 * Remove loading state from button
 * @param {HTMLButtonElement} button - Button element
 */
function unsetButtonLoading(button) {
  if (!button) return;

  button.disabled = false;
  button.textContent = button.dataset.originalText || button.textContent;
  delete button.dataset.originalText;
}

// ===== Error Handling =====

/**
 * Display error message
 * @param {string} message - Error message
 * @param {HTMLElement} container - Container element (optional)
 */
function showError(message, container) {
  const alert = document.createElement('div');
  alert.className = 'alert alert-error fade-in';
  alert.textContent = message;

  if (container) {
    container.prepend(alert);
  } else {
    const main = document.querySelector('.main-content') || document.body;
    main.prepend(alert);
  }

  // Auto-remove after 5 seconds
  setTimeout(() => alert.remove(), 5000);
}

/**
 * Display success message
 * @param {string} message - Success message
 * @param {HTMLElement} container - Container element (optional)
 */
function showSuccess(message, container) {
  const alert = document.createElement('div');
  alert.className = 'alert alert-success fade-in';
  alert.textContent = message;

  if (container) {
    container.prepend(alert);
  } else {
    const main = document.querySelector('.main-content') || document.body;
    main.prepend(alert);
  }

  // Auto-remove after 5 seconds
  setTimeout(() => alert.remove(), 5000);
}

// ===== Query Params =====

/**
 * Get URL query parameter
 * @param {string} name - Parameter name
 * @returns {string|null} Parameter value
 */
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * Set URL query parameter (without reload)
 * @param {string} name - Parameter name
 * @param {string} value - Parameter value
 */
function setQueryParam(name, value) {
  const url = new URL(window.location);
  url.searchParams.set(name, value);
  window.history.pushState({}, '', url);
}

// ===== Export (for modules) =====
// If using as module, uncomment:
// export { ... }
