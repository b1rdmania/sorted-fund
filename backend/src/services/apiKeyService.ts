/**
 * API Key Service
 * Handles API key generation, validation, and authentication
 */

import { query } from '../db/database';
import { ApiKey, GenerateApiKeyResponse } from '../types';
import { createHash, randomBytes } from 'crypto';

export class ApiKeyService {
  /**
   * Generate a new API key for a project
   */
  async generateApiKey(projectId: string, rateLimit: number = 100): Promise<GenerateApiKeyResponse> {
    // Generate random API key
    const apiKey = this.createApiKey();
    const keyHash = this.hashApiKey(apiKey);
    const keyPreview = apiKey.substring(0, 12) + '...';

    const result = await query<ApiKey>(
      `INSERT INTO api_keys (key_hash, key_preview, project_id, rate_limit)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [keyHash, keyPreview, projectId, rateLimit]
    );

    return {
      apiKey, // Only returned once!
      preview: keyPreview,
      projectId,
      rateLimit,
    };
  }

  /**
   * Validate API key and return associated data
   */
  async validateApiKey(apiKey: string): Promise<ApiKey | null> {
    const keyHash = this.hashApiKey(apiKey);

    const result = await query<ApiKey>(
      `SELECT * FROM api_keys
       WHERE key_hash = $1 AND revoked_at IS NULL`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Update last_used_at
    const key = result.rows[0];
    await query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [key.id]
    );

    return key;
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(keyId: number): Promise<void> {
    await query(
      'UPDATE api_keys SET revoked_at = NOW() WHERE id = $1',
      [keyId]
    );
  }

  /**
   * Get all API keys for a project
   */
  async getProjectApiKeys(projectId: string): Promise<ApiKey[]> {
    const result = await query<ApiKey>(
      `SELECT * FROM api_keys
       WHERE project_id = $1
       ORDER BY issued_at DESC`,
      [projectId]
    );

    return result.rows;
  }

  /**
   * Check rate limit for an API key
   */
  async checkRateLimit(apiKeyId: number, limit: number): Promise<boolean> {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - 1); // 1-minute window

    // Get current request count for this window
    const result = await query<{ request_count: number }>(
      `SELECT request_count FROM rate_limits
       WHERE api_key_id = $1 AND window_start >= $2`,
      [apiKeyId, windowStart]
    );

    let currentCount = 0;
    if (result.rows.length > 0) {
      currentCount = result.rows.reduce((sum, row) => sum + row.request_count, 0);
    }

    return currentCount < limit;
  }

  /**
   * Record a request for rate limiting
   */
  async recordRequest(apiKeyId: number): Promise<void> {
    const windowStart = new Date();
    windowStart.setSeconds(0, 0); // Round to minute

    await query(
      `INSERT INTO rate_limits (api_key_id, window_start, request_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (api_key_id, window_start)
       DO UPDATE SET request_count = rate_limits.request_count + 1`,
      [apiKeyId, windowStart]
    );
  }

  /**
   * Create a random API key
   */
  private createApiKey(): string {
    const prefix = 'sk_sorted_';
    const random = randomBytes(32).toString('hex');
    return prefix + random;
  }

  /**
   * Hash an API key for storage
   */
  private hashApiKey(apiKey: string): string {
    return createHash('sha256')
      .update(apiKey + (process.env.API_KEY_SALT || 'default-salt'))
      .digest('hex');
  }
}

export default new ApiKeyService();
