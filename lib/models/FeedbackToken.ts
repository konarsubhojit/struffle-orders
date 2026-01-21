// @ts-nocheck
import { eq, and, gt } from 'drizzle-orm';
import { getDatabase } from '@/lib/db/connection';
import { feedbackTokens } from '@/lib/db/schema';
import { generateFeedbackToken } from '@/lib/utils/tokenUtils';

const FeedbackToken = {
  /**
   * Generate a new feedback token for an order
   * @param {number} orderId - The order ID
   * @param {number} expiryDays - Days until token expires (default 30)
   * @returns {Promise<object>} - Token details
   */
  async generateForOrder(orderId, expiryDays = 30) {
    const db = getDatabase();
    const { token, expiresAt } = generateFeedbackToken(expiryDays);
    
    const result = await db.insert(feedbackTokens).values({
      orderId,
      token,
      expiresAt,
      used: 0
    }).returning();
    
    return result[0];
  },

  /**
   * Validate a token and return associated order ID
   * @param {string} token - The token to validate
   * @returns {Promise<object|null>} - Token details if valid, null otherwise
   */
  async validateToken(token) {
    const db = getDatabase();
    const now = new Date();
    
    const result = await db.select()
      .from(feedbackTokens)
      .where(
        and(
          eq(feedbackTokens.token, token),
          eq(feedbackTokens.used, 0),
          gt(feedbackTokens.expiresAt, now)
        )
      );
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0];
  },

  /**
   * Mark a token as used
   * @param {string} token - The token to mark as used
   * @returns {Promise<void>}
   */
  async markAsUsed(token) {
    const db = getDatabase();
    
    await db.update(feedbackTokens)
      .set({ used: 1 })
      .where(eq(feedbackTokens.token, token));
  },

  /**
   * Get or create a token for an order
   * @param {number} orderId - The order ID
   * @returns {Promise<object>} - Token details
   */
  async getOrCreateForOrder(orderId) {
    const db = getDatabase();
    const now = new Date();
    
    // Check if valid unused token exists
    const existingTokens = await db.select()
      .from(feedbackTokens)
      .where(
        and(
          eq(feedbackTokens.orderId, orderId),
          eq(feedbackTokens.used, 0),
          gt(feedbackTokens.expiresAt, now)
        )
      );
    
    if (existingTokens.length > 0) {
      return existingTokens[0];
    }
    
    // Generate new token
    return await this.generateForOrder(orderId);
  }
};

export default FeedbackToken;
