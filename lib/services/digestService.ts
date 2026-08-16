// @ts-nocheck
import { eq, and, gte, lt, ne, desc, sql } from 'drizzle-orm';
import { getDatabase } from '@/lib/db/connection';
// Note: orderReminderState is kept for backward compatibility and for upsertOrderReminderState
// which is called from orders route when orders are created/updated
import { orders, orderReminderState, digestRuns, notificationRecipients, feedbacks } from '@/lib/db/schema';
import { createLogger } from '@/lib/utils/logger';
import { computeDigestBuckets, getTodayInKolkata, formatDateForDigest, getKolkataStartOfDay } from '@/lib/utils/digestBuckets';
import { sendEmail, buildDigestEmailHtml, buildDigestEmailText } from '@/lib/services/emailService';
import { DateTime } from 'luxon';

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
export async function getDigestRunForDate(digestDate, period = 'daily') {
  const db = getDatabase();
  const result = await db.select()
    .from(digestRuns)
    .where(and(eq(digestRuns.digestDate, digestDate), eq(digestRuns.period, period)));
  
  return result.length > 0 ? result[0] : null;
}

/**
 * Create or update a digest run record
 * @param {string} digestDate - Date in YYYY-MM-DD format
 * @param {string} status - Status: started, sent, or failed
 * @param {string|null} error - Error message if failed
 * @returns {Promise<Object>} Created/updated digest run
 */
export async function upsertDigestRun(digestDate, status, error = null, period = 'daily') {
  const db = getDatabase();
  
  const existing = await getDigestRunForDate(digestDate, period);
  
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
      .where(and(eq(digestRuns.digestDate, digestDate), eq(digestRuns.period, period)));
    
    return { ...existing, ...updateData };
  }

  const result = await db.insert(digestRuns)
    .values({
      digestDate,
      period,
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
    const totalOrders = bucketData.overdueOrders.length + bucketData.oneDayOrders.length
      + bucketData.threeDayOrders.length + bucketData.sevenDayOrders.length;
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
  } catch (error: unknown) {
    logger.error('Daily digest failed', error);
    const message = error instanceof Error ? error.message : 'Unknown digest error';
    await upsertDigestRun(digestDate, 'failed', message);
    throw error;
  }
}

export type DigestPeriod = 'daily' | 'weekly';

  export function getDigestPeriodWindow(period: DigestPeriod, now: DateTime = DateTime.now()) {
    const zoned = now.setZone('Asia/Kolkata');
    const start = period === 'weekly' ? zoned.startOf('week') : zoned.startOf('day');
    return {
      key: start.toFormat('yyyy-MM-dd'),
      start: start.toJSDate(),
      end: zoned.toJSDate(),
    };
  }

  export function isDigestAlreadySent(run: { status?: string } | null | undefined): boolean {
    return run?.status === 'sent';
  }

  async function claimDigest(periodKey: string, period: DigestPeriod) {
    const db = getDatabase();
    const inserted = await db.insert(digestRuns)
      .values({ digestDate: periodKey, period, status: 'started', startedAt: new Date() })
      .onConflictDoNothing({ target: [digestRuns.digestDate, digestRuns.period] })
      .returning();
    if (inserted.length > 0) return { claimed: true };

    const existing = await getDigestRunForDate(periodKey, period);
    if (isDigestAlreadySent(existing)) return { claimed: false, status: 'already_sent' };
    if (existing?.status === 'started' || existing?.status === 'running') {
      return { claimed: false, status: 'in_progress' };
    }

    await db.update(digestRuns)
      .set({ status: 'started', startedAt: new Date(), sentAt: null, error: null })
      .where(and(eq(digestRuns.digestDate, periodKey), eq(digestRuns.period, period)));
    return { claimed: true };
  }

  function escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function getSalesDigestData(start: Date, end: Date, periodKey: string, period: DigestPeriod) {
    const db = getDatabase();
    const [summary] = await db.select({
      orderCount: sql<number>`count(*)::int`,
      revenue: sql<string>`coalesce(sum(${orders.totalPrice}), 0)`,
    }).from(orders).where(and(gte(orders.createdAt, start), lt(orders.createdAt, end)));

    const urgentOrders = await db.select({
      orderId: orders.orderId,
      customerName: orders.customerName,
      priority: orders.priority,
      totalPrice: orders.totalPrice,
      expectedDeliveryDate: orders.expectedDeliveryDate,
    }).from(orders).where(and(
      gte(orders.priority, 7),
      ne(orders.status, 'completed'),
      ne(orders.status, 'cancelled'),
    )).orderBy(desc(orders.priority), orders.expectedDeliveryDate);

    const previousRuns = await db.select({ sentAt: digestRuns.sentAt })
      .from(digestRuns)
      .where(and(
        eq(digestRuns.status, 'sent'),
        eq(digestRuns.period, period),
        lt(digestRuns.digestDate, periodKey),
      ))
      .orderBy(desc(digestRuns.digestDate))
      .limit(1);
    const feedbackSince = previousRuns[0]?.sentAt || start;
    const newFeedback = await db.select({
      rating: feedbacks.rating,
      comment: feedbacks.comment,
      createdAt: feedbacks.createdAt,
    }).from(feedbacks)
      .where(and(gte(feedbacks.createdAt, feedbackSince), lt(feedbacks.createdAt, end)))
      .orderBy(desc(feedbacks.createdAt));

    return {
      orderCount: Number(summary?.orderCount || 0),
      revenue: Number(summary?.revenue || 0),
      urgentOrders,
      newFeedback,
      feedbackSince,
    };
  }

  function buildSalesDigestContent(
    period: DigestPeriod,
    periodKey: string,
    data: Awaited<ReturnType<typeof getSalesDigestData>>,
  ) {
    const urgentRows = data.urgentOrders.map((order) =>
      `<li>${escapeHtml(order.orderId)} — ${escapeHtml(order.customerName)} (priority ${order.priority})</li>`
    ).join('');
    const feedbackRows = data.newFeedback.map((feedback) =>
      `<li>${feedback.rating}/5${feedback.comment ? ` — ${escapeHtml(feedback.comment)}` : ''}</li>`
    ).join('');
    const html = `
      <h1>${period === 'weekly' ? 'Weekly' : 'Daily'} sales digest</h1>
      <p>Period beginning ${escapeHtml(periodKey)}</p>
      <ul>
        <li>Orders created: ${data.orderCount}</li>
        <li>Revenue: ${data.revenue.toFixed(2)}</li>
        <li>Priority or urgent orders outstanding: ${data.urgentOrders.length}</li>
        <li>New feedback since the last digest: ${data.newFeedback.length}</li>
      </ul>
      <h2>Outstanding priority orders</h2>
      <ul>${urgentRows || '<li>None</li>'}</ul>
      <h2>New feedback</h2>
      <ul>${feedbackRows || '<li>None</li>'}</ul>`;
    const text = [
      `${period === 'weekly' ? 'Weekly' : 'Daily'} sales digest`,
      `Period beginning ${periodKey}`,
      `Orders created: ${data.orderCount}`,
      `Revenue: ${data.revenue.toFixed(2)}`,
      `Priority or urgent orders outstanding: ${data.urgentOrders.length}`,
      `New feedback since the last digest: ${data.newFeedback.length}`,
    ].join('\n');
    return { html, text };
  }

  export async function runSalesDigest(period: DigestPeriod = 'daily') {
    const window = getDigestPeriodWindow(period);
    const claim = await claimDigest(window.key, period);
    if (!claim.claimed) return { status: claim.status, period, periodKey: window.key };

    try {
      const recipients = await getEnabledRecipients();
      if (recipients.length === 0) {
        await upsertDigestRun(window.key, 'completed', null, period);
        return { status: 'skipped', reason: 'No recipients configured', periodKey: window.key };
      }

      const data = await getSalesDigestData(window.start, window.end, window.key, period);
      const content = buildSalesDigestContent(period, window.key, data);
      const results = await Promise.all(recipients.map((recipient) => sendEmail({
        to: [recipient.email],
        subject: `${period === 'weekly' ? 'Weekly' : 'Daily'} sales digest — ${window.key}`,
        ...content,
      })));
      if (results.every((result) => result?.skipped)) {
        await upsertDigestRun(window.key, 'completed', null, period);
        return { status: 'skipped', reason: 'Email provider is not configured', periodKey: window.key };
      }

      await upsertDigestRun(window.key, 'sent', null, period);
      return {
        status: 'sent',
        period,
        periodKey: window.key,
        orderCount: data.orderCount,
        revenue: data.revenue,
        urgentOrderCount: data.urgentOrders.length,
        newFeedbackCount: data.newFeedback.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown digest error';
      await upsertDigestRun(window.key, 'failed', message, period);
      throw error;
    }
}
