// @ts-nocheck
import { eq, desc, isNull, isNotNull, ilike, or, sql, and, inArray, lt } from 'drizzle-orm';
import { getDatabase } from '@/lib/db/connection';
import { items, itemDesigns } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/utils/dbRetry';

function transformItem(item: any) {
  return {
    ...item,
    _id: item.id,
    price: Number.parseFloat(item.price),
    color: item.color || '',
    fabric: item.fabric || '',
    specialFeatures: item.specialFeatures || '',
    imageUrl: item.imageUrl || '',
    designs: []
  };
}

async function enrichItemsWithDesigns(items: any[]) {
  if (items.length === 0) return items;
  
  const db = getDatabase();
  const itemIds = items.map(item => item.id);
  
  const designs = await db.select().from(itemDesigns)
    .where(inArray(itemDesigns.itemId, itemIds))
    .orderBy(desc(itemDesigns.isPrimary), itemDesigns.displayOrder);
  
  // Group designs by itemId
  const designsByItemId = new Map();
  for (const design of designs) {
    if (!designsByItemId.has(design.itemId)) {
      designsByItemId.set(design.itemId, []);
    }
    designsByItemId.get(design.itemId).push({
      ...design,
      _id: design.id
    });
  }
  
  // Attach designs to items
  return items.map(item => ({
    ...item,
    designs: designsByItemId.get(item.id) || []
  }));
}

function buildSearchCondition(search: any) {
  if (!search?.trim()) return null;
  const searchTerm = `%${search.trim()}%`;
  return or(
    ilike(items.name, searchTerm),
    ilike(items.color, searchTerm),
    ilike(items.fabric, searchTerm),
    ilike(items.specialFeatures, searchTerm)
  );
}

/**
 * Parse and validate cursor for pagination
 * Format: "timestamp:id" (e.g., "2025-12-15T10:35:12.123Z:345")
 * @param {string} cursor - Cursor string
 * @returns {{timestamp: Date, id: number} | null} Parsed cursor or null if invalid
 */
function parseCursor(cursor) {
  if (!cursor) return null;

  // Type check to prevent parameter tampering
  if (typeof cursor !== 'string') return null;

  // Find the last colon to split timestamp from id
  const lastColonIndex = cursor.lastIndexOf(':');
  if (lastColonIndex === -1) return null;

  const timestampStr = cursor.substring(0, lastColonIndex);
  const idStr = cursor.substring(lastColonIndex + 1);

  const timestamp = new Date(timestampStr);
  const id = Number.parseInt(idStr, 10);

  if (Number.isNaN(timestamp.getTime()) || Number.isNaN(id)) {
    return null;
  }

  return { timestamp, id };
}

/**
 * Encode cursor for active items
 * @param {Object} item - Item with createdAt and id
 * @returns {string} Cursor string
 */
function encodeCursor(item: any) {
  return `${item.createdAt.toISOString()}:${item.id}`;
}

/**
 * Encode cursor for deleted items
 * @param {Object} item - Item with deletedAt and id
 * @returns {string} Cursor string
 */
function encodeDeletedCursor(item) {
  return `${item.deletedAt.toISOString()}:${item.id}`;
}

const Item = {
  async find() {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const result = await db.select().from(items)
        .where(isNull(items.deletedAt))
        .orderBy(desc(items.createdAt));
      const transformedItems = result.map(transformItem);
      return enrichItemsWithDesigns(transformedItems);
    }, { operationName: 'Item.find' });
  },

  async findById(id) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(id, 10);
      if (Number.isNaN(numericId)) return null;

      const result = await db.select().from(items).where(eq(items.id, numericId));
      if (result.length === 0) return null;

      const transformedItem = transformItem(result[0]);
      const enrichedItems = await enrichItemsWithDesigns([transformedItem]);
      return enrichedItems[0];
    }, { operationName: 'Item.findById' });
  },

  /**
   * Bulk fetch items by IDs to avoid N+1 query problem
   * @param {number[]} ids - Array of item IDs to fetch
   * @returns {Promise<Map<number, Object>>} Map of item ID to item object
   */
  async findByIds(ids) {
    return executeWithRetry(async () => {
      if (!ids || ids.length === 0) {
        return new Map();
      }

      const db = getDatabase();
      const numericIds = ids
        .map(id => Number.parseInt(id, 10))
        .filter(id => !Number.isNaN(id));

      if (numericIds.length === 0) {
        return new Map();
      }

      const result = await db.select()
        .from(items)
        .where(inArray(items.id, numericIds));

      const transformedItems = result.map(transformItem);
      const enrichedItems = await enrichItemsWithDesigns(transformedItems);

      const itemMap = new Map();
      for (const item of enrichedItems) {
        itemMap.set(item.id, item);
      }

      return itemMap;
    }, { operationName: 'Item.findByIds' });
  },

  async create(data) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const result = await db.insert(items).values({
        name: data.name.trim(),
        price: data.price.toString(),
        color: data.color?.trim() || null,
        fabric: data.fabric?.trim() || null,
        specialFeatures: data.specialFeatures?.trim() || null,
        imageUrl: data.imageUrl || null
      }).returning();

      const transformedItem = transformItem(result[0]);
      const enrichedItems = await enrichItemsWithDesigns([transformedItem]);
      return enrichedItems[0];
    }, { operationName: 'Item.create' });
  },

  async findByIdAndUpdate(id, data) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(id, 10);
      if (Number.isNaN(numericId)) return null;

      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.price !== undefined) updateData.price = data.price.toString();
      if (data.color !== undefined) updateData.color = data.color?.trim() || null;
      if (data.fabric !== undefined) updateData.fabric = data.fabric?.trim() || null;
      if (data.specialFeatures !== undefined) updateData.specialFeatures = data.specialFeatures?.trim() || null;
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null;

      if (Object.keys(updateData).length === 0) {
        return this.findById(id);
      }

      const result = await db.update(items)
        .set(updateData)
        .where(eq(items.id, numericId))
        .returning();

      if (result.length === 0) return null;

      const transformedItem = transformItem(result[0]);
      const enrichedItems = await enrichItemsWithDesigns([transformedItem]);
      return enrichedItems[0];
    }, { operationName: 'Item.findByIdAndUpdate' });
  },

  async findByIdAndDelete(id) {
    const db = getDatabase();
    const numericId = Number.parseInt(id, 10);
    if (Number.isNaN(numericId)) return null;

    const result = await db.update(items)
      .set({ deletedAt: new Date() })
      .where(eq(items.id, numericId))
      .returning();
    if (result.length === 0) return null;

    return transformItem(result[0]);
  },

  async findDeleted() {
    const db = getDatabase();
    const result = await db.select().from(items)
      .where(isNotNull(items.deletedAt))
      .orderBy(desc(items.deletedAt));
    return result.map(transformItem);
  },

  async restore(id) {
    const db = getDatabase();
    const numericId = Number.parseInt(id, 10);
    if (Number.isNaN(numericId)) return null;

    const result = await db.update(items)
      .set({ deletedAt: null })
      .where(eq(items.id, numericId))
      .returning();
    if (result.length === 0) return null;

    return transformItem(result[0]);
  },

  async findPaginated({ page = 1, limit = 10, search = '' }) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const offset = (page - 1) * limit;

      const searchCondition = buildSearchCondition(search);
      const whereCondition = searchCondition 
        ? and(isNull(items.deletedAt), searchCondition)
        : isNull(items.deletedAt);

      const countResult = await db.select({ count: sql`count(*)` })
        .from(items)
        .where(whereCondition);
      const total = Number.parseInt(countResult[0].count, 10);

      const result = await db.select()
        .from(items)
        .where(whereCondition)
        .orderBy(desc(items.createdAt))
        .limit(limit)
        .offset(offset);

      const transformedItems = result.map(transformItem);
      const enrichedItems = await enrichItemsWithDesigns(transformedItems);

      return {
        items: enrichedItems,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      };
    }, { operationName: 'Item.findPaginated' });
  },

  async findDeletedPaginated({ page = 1, limit = 10, search = '' }) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const offset = (page - 1) * limit;

      const searchCondition = buildSearchCondition(search);
      const whereCondition = searchCondition 
        ? and(isNotNull(items.deletedAt), searchCondition)
        : isNotNull(items.deletedAt);

      const countResult = await db.select({ count: sql`count(*)` })
        .from(items)
        .where(whereCondition);
      const total = Number.parseInt(countResult[0].count, 10);

      const result = await db.select()
        .from(items)
        .where(whereCondition)
        .orderBy(desc(items.deletedAt))
        .limit(limit)
        .offset(offset);

      return {
        items: result.map(transformItem),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      };
    }, { operationName: 'Item.findDeletedPaginated' });
  },

  /**
   * Find active items using cursor-based pagination (keyset pagination)
   * @param {Object} params - Query parameters
   * @param {number} params.limit - Number of items to return (default: 10)
   * @param {string} params.cursor - Cursor for pagination (format: "createdAt:id")
   * @param {string} params.search - Search query
   * @returns {Promise<{items: Array, page: {limit: number, nextCursor: string|null, hasMore: boolean}}>}
   * @throws {Error} If cursor format is invalid
   */
  async findCursor({ limit = 10, cursor = null, search = '' }) {
    return executeWithRetry(async () => {
      const db = getDatabase();

      // Validate and parse cursor
      let cursorData = null;
      if (cursor) {
        cursorData = parseCursor(cursor);
        if (!cursorData) {
          throw new Error('Invalid cursor format. Expected format: "createdAt:id"');
        }
      }

      // Build WHERE conditions
      const conditions = [isNull(items.deletedAt)];

      // Add search condition
      const searchCondition = buildSearchCondition(search);
      if (searchCondition) {
        conditions.push(searchCondition);
      }

      // Add cursor condition for keyset pagination
      if (cursorData) {
        // For ORDER BY created_at DESC, id DESC:
        // We want items where (created_at, id) < (cursor_timestamp, cursor_id)
        conditions.push(
          or(
            lt(items.createdAt, cursorData.timestamp),
            and(
              eq(items.createdAt, cursorData.timestamp),
              lt(items.id, cursorData.id)
            )
          )
        );
      }

      const whereCondition = and(...conditions);

      // Fetch limit + 1 to determine if there are more items
      const result = await db.select()
        .from(items)
        .where(whereCondition)
        .orderBy(desc(items.createdAt), desc(items.id))
        .limit(limit + 1);

      // Determine if there are more items
      const hasMore = result.length > limit;

      // Trim to requested limit
      const itemsToReturn = hasMore ? result.slice(0, limit) : result;

      // Generate next cursor from last item
      let nextCursor = null;
      if (hasMore && itemsToReturn.length > 0) {
        const lastItem = itemsToReturn[itemsToReturn.length - 1];
        nextCursor = encodeCursor(lastItem);
      }

      const transformedItems = itemsToReturn.map(transformItem);
      const enrichedItems = await enrichItemsWithDesigns(transformedItems);

      return {
        items: enrichedItems,
        pagination: {
          limit,
          nextCursor,
          hasMore
        }
      };
    }, { operationName: 'Item.findCursor' });
  },

  /**
   * Find deleted items using cursor-based pagination (keyset pagination)
   * @param {Object} params - Query parameters
   * @param {number} params.limit - Number of items to return (default: 10)
   * @param {string} params.cursor - Cursor for pagination (format: "deletedAt:id")
   * @param {string} params.search - Search query
   * @returns {Promise<{items: Array, page: {limit: number, nextCursor: string|null, hasMore: boolean}}>}
   * @throws {Error} If cursor format is invalid
   */
  async findDeletedCursor({ limit = 10, cursor = null, search = '' }) {
    return executeWithRetry(async () => {
      const db = getDatabase();

      // Validate and parse cursor (same format for both active and deleted)
      let cursorData = null;
      if (cursor) {
        cursorData = parseCursor(cursor);
        if (!cursorData) {
          throw new Error('Invalid cursor format. Expected format: "deletedAt:id"');
        }
      }

      // Build WHERE conditions
      const conditions = [isNotNull(items.deletedAt)];

      // Add search condition
      const searchCondition = buildSearchCondition(search);
      if (searchCondition) {
        conditions.push(searchCondition);
      }

      // Add cursor condition for keyset pagination
      if (cursorData) {
        // For ORDER BY deleted_at DESC, id DESC:
        // We want items where (deleted_at, id) < (cursor_timestamp, cursor_id)
        conditions.push(
          or(
            lt(items.deletedAt, cursorData.timestamp),
            and(
              eq(items.deletedAt, cursorData.timestamp),
              lt(items.id, cursorData.id)
            )
          )
        );
      }

      const whereCondition = and(...conditions);

      // Fetch limit + 1 to determine if there are more items
      const result = await db.select()
        .from(items)
        .where(whereCondition)
        .orderBy(desc(items.deletedAt), desc(items.id))
        .limit(limit + 1);

      // Determine if there are more items
      const hasMore = result.length > limit;

      // Trim to requested limit
      const itemsToReturn = hasMore ? result.slice(0, limit) : result;

      // Generate next cursor from last item
      let nextCursor = null;
      if (hasMore && itemsToReturn.length > 0) {
        const lastItem = itemsToReturn[itemsToReturn.length - 1];
        nextCursor = encodeDeletedCursor(lastItem);
      }

      return {
        items: itemsToReturn.map(transformItem),
        pagination: {
          limit,
          nextCursor,
          hasMore
        }
      };
    }, { operationName: 'Item.findDeletedCursor' });
  },

  async permanentlyRemoveImage(id) {
    const db = getDatabase();
    const numericId = Number.parseInt(id, 10);
    if (Number.isNaN(numericId)) return null;

    const result = await db.update(items)
      .set({ imageUrl: null })
      .where(eq(items.id, numericId))
      .returning();
    if (result.length === 0) return null;

    return transformItem(result[0]);
  }
};

export default Item;