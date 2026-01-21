// @ts-nocheck
import { eq, asc, sql, inArray } from 'drizzle-orm';
import { getDatabase } from '@/lib/db/connection';
import { tags, itemTags, items } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/utils/dbRetry';
import { isNull } from 'drizzle-orm';

function transformTag(tag: any) {
  return {
    ...tag,
    _id: tag.id,
    color: tag.color || '#3B82F6',
  };
}

const Tag = {
  /**
   * Get all tags with optional item counts
   */
  async findAll(includeItemCounts = false) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      
      if (includeItemCounts) {
        const result = await db
          .select({
            id: tags.id,
            name: tags.name,
            color: tags.color,
            createdAt: tags.createdAt,
            itemCount: sql<number>`COALESCE(COUNT(DISTINCT ${itemTags.itemId}), 0)::int`,
          })
          .from(tags)
          .leftJoin(itemTags, eq(tags.id, itemTags.tagId))
          .leftJoin(items, eq(itemTags.itemId, items.id))
          .where(isNull(items.deletedAt))
          .groupBy(tags.id)
          .orderBy(asc(tags.name));
        
        return result.map(transformTag);
      }
      
      const result = await db
        .select()
        .from(tags)
        .orderBy(asc(tags.name));
      
      return result.map(transformTag);
    }, { operationName: 'Tag.findAll' });
  },

  /**
   * Get a single tag by ID
   */
  async findById(id: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(id), 10);
      if (Number.isNaN(numericId)) return null;

      const result = await db
        .select()
        .from(tags)
        .where(eq(tags.id, numericId));
      
      if (result.length === 0) return null;
      return transformTag(result[0]);
    }, { operationName: 'Tag.findById' });
  },

  /**
   * Find tag by name (case-insensitive)
   */
  async findByName(name: string) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      
      const result = await db
        .select()
        .from(tags)
        .where(sql`LOWER(${tags.name}) = LOWER(${name.trim()})`);
      
      if (result.length === 0) return null;
      return transformTag(result[0]);
    }, { operationName: 'Tag.findByName' });
  },

  /**
   * Create a new tag
   */
  async create(data: { name: string; color?: string }) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      
      const insertData = {
        name: data.name.trim(),
        color: data.color || '#3B82F6',
      };
      
      const result = await db.insert(tags).values(insertData).returning();
      return transformTag(result[0]);
    }, { operationName: 'Tag.create' });
  },

  /**
   * Create or get tag by name (upsert-like behavior)
   */
  async findOrCreate(name: string, color?: string) {
    return executeWithRetry(async () => {
      const existing = await this.findByName(name);
      if (existing) return existing;
      return this.create({ name, color });
    }, { operationName: 'Tag.findOrCreate' });
  },

  /**
   * Update a tag
   */
  async update(id: number, data: { name?: string; color?: string }) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(id), 10);
      if (Number.isNaN(numericId)) return null;

      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.color !== undefined) updateData.color = data.color;

      if (Object.keys(updateData).length === 0) {
        return this.findById(id);
      }

      const result = await db
        .update(tags)
        .set(updateData)
        .where(eq(tags.id, numericId))
        .returning();
      
      if (result.length === 0) return null;
      return transformTag(result[0]);
    }, { operationName: 'Tag.update' });
  },

  /**
   * Delete a tag
   */
  async delete(id: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(id), 10);
      if (Number.isNaN(numericId)) return false;

      // First, remove all item associations
      await db.delete(itemTags).where(eq(itemTags.tagId, numericId));
      
      // Delete the tag
      const result = await db
        .delete(tags)
        .where(eq(tags.id, numericId))
        .returning();
      
      return result.length > 0;
    }, { operationName: 'Tag.delete' });
  },

  /**
   * Get items with a tag
   */
  async getItems(tagId: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(tagId), 10);
      if (Number.isNaN(numericId)) return [];

      const result = await db
        .select({
          itemId: itemTags.itemId,
        })
        .from(itemTags)
        .innerJoin(items, eq(itemTags.itemId, items.id))
        .where(eq(itemTags.tagId, numericId))
        .where(isNull(items.deletedAt));
      
      return result.map(r => r.itemId);
    }, { operationName: 'Tag.getItems' });
  },

  /**
   * Add items to a tag
   */
  async addItems(tagId: number, itemIds: number[]) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericTagId = Number.parseInt(String(tagId), 10);
      if (Number.isNaN(numericTagId) || itemIds.length === 0) return 0;

      // Get existing associations to avoid duplicates
      const existing = await db
        .select({ itemId: itemTags.itemId })
        .from(itemTags)
        .where(eq(itemTags.tagId, numericTagId));
      
      const existingIds = new Set(existing.map(e => e.itemId));
      const newItemIds = itemIds.filter(id => !existingIds.has(id));
      
      if (newItemIds.length === 0) return 0;

      const values = newItemIds.map(itemId => ({
        tagId: numericTagId,
        itemId,
      }));
      
      await db.insert(itemTags).values(values);
      return newItemIds.length;
    }, { operationName: 'Tag.addItems' });
  },

  /**
   * Remove items from a tag
   */
  async removeItems(tagId: number, itemIds: number[]) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericTagId = Number.parseInt(String(tagId), 10);
      if (Number.isNaN(numericTagId) || itemIds.length === 0) return 0;

      const result = await db
        .delete(itemTags)
        .where(
          sql`${itemTags.tagId} = ${numericTagId} AND ${itemTags.itemId} = ANY(${itemIds})`
        )
        .returning();
      
      return result.length;
    }, { operationName: 'Tag.removeItems' });
  },

  /**
   * Set tags for an item (replaces existing)
   */
  async setItemTags(itemId: number, tagIds: number[]) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericItemId = Number.parseInt(String(itemId), 10);
      if (Number.isNaN(numericItemId)) return false;

      // Remove existing tags
      await db.delete(itemTags).where(eq(itemTags.itemId, numericItemId));
      
      // Add new tags
      if (tagIds.length > 0) {
        const values = tagIds.map(tagId => ({
          itemId: numericItemId,
          tagId,
        }));
        await db.insert(itemTags).values(values);
      }
      
      return true;
    }, { operationName: 'Tag.setItemTags' });
  },

  /**
   * Get tags for an item
   */
  async getItemTags(itemId: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericItemId = Number.parseInt(String(itemId), 10);
      if (Number.isNaN(numericItemId)) return [];

      const result = await db
        .select({
          id: tags.id,
          name: tags.name,
          color: tags.color,
          createdAt: tags.createdAt,
        })
        .from(tags)
        .innerJoin(itemTags, eq(tags.id, itemTags.tagId))
        .where(eq(itemTags.itemId, numericItemId))
        .orderBy(asc(tags.name));
      
      return result.map(transformTag);
    }, { operationName: 'Tag.getItemTags' });
  },

  /**
   * Bulk get tags for multiple items
   */
  async getItemsTagsBulk(itemIds: number[]) {
    return executeWithRetry(async () => {
      if (itemIds.length === 0) return new Map();
      
      const db = getDatabase();
      
      const result = await db
        .select({
          itemId: itemTags.itemId,
          id: tags.id,
          name: tags.name,
          color: tags.color,
          createdAt: tags.createdAt,
        })
        .from(itemTags)
        .innerJoin(tags, eq(itemTags.tagId, tags.id))
        .where(inArray(itemTags.itemId, itemIds))
        .orderBy(asc(tags.name));
      
      // Group by item ID
      const tagsByItemId = new Map<number, any[]>();
      for (const row of result) {
        const { itemId, ...tagData } = row;
        if (!tagsByItemId.has(itemId)) {
          tagsByItemId.set(itemId, []);
        }
        tagsByItemId.get(itemId)!.push(transformTag(tagData));
      }
      
      return tagsByItemId;
    }, { operationName: 'Tag.getItemsTagsBulk' });
  },

  /**
   * Set tags for an item by tag names (creates tags if needed)
   */
  async setItemTagsByNames(itemId: number, tagNames: string[]) {
    return executeWithRetry(async () => {
      const numericItemId = Number.parseInt(String(itemId), 10);
      if (Number.isNaN(numericItemId)) return false;

      // Find or create all tags
      const tagIds: number[] = [];
      for (const name of tagNames) {
        const tag = await this.findOrCreate(name.trim());
        tagIds.push(tag.id);
      }

      // Set tags for item
      return this.setItemTags(itemId, tagIds);
    }, { operationName: 'Tag.setItemTagsByNames' });
  },
};

export default Tag;
