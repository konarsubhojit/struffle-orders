// @ts-nocheck
import { eq, desc, sql } from 'drizzle-orm';
import { getDatabase } from '@/lib/db/connection';
import { feedbacks } from '@/lib/db/schema';

function transformFeedback(feedback: any) {
  return {
    ...feedback,
    _id: feedback.id,
    rating: feedback.rating,
    comment: feedback.comment || '',
    productQuality: feedback.productQuality || null,
    deliveryExperience: feedback.deliveryExperience || null,
    isPublic: Boolean(feedback.isPublic),
    responseText: feedback.responseText || '',
    respondedAt: feedback.respondedAt ? feedback.respondedAt.toISOString() : null,
    createdAt: feedback.createdAt.toISOString(),
    updatedAt: feedback.updatedAt.toISOString()
  };
}

const Feedback = {
  async find() {
    const db = getDatabase();
    const feedbacksResult = await db.select().from(feedbacks).orderBy(desc(feedbacks.createdAt));
    return feedbacksResult.map(transformFeedback);
  },

  async findPaginated({ page = 1, limit = 10 }) {
    const db = getDatabase();
    const offset = (page - 1) * limit;
    
    const countResult = await db.select({ count: sql`count(*)` }).from(feedbacks);
    const total = Number.parseInt(countResult[0].count, 10);
    
    const feedbacksResult = await db.select()
      .from(feedbacks)
      .orderBy(desc(feedbacks.createdAt))
      .limit(limit)
      .offset(offset);
    
    return {
      items: feedbacksResult.map(transformFeedback),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  },

  async findById(id) {
    const db = getDatabase();
    const numericId = Number.parseInt(id, 10);
    if (Number.isNaN(numericId)) return null;
    
    const feedbacksResult = await db.select().from(feedbacks).where(eq(feedbacks.id, numericId));
    if (feedbacksResult.length === 0) return null;
    
    return transformFeedback(feedbacksResult[0]);
  },

  async findByOrderId(orderId) {
    const db = getDatabase();
    const numericOrderId = Number.parseInt(orderId, 10);
    if (Number.isNaN(numericOrderId)) return null;
    
    const feedbacksResult = await db.select().from(feedbacks).where(eq(feedbacks.orderId, numericOrderId));
    if (feedbacksResult.length === 0) return null;
    
    return transformFeedback(feedbacksResult[0]);
  },

  async create(data) {
    const db = getDatabase();
    
    const feedbackResult = await db.insert(feedbacks).values({
      orderId: data.orderId,
      rating: data.rating,
      comment: data.comment?.trim() || null,
      productQuality: data.productQuality || null,
      deliveryExperience: data.deliveryExperience || null,
      isPublic: data.isPublic !== undefined ? (data.isPublic ? 1 : 0) : 1
    }).returning();
    
    return transformFeedback(feedbackResult[0]);
  },

  async findByIdAndUpdate(id, data) {
    const db = getDatabase();
    const numericId = Number.parseInt(id, 10);
    if (Number.isNaN(numericId)) return null;
    
    const existingFeedback = await db.select().from(feedbacks).where(eq(feedbacks.id, numericId));
    if (existingFeedback.length === 0) return null;
    
    const updateData = {
      updatedAt: new Date()
    };
    
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.comment !== undefined) updateData.comment = data.comment?.trim() || null;
    if (data.productQuality !== undefined) updateData.productQuality = data.productQuality;
    if (data.deliveryExperience !== undefined) updateData.deliveryExperience = data.deliveryExperience;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic ? 1 : 0;
    if (data.responseText !== undefined) {
      updateData.responseText = data.responseText?.trim() || null;
      if (data.responseText?.trim()) {
        updateData.respondedAt = new Date();
      }
    }
    
    await db.update(feedbacks)
      .set(updateData)
      .where(eq(feedbacks.id, numericId));
    
    return this.findById(numericId);
  },

  async getAverageRatings() {
    const db = getDatabase();
    
    const result = await db.select({
      avgRating: sql`AVG(${feedbacks.rating})`,
      avgProductQuality: sql`AVG(${feedbacks.productQuality})`,
      avgDeliveryExperience: sql`AVG(${feedbacks.deliveryExperience})`,
      totalFeedbacks: sql`COUNT(*)`
    }).from(feedbacks);
    
    return {
      avgRating: result[0].avgRating ? Number.parseFloat(result[0].avgRating).toFixed(2) : null,
      avgProductQuality: result[0].avgProductQuality ? Number.parseFloat(result[0].avgProductQuality).toFixed(2) : null,
      avgDeliveryExperience: result[0].avgDeliveryExperience ? Number.parseFloat(result[0].avgDeliveryExperience).toFixed(2) : null,
      totalFeedbacks: Number.parseInt(result[0].totalFeedbacks, 10)
    };
  },

  async getFeedbacksByRating(rating) {
    const db = getDatabase();
    
    const feedbacksResult = await db.select()
      .from(feedbacks)
      .where(eq(feedbacks.rating, rating))
      .orderBy(desc(feedbacks.createdAt));
    
    return feedbacksResult.map(transformFeedback);
  }
};

export default Feedback;
