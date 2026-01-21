// @ts-nocheck
import { eq, desc, sql, asc, inArray, and, or, lt } from 'drizzle-orm';
import { getDatabase } from '@/lib/db/connection';
import { orders, orderItems } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/utils/dbRetry';

function generateOrderId(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `ORD${randomNum}`;
}

function transformOrderItem(item) {
  return {
    ...item,
    _id: item.id,
    item: item.itemId,
    price: Number.parseFloat(item.price),
    customizationRequest: item.customizationRequest || ''
  };
}

function transformOrder(order: any, items: any[] = []) {
  return {
    ...order,
    _id: order.id,
    totalPrice: Number.parseFloat(order.totalPrice),
    paidAmount: Number.parseFloat(order.paidAmount || 0),
    status: order.status || 'pending',
    paymentStatus: order.paymentStatus || 'unpaid',
    confirmationStatus: order.confirmationStatus || 'unconfirmed',
    customerNotes: order.customerNotes || '',
    address: order.address || '',
    priority: order.priority || 0,
    orderDate: order.orderDate ? order.orderDate.toISOString() : null,
    expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.toISOString() : null,
    deliveryStatus: order.deliveryStatus || 'not_shipped',
    trackingId: order.trackingId || '',
    deliveryPartner: order.deliveryPartner || '',
    actualDeliveryDate: order.actualDeliveryDate ? order.actualDeliveryDate.toISOString() : null,
    items: items.map(transformOrderItem)
  };
}

function setFieldIfDefined(updateData: any, key: string, value: any, transformer?: any) {
  if (value !== undefined) {
    updateData[key] = transformer ? transformer(value) : value;
  }
}

function buildOrderUpdateData(data: any) {
  const updateData = {};

  setFieldIfDefined(updateData, 'orderFrom', data.orderFrom);
  setFieldIfDefined(updateData, 'customerName', data.customerName, v => v.trim());
  setFieldIfDefined(updateData, 'customerId', data.customerId, v => v.trim());
  setFieldIfDefined(updateData, 'address', data.address, v => v?.trim() || null);
  setFieldIfDefined(updateData, 'totalPrice', data.totalPrice, v => v.toString());
  setFieldIfDefined(updateData, 'orderDate', data.orderDate, v => v ? new Date(v) : null);
  setFieldIfDefined(updateData, 'expectedDeliveryDate', data.expectedDeliveryDate, v => v ? new Date(v) : null);
  setFieldIfDefined(updateData, 'status', data.status);
  setFieldIfDefined(updateData, 'paymentStatus', data.paymentStatus);
  setFieldIfDefined(updateData, 'paidAmount', data.paidAmount, v => v.toString());
  setFieldIfDefined(updateData, 'confirmationStatus', data.confirmationStatus);
  setFieldIfDefined(updateData, 'customerNotes', data.customerNotes, v => v?.trim() || null);
  setFieldIfDefined(updateData, 'priority', data.priority);
  setFieldIfDefined(updateData, 'deliveryStatus', data.deliveryStatus);
  setFieldIfDefined(updateData, 'trackingId', data.trackingId, v => v?.trim() || null);
  setFieldIfDefined(updateData, 'deliveryPartner', data.deliveryPartner, v => v?.trim() || null);
  setFieldIfDefined(updateData, 'actualDeliveryDate', data.actualDeliveryDate, v => v ? new Date(v) : null);

  return updateData;
}

async function updateOrderItems(db: any, orderId: number, items: any[]) {
  await db.delete(orderItems).where(eq(orderItems.orderId, orderId));

  if (items.length > 0) {
    const orderItemsData = items.map(item => ({
      orderId: orderId,
      itemId: item.item,
      designId: item.designId || null,
      name: item.name,
      price: item.price.toString(),
      quantity: item.quantity,
      customizationRequest: item.customizationRequest?.trim() || null
    }));

    await db.insert(orderItems).values(orderItemsData);
  }
}

/**
 * Encode cursor for pagination
 * Format: base64(JSON({createdAt, id}))
 * @param {Object} order - Order object with createdAt and id
 * @returns {string} Base64 encoded cursor
 */
function encodeCursor(order) {
  const cursorData = {
    createdAt: order.createdAt.toISOString(),
    id: order.id
  };
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

/**
 * Decode cursor for pagination
 * @param {string} cursor - Base64 encoded cursor
 * @returns {{createdAt: Date, id: number}|null} Decoded cursor or null if invalid
 */
function decodeCursor(cursor) {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    return {
      createdAt: new Date(parsed.createdAt),
      id: parsed.id
    };
  } catch (error: any) {
    return null;
  }
}

const Order = {
  async find() {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const ordersResult = await db.select().from(orders).orderBy(desc(orders.createdAt));

      // Fix N+1 query problem: Fetch all items in ONE query instead of looping
      // This optimization reduces 101 queries to 2 queries for 100 orders (98% reduction)
      // Before: 1 query for orders + N queries for items = O(n+1)
      // After: 1 query for orders + 1 query for all items = O(2)
      if (ordersResult.length === 0) {
        return [];
      }

      const orderIds = ordersResult.map(o => o.id);
      const allItems = await db.select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds));

      // Group items by orderId for efficient lookup
      const itemsByOrderId = allItems.reduce((acc, item) => {
        if (!acc[item.orderId]) acc[item.orderId] = [];
        acc[item.orderId].push(item);
        return acc;
      }, {});

      // Transform orders with their items
      return ordersResult.map(order => 
        transformOrder(order, itemsByOrderId[order.id] || [])
      );
    }, { operationName: 'Order.find' });
  },

  /**
   * Find orders with DB-level pagination for optimal performance
   * @param {Object} params - Pagination parameters
   * @param {number} params.page - Page number (1-indexed)
   * @param {number} params.limit - Items per page
   * @returns {Promise<{orders: Array, pagination: Object}>}
   */
  async findPaginated({ page = 1, limit = 10 }) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const offset = (page - 1) * limit;

      // Get total count for pagination metadata
      const countResult = await db.select({ count: sql`count(*)` }).from(orders);
      const total = Number.parseInt(countResult[0].count, 10);

      // Get paginated orders with LIMIT and OFFSET at DB level
      const ordersResult = await db.select()
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);

      if (ordersResult.length === 0) {
        return {
          orders: [],
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
      }

      // Bulk fetch items for all orders (avoids N+1)
      const orderIds = ordersResult.map(o => o.id);
      const allItems = await db.select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds));

      // Group items by orderId
      const itemsByOrderId = allItems.reduce((acc, item) => {
        if (!acc[item.orderId]) acc[item.orderId] = [];
        acc[item.orderId].push(item);
        return acc;
      }, {});

      // Transform orders with their items
      const transformedOrders = ordersResult.map(order => 
        transformOrder(order, itemsByOrderId[order.id] || [])
      );

      return {
        orders: transformedOrders,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      };
    }, { operationName: 'Order.findPaginated' });
  },

  /**
   * Find orders with cursor-based pagination for stable infinite scroll
   * Uses composite index (created_at DESC, id DESC) for optimal performance
   * @param {Object} params - Pagination parameters
   * @param {number} params.limit - Items per page (default: 10, max: 100)
   * @param {string} params.cursor - Cursor from previous page (base64 encoded)
   * @returns {Promise<{orders: Array, pagination: Object}>}
   */
  async findCursorPaginated({ limit = 10, cursor = null }) {
    return executeWithRetry(async () => {
      const db = getDatabase();

      // Validate and cap limit
      const validLimit = Math.min(Math.max(1, limit), 100);

      let query = db.select().from(orders);

      // If cursor provided, decode and apply WHERE clause
      if (cursor) {
        const decodedCursor = decodeCursor(cursor);
        if (!decodedCursor) {
          throw new Error('Invalid cursor format');
        }

        // Use composite WHERE for stable pagination: (created_at, id) < (cursor_created_at, cursor_id)
        // This leverages the composite index (created_at DESC, id DESC)
        query = query.where(
          or(
            lt(orders.createdAt, decodedCursor.createdAt),
            and(
              eq(orders.createdAt, decodedCursor.createdAt),
              lt(orders.id, decodedCursor.id)
            )
          )
        );
      }

      // Order by created_at DESC, id DESC and fetch limit + 1 to determine hasMore
      const ordersResult = await query
        .orderBy(desc(orders.createdAt), desc(orders.id))
        .limit(validLimit + 1);

      // Check if there are more results
      const hasMore = ordersResult.length > validLimit;

      // Trim to actual limit
      const ordersToReturn = hasMore ? ordersResult.slice(0, validLimit) : ordersResult;

      if (ordersToReturn.length === 0) {
        return {
          orders: [],
          pagination: { limit: validLimit, nextCursor: null, hasMore: false }
        };
      }

      // Bulk fetch items for all orders (avoids N+1)
      const orderIds = ordersToReturn.map(o => o.id);
      const allItems = await db.select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds));

      // Group items by orderId
      const itemsByOrderId = allItems.reduce((acc, item) => {
        if (!acc[item.orderId]) acc[item.orderId] = [];
        acc[item.orderId].push(item);
        return acc;
      }, {});

      // Transform orders with their items
      const transformedOrders = ordersToReturn.map(order => 
        transformOrder(order, itemsByOrderId[order.id] || [])
      );

      // Generate next cursor from last item
      const nextCursor = hasMore ? encodeCursor(ordersToReturn[ordersToReturn.length - 1]) : null;

      return {
        orders: transformedOrders,
        pagination: { limit: validLimit, nextCursor, hasMore }
      };
    }, { operationName: 'Order.findCursorPaginated' });
  },

  async findById(id) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(id, 10);
      if (Number.isNaN(numericId)) return null;

      const ordersResult = await db.select().from(orders).where(eq(orders.id, numericId));
      if (ordersResult.length === 0) return null;

      const order = ordersResult[0];
      const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

      return transformOrder(order, itemsResult);
    }, { operationName: 'Order.findById' });
  },

  async findPriorityOrders() {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const now = new Date();

      // Get orders that need attention:
      // 1. High priority (priority >= 5) AND not completed/cancelled
      // 2. Delivery date within next 3 days AND not completed/cancelled
      // 3. Overdue (delivery date in the past) AND not completed/cancelled
      const ordersResult = await db.select()
        .from(orders)
        .where(
          sql`(
            (${orders.priority} >= 5 OR
            (${orders.expectedDeliveryDate} IS NOT NULL AND ${orders.expectedDeliveryDate} <= ${new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)}) OR
            (${orders.expectedDeliveryDate} IS NOT NULL AND ${orders.expectedDeliveryDate} < ${now}))
            AND ${orders.status} NOT IN ('completed', 'cancelled')
          )`
        )
        .orderBy(
          sql`CASE 
            WHEN ${orders.expectedDeliveryDate} IS NOT NULL AND ${orders.expectedDeliveryDate} < ${now} THEN 1
            WHEN ${orders.expectedDeliveryDate} IS NOT NULL AND ${orders.expectedDeliveryDate} <= ${new Date(now.getTime() + 24 * 60 * 60 * 1000)} THEN 2
            WHEN ${orders.priority} >= 8 THEN 3
            WHEN ${orders.expectedDeliveryDate} IS NOT NULL AND ${orders.expectedDeliveryDate} <= ${new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)} THEN 4
            WHEN ${orders.priority} >= 5 THEN 5
            ELSE 6
          END`,
          asc(orders.expectedDeliveryDate),
          desc(orders.priority)
        );

      // Fix N+1 query problem: Fetch all items in ONE query instead of looping with Promise.all
      // This optimization reduces queries from O(n+1) to O(2) for better performance
      // Before: 1 query for orders + N queries for items (one per order)
      // After: 1 query for orders + 1 query for all items
      if (ordersResult.length === 0) {
        return [];
      }

      const orderIds = ordersResult.map(o => o.id);
      const allItems = await db.select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds));

      // Group items by orderId for efficient lookup
      const itemsByOrderId = allItems.reduce((acc, item) => {
        if (!acc[item.orderId]) acc[item.orderId] = [];
        acc[item.orderId].push(item);
        return acc;
      }, {});

      // Transform orders with their items
      const ordersWithItems = ordersResult.map(order => 
        transformOrder(order, itemsByOrderId[order.id] || [])
      );

      return ordersWithItems;
    }, { operationName: 'Order.findPriorityOrders' });
  },

  async create(data) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const orderId = generateOrderId();

      const orderResult = await db.insert(orders).values({
        orderId: orderId,
        orderFrom: data.orderFrom,
        customerName: data.customerName.trim(),
        customerId: data.customerId.trim(),
        address: data.address?.trim() || null,
        totalPrice: data.totalPrice.toString(),
        paidAmount: (data.paidAmount || 0).toString(),
        paymentStatus: data.paymentStatus || 'unpaid',
        confirmationStatus: data.confirmationStatus || 'unconfirmed',
        customerNotes: data.customerNotes?.trim() || null,
        priority: data.priority || 0,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        deliveryStatus: data.deliveryStatus || 'not_shipped',
        trackingId: data.trackingId?.trim() || null,
        deliveryPartner: data.deliveryPartner?.trim() || null,
        actualDeliveryDate: data.actualDeliveryDate ? new Date(data.actualDeliveryDate) : null
      }).returning();

      const newOrder = orderResult[0];

      const orderItemsData = data.items.map(item => ({
        orderId: newOrder.id,
        itemId: item.item,
        designId: item.designId || null,
        name: item.name,
        price: item.price.toString(),
        quantity: item.quantity,
        customizationRequest: item.customizationRequest?.trim() || null
      }));

      const itemsResult = await db.insert(orderItems).values(orderItemsData).returning();

      return transformOrder(newOrder, itemsResult);
    }, { operationName: 'Order.create' });
  },

  async findByIdAndUpdate(id, data) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(id, 10);
      if (Number.isNaN(numericId)) return null;

      const existingOrder = await db.select().from(orders).where(eq(orders.id, numericId));
      if (existingOrder.length === 0) return null;

      const updateData = buildOrderUpdateData(data);

      if (Object.keys(updateData).length > 0) {
        await db.update(orders)
          .set(updateData)
          .where(eq(orders.id, numericId));
      }

      if (data.items && Array.isArray(data.items)) {
        await updateOrderItems(db, numericId, data.items);
      }

      return this.findById(numericId);
    }, { operationName: 'Order.findByIdAndUpdate' });
  }
};

export default Order;