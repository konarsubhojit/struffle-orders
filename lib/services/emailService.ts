// @ts-nocheck
import nodemailer from 'nodemailer';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('EmailService');

/**
 * Get the email transporter
 * Falls back to a mock transporter in test environment
 * @returns {Object} Nodemailer transporter
 */
function getTransporter() {
  // In test environment, use a mock transporter
  if (process.env.NODE_ENV === 'test') {
    return {
      sendMail: async (mailOptions) => {
        logger.debug('Mock email sent', { to: mailOptions.to, subject: mailOptions.subject });
        return { messageId: 'mock-message-id' };
      }
    };
  }

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST) {
    logger.warn('SMTP not configured, emails will not be sent');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string[]} options.to - Array of recipient email addresses
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body of the email
 * @param {string} [options.text] - Plain text body (optional)
 * @returns {Promise<Object|null>} Send result or null if SMTP not configured
 */
export async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();
  
  if (!transporter) {
    logger.warn('No email transporter available, skipping email send');
    return null;
  }

  const fromAddress = process.env.SMTP_FROM || 'noreply@order-management.local';
  
  const mailOptions = {
    from: fromAddress,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    // Use provided text or let nodemailer handle text generation from HTML
    // We don't manually strip HTML to avoid security issues with incomplete sanitization
    text: text || undefined
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully', { 
      messageId: result.messageId, 
      recipientCount: Array.isArray(to) ? to.length : 1 
    });
    return result;
  } catch (error: any) {
    logger.error('Failed to send email', error);
    throw error;
  }
}

/**
 * Build the HTML content for the digest email
 * @param {Object} buckets - Object containing orders for each tier
 * @param {Array} buckets.overdueOrders - Overdue orders (past expected delivery date)
 * @param {Array} buckets.oneDayOrders - Orders due in 1 day
 * @param {Array} buckets.threeDayOrders - Orders due in 3 days
 * @param {Array} buckets.sevenDayOrders - Orders due in 7 days
 * @param {string} digestDate - The digest date (YYYY-MM-DD in Kolkata)
 * @param {Function} formatDate - Function to format dates
 * @returns {string} HTML content for the email
 */
export function buildDigestEmailHtml({ overdueOrders, oneDayOrders, threeDayOrders, sevenDayOrders }, digestDate, formatDate) {
  const sections = [];

  const renderOrdersTable = (orders) => {
    if (!orders || orders.length === 0) {
      return '<p style="color: #666; font-style: italic;">None</p>';
    }

    const rows = orders.map(order => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${order.orderId}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${order.customerName}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(order.expectedDeliveryDate)}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${order.status}</td>
      </tr>
    `).join('');

    return `
      <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Order ID</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Customer Name</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Expected Delivery</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  };

  if (overdueOrders && overdueOrders.length > 0) {
    sections.push(`
      <div style="margin-bottom: 24px; background-color: #fff3e0; padding: 16px; border-left: 5px solid #ff6f00; border-radius: 4px;">
        <h2 style="color: #ff6f00; margin-top: 0; margin-bottom: 12px;">
          🔴 OVERDUE - IMMEDIATE ACTION REQUIRED (${overdueOrders.length})
        </h2>
        <p style="margin: 0 0 12px 0; color: #f57c00; font-weight: bold;">
          These orders have passed their expected delivery date and require immediate attention!
        </p>
        ${renderOrdersTable(overdueOrders)}
      </div>
    `);
  }

  sections.push(`
    <div style="margin-bottom: 24px; background-color: #ffebee; padding: 16px; border-left: 5px solid #d32f2f; border-radius: 4px;">
      <h2 style="color: #d32f2f; margin-top: 0; margin-bottom: 12px;">
        🚨 URGENT: Due Today or Tomorrow (${oneDayOrders ? oneDayOrders.length : 0})
      </h2>
      <p style="margin: 0 0 12px 0; color: #c62828;">
        High priority - delivery expected within 24-48 hours
      </p>
      ${renderOrdersTable(oneDayOrders)}
    </div>
  `);

  sections.push(`
    <div style="margin-bottom: 24px; background-color: #fff3e0; padding: 16px; border-left: 5px solid #ed6c02; border-radius: 4px;">
      <h2 style="color: #ed6c02; margin-top: 0; margin-bottom: 12px;">
        ⚠️ Important: Due in 2–3 Days (${threeDayOrders ? threeDayOrders.length : 0})
      </h2>
      <p style="margin: 0 0 12px 0; color: #e65100;">
        Medium priority - prepare for upcoming deliveries
      </p>
      ${renderOrdersTable(threeDayOrders)}
    </div>
  `);

  sections.push(`
    <div style="margin-bottom: 24px; background-color: #e3f2fd; padding: 16px; border-left: 5px solid #0288d1; border-radius: 4px;">
      <h2 style="color: #0288d1; margin-top: 0; margin-bottom: 12px;">
        📅 Upcoming: Due in 4–7 Days (${sevenDayOrders ? sevenDayOrders.length : 0})
      </h2>
      <p style="margin: 0 0 12px 0; color: #01579b;">
        Plan ahead - deliveries expected later this week
      </p>
      ${renderOrdersTable(sevenDayOrders)}
    </div>
  `);

  const totalPending = (overdueOrders ? overdueOrders.length : 0) + 
                       (oneDayOrders ? oneDayOrders.length : 0) + 
                       (threeDayOrders ? threeDayOrders.length : 0) + 
                       (sevenDayOrders ? sevenDayOrders.length : 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Daily Order Reminder</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: #1976d2; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">
          ⏰ Daily Order Reminder
        </h1>
        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">
          ${digestDate} (IST) • ${totalPending} pending order${totalPending === 1 ? '' : 's'} requiring attention
        </p>
      </div>
      <div style="background-color: white; padding: 20px; border-radius: 0 0 8px 8px;">
        <div style="background-color: #fff9c4; border-left: 4px solid #f9a825; padding: 12px; margin-bottom: 24px; border-radius: 4px;">
          <p style="margin: 0; color: #f57f17; font-weight: bold;">
            ℹ️ This is your daily reminder of all pending orders grouped by urgency level.
          </p>
        </div>
        ${sections.join('')}
        <hr style="border: none; border-top: 1px solid #ddd; margin-top: 24px;">
        <p style="color: #999; font-size: 12px; margin-top: 16px;">
          This is an automated reminder from the Order Management System. 
          You receive this email daily to help prioritize and manage pending deliveries.
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Build the plain text content for the digest email
 * This avoids the need for HTML stripping and the associated security concerns
 * @param {Object} buckets - Object containing orders for each tier
 * @param {Array} buckets.overdueOrders - Overdue orders (past expected delivery date)
 * @param {Array} buckets.oneDayOrders - Orders due in 1 day
 * @param {Array} buckets.threeDayOrders - Orders due in 3 days
 * @param {Array} buckets.sevenDayOrders - Orders due in 7 days
 * @param {string} digestDate - The digest date (YYYY-MM-DD in Kolkata)
 * @param {Function} formatDate - Function to format dates
 * @returns {string} Plain text content for the email
 */
export function buildDigestEmailText({ overdueOrders, oneDayOrders, threeDayOrders, sevenDayOrders }, digestDate, formatDate) {
  const lines = [];
  
  const totalPending = (overdueOrders ? overdueOrders.length : 0) + 
                       (oneDayOrders ? oneDayOrders.length : 0) + 
                       (threeDayOrders ? threeDayOrders.length : 0) + 
                       (sevenDayOrders ? sevenDayOrders.length : 0);
  
  lines.push('⏰ DAILY ORDER REMINDER - ACTION REQUIRED');
  lines.push('==========================================');
  lines.push(`Report for ${digestDate} (IST)`);
  lines.push(`Total Pending Orders: ${totalPending}`);
  lines.push('');
  lines.push('ℹ️ This is your daily reminder of all pending orders grouped by urgency level.');
  lines.push('');

  const renderOrdersList = (title, orders, description) => {
    lines.push('');
    lines.push(title);
    lines.push('='.repeat(title.length));
    if (description) {
      lines.push(description);
      lines.push('');
    }
    if (!orders || orders.length === 0) {
      lines.push('None');
    } else {
      for (const order of orders) {
        lines.push(`• ${order.orderId} | ${order.customerName} | ${formatDate(order.expectedDeliveryDate)} | ${order.status}`);
      }
    }
    lines.push('');
  };

  if (overdueOrders && overdueOrders.length > 0) {
    renderOrdersList(
      `🔴 OVERDUE - IMMEDIATE ACTION REQUIRED (${overdueOrders.length})`,
      overdueOrders,
      'These orders have passed their expected delivery date and require immediate attention!'
    );
  }

  renderOrdersList(
    `🚨 URGENT: DUE TODAY OR TOMORROW (${oneDayOrders ? oneDayOrders.length : 0})`,
    oneDayOrders,
    'High priority - delivery expected within 24-48 hours'
  );
  
  renderOrdersList(
    `⚠️ IMPORTANT: DUE IN 2–3 DAYS (${threeDayOrders ? threeDayOrders.length : 0})`,
    threeDayOrders,
    'Medium priority - prepare for upcoming deliveries'
  );
  
  renderOrdersList(
    `📅 UPCOMING: DUE IN 4–7 DAYS (${sevenDayOrders ? sevenDayOrders.length : 0})`,
    sevenDayOrders,
    'Plan ahead - deliveries expected later this week'
  );

  lines.push('---');
  lines.push('This is an automated reminder from the Order Management System.');
  lines.push('You receive this email daily to help prioritize and manage pending deliveries.');
  
  return lines.join('\n');
}
