// @ts-nocheck
import { eq, desc, sql, ilike, or, and, inArray } from 'drizzle-orm';
import { getDatabase } from '@/lib/db/connection';
import { customers, orders, orderItems } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/utils/dbRetry';
import type { Customer, CustomerSummary, CreateCustomerData, UpdateCustomerData, CustomerSource } from '@/types/entities';

/**
 * Generate a unique customer ID in format "CUST-XXXX"
 */
function generateCustomerId(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `CUST-${randomNum}`;
}

/**
 * Transform database row to Customer entity
 */
function transformCustomer(row: any): Customer {
  return {
    id: row.id,
    _id: row.id,
    customerId: row.customerId,
    name: row.name,
    email: row.email || null,
    phone: row.phone || null,
    address: row.address || null,
    source: row.source || 'other',
    totalOrders: row.totalOrders ?? 0,
    totalSpent: Number.parseFloat(row.totalSpent || '0'),
    firstOrderDate: row.firstOrderDate?.toISOString() || null,
    lastOrderDate: row.lastOrderDate?.toISOString() || null,
    notes: row.notes || null,
    createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Transform database row to CustomerSummary for autocomplete
 */
function transformCustomerSummary(row: any): CustomerSummary {
  return {
    id: row.id,
    customerId: row.customerId,
    name: row.name,
    phone: row.phone || null,
  };
}

export interface FindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
  source?: CustomerSource;
}

export interface PaginatedCustomerResult {
  customers: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

const Customer = {
  /**
   * Get paginated list of customers with optional filters
   */
  async findAll(options: FindAllOptions = {}): Promise<PaginatedCustomerResult> {
    const { page = 1, limit = 20, search, source } = options;
    const offset = (page - 1) * limit;

    return executeWithRetry(async () => {
      const db = getDatabase();
      
      // Build conditions array
      const conditions = [];
      
      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(
          or(
            ilike(customers.name, searchPattern),
            ilike(customers.phone, searchPattern),
            ilike(customers.email, searchPattern),
            ilike(customers.customerId, searchPattern)
          )
        );
      }
      
      if (source) {
        conditions.push(eq(customers.source, source));
      }

      // Get total count
      const countQuery = conditions.length > 0
        ? db.select({ count: sql<number>`count(*)::int` })
            .from(customers)
            .where(and(...conditions))
        : db.select({ count: sql<number>`count(*)::int` }).from(customers);
      
      const [{ count: total }] = await countQuery;

      // Get paginated results
      const dataQuery = conditions.length > 0
        ? db.select()
            .from(customers)
            .where(and(...conditions))
            .orderBy(desc(customers.lastOrderDate), desc(customers.createdAt))
            .limit(limit)
            .offset(offset)
        : db.select()
            .from(customers)
            .orderBy(desc(customers.lastOrderDate), desc(customers.createdAt))
            .limit(limit)
            .offset(offset);

      const result = await dataQuery;
      const totalPages = Math.ceil(total / limit);

      return {
        customers: result.map(transformCustomer),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
        },
      };
    }, { operationName: 'Customer.findAll' });
  },

  /**
   * Find a single customer by database ID
   */
  async findById(id: number): Promise<Customer | null> {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(id), 10);
      if (Number.isNaN(numericId)) return null;

      const result = await db
        .select()
        .from(customers)
        .where(eq(customers.id, numericId))
        .limit(1);

      if (result.length === 0) return null;
      return transformCustomer(result[0]);
    }, { operationName: 'Customer.findById' });
  },

  /**
   * Find a customer by their business ID (CUST-XXXX)
   */
  async findByCustomerId(customerId: string): Promise<Customer | null> {
    return executeWithRetry(async () => {
      const db = getDatabase();
      
      const result = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, customerId.trim()))
        .limit(1);

      if (result.length === 0) return null;
      return transformCustomer(result[0]);
    }, { operationName: 'Customer.findByCustomerId' });
  },

  /**
   * Search customers for autocomplete (by name, phone, email)
   * Returns CustomerSummary[] for quick lookup
   */
  async search(query: string, limit = 10): Promise<CustomerSummary[]> {
    return executeWithRetry(async () => {
      const db = getDatabase();
      
      if (!query || query.trim().length === 0) {
        return [];
      }

      const searchPattern = `%${query.trim()}%`;
      
      const result = await db
        .select({
          id: customers.id,
          customerId: customers.customerId,
          name: customers.name,
          phone: customers.phone,
        })
        .from(customers)
        .where(
          or(
            ilike(customers.name, searchPattern),
            ilike(customers.phone, searchPattern),
            ilike(customers.email, searchPattern),
            ilike(customers.customerId, searchPattern)
          )
        )
        .orderBy(desc(customers.lastOrderDate), customers.name)
        .limit(limit);

      return result.map(transformCustomerSummary);
    }, { operationName: 'Customer.search' });
  },

  /**
   * Create a new customer
   */
  async create(data: CreateCustomerData): Promise<Customer> {
    return executeWithRetry(async () => {
      const db = getDatabase();

      // Generate customerId if not provided
      let customerId = data.customerId?.trim();
      if (!customerId) {
        // Keep generating until we find a unique one
        let isUnique = false;
        while (!isUnique) {
          customerId = generateCustomerId();
          const existing = await db
            .select({ id: customers.id })
            .from(customers)
            .where(eq(customers.customerId, customerId))
            .limit(1);
          isUnique = existing.length === 0;
        }
      }

      const insertData = {
        customerId,
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        source: data.source || 'other',
        notes: data.notes?.trim() || null,
        totalOrders: 0,
        totalSpent: '0',
      };

      const result = await db.insert(customers).values(insertData).returning();
      return transformCustomer(result[0]);
    }, { operationName: 'Customer.create' });
  },

  /**
   * Update an existing customer
   */
  async update(id: number, data: UpdateCustomerData): Promise<Customer | null> {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(id), 10);
      if (Number.isNaN(numericId)) return null;

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (data.customerId !== undefined) {
        updateData.customerId = data.customerId.trim();
      }
      if (data.name !== undefined) {
        updateData.name = data.name.trim();
      }
      if (data.email !== undefined) {
        updateData.email = data.email?.trim() || null;
      }
      if (data.phone !== undefined) {
        updateData.phone = data.phone?.trim() || null;
      }
      if (data.address !== undefined) {
        updateData.address = data.address?.trim() || null;
      }
      if (data.source !== undefined) {
        updateData.source = data.source;
      }
      if (data.notes !== undefined) {
        updateData.notes = data.notes?.trim() || null;
      }

      const result = await db
        .update(customers)
        .set(updateData)
        .where(eq(customers.id, numericId))
        .returning();

      if (result.length === 0) return null;
      return transformCustomer(result[0]);
    }, { operationName: 'Customer.update' });
  },

  /**
   * Delete a customer
   */
  async delete(id: number): Promise<boolean> {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(id), 10);
      if (Number.isNaN(numericId)) return false;

      const result = await db
        .delete(customers)
        .where(eq(customers.id, numericId))
        .returning({ id: customers.id });

      return result.length > 0;
    }, { operationName: 'Customer.delete' });
  },

  /**
   * Get order history for a customer
   */
  async getOrderHistory(id: number): Promise<any[]> {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(id), 10);
      if (Number.isNaN(numericId)) return [];

      // First get the customer to retrieve their customerId
      const customer = await db
        .select({ customerId: customers.customerId })
        .from(customers)
        .where(eq(customers.id, numericId))
        .limit(1);

      if (customer.length === 0) return [];

      const customerIdValue = customer[0].customerId;

      // Get orders by customerId string (matching existing order structure)
      const ordersResult = await db
        .select()
        .from(orders)
        .where(eq(orders.customerId, customerIdValue))
        .orderBy(desc(orders.createdAt));

      if (ordersResult.length === 0) return [];

      // Batch fetch order items
      const orderIds = ordersResult.map(o => o.id);
      const allItems = await db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds));

      // Group items by orderId
      const itemsByOrderId: Record<number, any[]> = {};
      for (const item of allItems) {
        if (!itemsByOrderId[item.orderId]) {
          itemsByOrderId[item.orderId] = [];
        }
        itemsByOrderId[item.orderId].push({
          ...item,
          _id: item.id,
          item: item.itemId,
          price: Number.parseFloat(item.price),
          customizationRequest: item.customizationRequest || '',
        });
      }

      // Transform orders with their items
      return ordersResult.map(order => ({
        id: order.id,
        _id: order.id,
        orderId: order.orderId,
        orderFrom: order.orderFrom,
        customerName: order.customerName,
        customerId: order.customerId,
        address: order.address || '',
        totalPrice: Number.parseFloat(order.totalPrice),
        status: order.status || 'pending',
        paymentStatus: order.paymentStatus || 'unpaid',
        paidAmount: Number.parseFloat(order.paidAmount || '0'),
        confirmationStatus: order.confirmationStatus || 'unconfirmed',
        customerNotes: order.customerNotes || '',
        priority: order.priority || 0,
        orderDate: order.orderDate?.toISOString() || null,
        expectedDeliveryDate: order.expectedDeliveryDate?.toISOString() || null,
        deliveryStatus: order.deliveryStatus || 'not_shipped',
        trackingId: order.trackingId || '',
        deliveryPartner: order.deliveryPartner || '',
        actualDeliveryDate: order.actualDeliveryDate?.toISOString() || null,
        createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
        items: itemsByOrderId[order.id] || [],
      }));
    }, { operationName: 'Customer.getOrderHistory' });
  },

  /**
   * Recalculate customer statistics (totalOrders, totalSpent, lastOrderDate)
   * Call this after order create/update/delete
   */
  async updateStats(id: number): Promise<Customer | null> {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(id), 10);
      if (Number.isNaN(numericId)) return null;

      // Get customer's customerId
      const customer = await db
        .select({ customerId: customers.customerId })
        .from(customers)
        .where(eq(customers.id, numericId))
        .limit(1);

      if (customer.length === 0) return null;

      const customerIdValue = customer[0].customerId;

      // Calculate stats from orders
      const stats = await db
        .select({
          totalOrders: sql<number>`count(*)::int`,
          totalSpent: sql<string>`COALESCE(sum(${orders.totalPrice}), 0)::numeric(10,2)`,
          firstOrderDate: sql<Date>`min(${orders.createdAt})`,
          lastOrderDate: sql<Date>`max(${orders.createdAt})`,
        })
        .from(orders)
        .where(eq(orders.customerId, customerIdValue));

      const { totalOrders, totalSpent, firstOrderDate, lastOrderDate } = stats[0];

      // Update customer with calculated stats
      const result = await db
        .update(customers)
        .set({
          totalOrders: totalOrders || 0,
          totalSpent: totalSpent || '0',
          firstOrderDate: firstOrderDate || null,
          lastOrderDate: lastOrderDate || null,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, numericId))
        .returning();

      if (result.length === 0) return null;
      return transformCustomer(result[0]);
    }, { operationName: 'Customer.updateStats' });
  },

  /**
   * Update stats by customerId string (for use in order hooks)
   */
  async updateStatsByCustomerId(customerId: string): Promise<Customer | null> {
    return executeWithRetry(async () => {
      const db = getDatabase();

      // Find customer by customerId
      const customer = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.customerId, customerId.trim()))
        .limit(1);

      if (customer.length === 0) return null;

      return this.updateStats(customer[0].id);
    }, { operationName: 'Customer.updateStatsByCustomerId' });
  },
};

export default Customer;
