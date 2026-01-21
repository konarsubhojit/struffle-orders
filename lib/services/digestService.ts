// @ts-nocheck
import { eq, and, gte, lt, ne } from 'drizzle-orm';
import { getDatabase } from '@/lib/db/connection';
// Note: orderReminderState is kept for backward compatibility and for upsertOrderReminderState
// which is called from orders route when orders are created/updated
import { orders, orderReminderState, digestRuns, notificationRecipients } from '@/lib/db/schema';
import { createLogger } from '@/lib/utils/logger';
import { computeDigestBuckets, getTodayInKolkata, formatDateForDigest, getKolkataStartOfDay } from '@/lib/utils/digestBuckets';
import { sendEmail, buildDigestEmailHtml, buildDigestEmailText } from '@/lib/services/emailService';

const logger = createLogger('DigestService');

/**
 * Get enabled notification recipients
 * @returns {Promise<Array>} List of enabled recipients
 */
export async function getEnabledRecipients() {
  const db = getDatabase();
  return db.select()
    .from(notificationRecipients)
    .where(eq(notificationRecipients.enabled, true));
}

/**
 * Check if digest has already been sent for a given date
 * @param {string} digestDate - Date in YYYY-MM-DD format (Kolkata)
 * @returns {Promise<Object|null>} Existing digest run or null
 */
export async function getDigestRunForDate(digestDate) {
  const db = getDatabase();
  const result = await db.select()
    .from(digestRuns)
    .where(eq(digestRuns.digestDate, digestDate));
  
  return result.length > 0 ? result[0] : null;
}

/**
 * Create or update a digest run record
 * @param {string} digestDate - Date in YYYY-MM-DD format
 * @param {string} status - Status: started, sent, or failed
 * @param {string|null} error - Error message if failed
 * @returns {Promise<Object>} Created/updated digest run
 */
export async function upsertDigestRun(digestDate, status, error = null) {
  const db = getDatabase();
  
  const existing = await getDigestRunForDate(digestDate);
  
  if (existing) {
    const updateData = { status };
    if (status === 'sent') {
      updateData.sentAt = new Date();
    }
    if (error) {
      updateData.error = error;
    }
    
    await db.update(digestRuns)
      .set(updateData)
      .where(eq(digestRuns.digestDate, digestDate));
    
    return { ...existing, ...updateData };
  }

  const result = await db.insert(digestRuns)
    .values({
      digestDate,
      status,
      startedAt: new Date(),
      sentAt: status === 'sent' ? new Date() : null,
      error
    })
    .returning();
  
  return result[0];
}

/**
 * Query orders for a specific time bucket, excluding completed and cancelled
 * @param {Date} bucketStart - Start of the bucket (inclusive)
 * @param {Date} bucketEnd - End of the bucket (exclusive)
 * @returns {Promise<Array>} All pending orders in this bucket
 */
export async function getOrdersForBucket(bucketStart, bucketEnd) {
  const db = getDatabase();
  
  const ordersResult = await db.select({
    id: orders.id,
    orderId: orders.orderId,
    customerName: orders.customerName,
    expectedDeliveryDate: orders.expectedDeliveryDate,
    status: orders.status
  })
    .from(orders)
    .where(
      and(
        gte(orders.expectedDeliveryDate, bucketStart),
        lt(orders.expectedDeliveryDate, bucketEnd),
        ne(orders.status, 'completed'),
        ne(orders.status, 'cancelled')
      )
    )
    .orderBy(orders.expectedDeliveryDate, orders.orderId);

  return ordersResult;
}

/**
 * Query overdue orders (expected delivery date has passed)
 * @returns {Promise<Array>} All overdue orders that are not completed or cancelled
 */
export async function getOverdueOrders() {
  const db = getDatabase();
  const today = getKolkataStartOfDay(0);
  
  const ordersResult = await db.select({
    id: orders.id,
    orderId: orders.orderId,
    customerName: orders.customerName,
    expectedDeliveryDate: orders.expectedDeliveryDate,
    status: orders.status
  })
    .from(orders)
    .where(
      and(
        lt(orders.expectedDeliveryDate, today),
        ne(orders.status, 'completed'),
        ne(orders.status, 'cancelled')
      )
    )
    .orderBy(orders.expectedDeliveryDate, orders.orderId);

  return ordersResult;
}

/**
 * Mark orders as having received a reminder for a specific tier
 * @param {number[]} orderIds - Order IDs to mark
 * @param {string} tier - Which tier: '1d', '3d', or '7d'
 */
export async function markOrdersAsSent(orderIds, tier) {
  if (orderIds.length === 0) return;
  
  const db = getDatabase();
  
  const flagColumn = tier === '1d' ? 'sent1d' : tier === '3d' ? 'sent3d' : 'sent7d';
  
  for (const orderId of orderIds) {
    // Get the order's expected delivery date for the snapshot
    const orderResult = await db.select({ expectedDeliveryDate: orders.expectedDeliveryDate })
      .from(orders)
      .where(eq(orders.id, orderId));
    
    if (orderResult.length === 0) continue;
    
    const deliveryDate = orderResult[0].expectedDeliveryDate;
    
    // Upsert the reminder state
    const existing = await db.select()
      .from(orderReminderState)
      .where(eq(orderReminderState.orderId, orderId));
    
    if (existing.length > 0) {
      const updateData = { updatedAt: new Date() };
      updateData[flagColumn] = true;
      
      await db.update(orderReminderState)
        .set(updateData)
        .where(eq(orderReminderState.orderId, orderId));
    } else {
      const insertData = {
        orderId,
        deliveryDateSnapshot: deliveryDate,
        sent7d: tier === '7d',
        sent3d: tier === '3d',
        sent1d: tier === '1d',
        updatedAt: new Date()
      };
      
      await db.insert(orderReminderState).values(insertData);
    }
  }
}

/**
 * Upsert order reminder state when an order is created or delivery date changes
 * @param {number} orderId - The order's database ID
 * @param {Date} expectedDeliveryDate - The expected delivery date
 */
export async function upsertOrderReminderState(orderId, expectedDeliveryDate) {
  if (!expectedDeliveryDate) return;
  
  const db = getDatabase();
  
  const existing = await db.select()
    .from(orderReminderState)
    .where(eq(orderReminderState.orderId, orderId));
  
  if (existing.length > 0) {
    const existingSnapshot = existing[0].deliveryDateSnapshot;
    
    // If the delivery date changed, reset all flags
    if (existingSnapshot.getTime() !== expectedDeliveryDate.getTime()) {
      await db.update(orderReminderState)
        .set({
          deliveryDateSnapshot: expectedDeliveryDate,
          sent7d: false,
          sent3d: false,
          sent1d: false,
          updatedAt: new Date()
        })
        .where(eq(orderReminderState.orderId, orderId));
    }
  } else {
    // Create new reminder state
    await db.insert(orderReminderState).values({
      orderId,
      deliveryDateSnapshot: expectedDeliveryDate,
      sent7d: false,
      sent3d: false,
      sent1d: false,
      updatedAt: new Date()
    });
  }
}

/**
 * Check if digest was already sent for the given date
 * @param {string} digestDate - Date in YYYY-MM-DD format
 * @returns {Promise<Object|null>} Returns status if already sent, null otherwise
 */
async function checkDigestIdempotency(digestDate) {
  const existingRun = await getDigestRunForDate(digestDate);
  if (existingRun && existingRun.status === 'sent') {
    logger.info('Digest already sent for this date', { digestDate });
    return { status: 'already_sent', digestDate };
  }
  return null;
}

/**
 * Fetch all orders grouped by delivery date buckets
 * @param {Object} buckets - Bucket ranges from computeDigestBuckets
 * @returns {Promise<Object>} Object containing orders for each bucket plus overdue orders
 */
async function fetchOrdersForAllBuckets(buckets) {
  const overdueOrders = await getOverdueOrders();
  const oneDayOrders = await getOrdersForBucket(buckets['1d'].start, buckets['1d'].end);
  const threeDayOrders = await getOrdersForBucket(buckets['3d'].start, buckets['3d'].end);
  const sevenDayOrders = await getOrdersForBucket(buckets['7d'].start, buckets['7d'].end);
  
  logger.info('Orders found for digest', {
    overdueCount: overdueOrders.length,
    oneDayCount: oneDayOrders.length,
    threeDayCount: threeDayOrders.length,
    sevenDayCount: sevenDayOrders.length
  });
  
  return { overdueOrders, oneDayOrders, threeDayOrders, sevenDayOrders };
}

/**
 * Check if all order buckets are empty
 * @param {Object} bucketData - Object containing order arrays for each bucket
 * @returns {boolean} True if all buckets are empty
 */
function areAllBucketsEmpty(bucketData) {
  const { overdueOrders, oneDayOrders, threeDayOrders, sevenDayOrders } = bucketData;
  return overdueOrders.length === 0 && oneDayOrders.length === 0 && threeDayOrders.length === 0 && sevenDayOrders.length === 0;
}

/**
 * Send digest email to all recipients (separate email for each)
 * @param {Array} recipients - List of recipient objects with email property
 * @param {Object} bucketData - Orders grouped by buckets
 * @param {string} digestDate - Date string for the digest
 */
async function sendDigestEmail(recipients, bucketData, digestDate) {
  const emailHtml = buildDigestEmailHtml(bucketData, digestDate, formatDateForDigest);
  const emailText = buildDigestEmailText(bucketData, digestDate, formatDateForDigest);
  
  const emailPromises = recipients.map(recipient => 
    sendEmail({
      to: [recipient.email],
      subject: `⏰ Daily Order Reminder - ${digestDate} - Action Required`,
      html: emailHtml,
      text: emailText
    })
  );
  
  await Promise.all(emailPromises);
  
  return recipients.map(r => r.email);
}

/**
 * Run the daily digest
 * @returns {Promise<Object>} Result of the digest run
 */
export async function runDailyDigest() {
  const digestDate = getTodayInKolkata();
  logger.info('Starting daily digest', { digestDate });
  
  const idempotencyCheck = await checkDigestIdempotency(digestDate);
  if (idempotencyCheck) {
    return idempotencyCheck;
  }
  
  await upsertDigestRun(digestDate, 'started');
  
  try {
    const recipients = await getEnabledRecipients();
    
    if (recipients.length === 0) {
      logger.warn('No enabled recipients found');
      await upsertDigestRun(digestDate, 'sent');
      return { status: 'sent', digestDate, message: 'No recipients configured' };
    }
    
    const buckets = computeDigestBuckets();
    const bucketData = await fetchOrdersForAllBuckets(buckets);
    
    if (areAllBucketsEmpty(bucketData)) {
      logger.info('No orders to send in digest');
      await upsertDigestRun(digestDate, 'sent');
      return { status: 'sent', digestDate, message: 'No orders requiring reminders' };
    }
    
    const recipientEmails = await sendDigestEmail(recipients, bucketData, digestDate);
    await upsertDigestRun(digestDate, 'sent');
    
    const totalOrders = bucketData.overdueOrders.length + bucketData.oneDayOrders.length + bucketData.threeDayOrders.length + bucketData.sevenDayOrders.length;
    logger.info('Daily digest completed successfully', {
      digestDate,
      recipientCount: recipientEmails.length,
      orderCount: totalOrders
    });
    
    return {
      status: 'sent',
      digestDate,
      orderCounts: {
        overdue: bucketData.overdueOrders.length,
        oneDay: bucketData.oneDayOrders.length,
        threeDay: bucketData.threeDayOrders.length,
        sevenDay: bucketData.sevenDayOrders.length
      }
    };
  } catch (error: any) {
    logger.error('Daily digest failed', error);
    await upsertDigestRun(digestDate, 'failed', error.message);
    throw error;
  }
}
