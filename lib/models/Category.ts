// @ts-nocheck
import { eq, desc, asc, isNull, sql, inArray } from 'drizzle-orm';
import { getDatabase } from '@/lib/db/connection';
import { categories, itemCategories, items } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/utils/dbRetry';

function transformCategory(category: any) {
  return {
    ...category,
    _id: category.id,
    description: category.description || '',
    color: category.color || '#6B7280',
    parentId: category.parentId || null,
  };
}

const Category = {
  /**
   * Get all categories with optional item counts
   */
  async findAll(includeItemCounts = false) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      
      if (includeItemCounts) {
        const result = await db
          .select({
            id: categories.id,
            name: categories.name,
            description: categories.description,
            color: categories.color,
            parentId: categories.parentId,
            displayOrder: categories.displayOrder,
            createdAt: categories.createdAt,
            updatedAt: categories.updatedAt,
            itemCount: sql<number>`COALESCE(COUNT(DISTINCT ${itemCategories.itemId}), 0)::int`,
          })
          .from(categories)
          .leftJoin(itemCategories, eq(categories.id, itemCategories.categoryId))
          .leftJoin(items, eq(itemCategories.itemId, items.id))
          .where(isNull(items.deletedAt))
          .groupBy(categories.id)
          .orderBy(asc(categories.displayOrder), asc(categories.name));
        
        return result.map(transformCategory);
      }
      
      const result = await db
        .select()
        .from(categories)
        .orderBy(asc(categories.displayOrder), asc(categories.name));
      
      return result.map(transformCategory);
    }, { operationName: 'Category.findAll' });
  },

  /**
   * Get a single category by ID
   */
  async findById(id: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(id), 10);
      if (Number.isNaN(numericId)) return null;

      const result = await db
        .select()
        .from(categories)
        .where(eq(categories.id, numericId));
      
      if (result.length === 0) return null;
      return transformCategory(result[0]);
    }, { operationName: 'Category.findById' });
  },

  /**
   * Get categories as a tree structure
   */
  async findAsTree() {
    return executeWithRetry(async () => {
      const allCategories = await this.findAll(true);
      
      // Build tree structure
      const categoryMap = new Map();
      const rootCategories: any[] = [];
      
      // First pass: create map
      for (const cat of allCategories) {
        categoryMap.set(cat.id, { ...cat, children: [] });
      }
      
      // Second pass: build tree
      for (const cat of allCategories) {
        const categoryWithChildren = categoryMap.get(cat.id);
        if (cat.parentId && categoryMap.has(cat.parentId)) {
          categoryMap.get(cat.parentId).children.push(categoryWithChildren);
        } else {
          rootCategories.push(categoryWithChildren);
        }
      }
      
      return rootCategories;
    }, { operationName: 'Category.findAsTree' });
  },

  /**
   * Create a new category
   */
  async create(data: {
    name: string;
    description?: string;
    color?: string;
    parentId?: number;
    displayOrder?: number;
  }) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      
      const insertData = {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        color: data.color || '#6B7280',
        parentId: data.parentId || null,
        displayOrder: data.displayOrder ?? 0,
      };
      
      const result = await db.insert(categories).values(insertData).returning();
      return transformCategory(result[0]);
    }, { operationName: 'Category.create' });
  },

  /**
   * Update a category
   */
  async update(id: number, data: {
    name?: string;
    description?: string;
    color?: string;
    parentId?: number | null;
    displayOrder?: number;
  }) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(id), 10);
      if (Number.isNaN(numericId)) return null;

      const updateData: any = { updatedAt: new Date() };
      
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.description !== undefined) updateData.description = data.description?.trim() || null;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.parentId !== undefined) updateData.parentId = data.parentId;
      if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;

      const result = await db
        .update(categories)
        .set(updateData)
        .where(eq(categories.id, numericId))
        .returning();
      
      if (result.length === 0) return null;
      return transformCategory(result[0]);
    }, { operationName: 'Category.update' });
  },

  /**
   * Delete a category
   */
  async delete(id: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(id), 10);
      if (Number.isNaN(numericId)) return false;

      // First, remove all item associations
      await db.delete(itemCategories).where(eq(itemCategories.categoryId, numericId));
      
      // Update children to have no parent
      await db
        .update(categories)
        .set({ parentId: null, updatedAt: new Date() })
        .where(eq(categories.parentId, numericId));
      
      // Delete the category
      const result = await db
        .delete(categories)
        .where(eq(categories.id, numericId))
        .returning();
      
      return result.length > 0;
    }, { operationName: 'Category.delete' });
  },

  /**
   * Get items in a category
   */
  async getItems(categoryId: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(categoryId), 10);
      if (Number.isNaN(numericId)) return [];

      const result = await db
        .select({
          itemId: itemCategories.itemId,
        })
        .from(itemCategories)
        .innerJoin(items, eq(itemCategories.itemId, items.id))
        .where(eq(itemCategories.categoryId, numericId))
        .where(isNull(items.deletedAt));
      
      return result.map(r => r.itemId);
    }, { operationName: 'Category.getItems' });
  },

  /**
   * Add items to a category
   */
  async addItems(categoryId: number, itemIds: number[]) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericCategoryId = Number.parseInt(String(categoryId), 10);
      if (Number.isNaN(numericCategoryId) || itemIds.length === 0) return 0;

      // Get existing associations to avoid duplicates
      const existing = await db
        .select({ itemId: itemCategories.itemId })
        .from(itemCategories)
        .where(eq(itemCategories.categoryId, numericCategoryId));
      
      const existingIds = new Set(existing.map(e => e.itemId));
      const newItemIds = itemIds.filter(id => !existingIds.has(id));
      
      if (newItemIds.length === 0) return 0;

      const values = newItemIds.map(itemId => ({
        categoryId: numericCategoryId,
        itemId,
      }));
      
      await db.insert(itemCategories).values(values);
      return newItemIds.length;
    }, { operationName: 'Category.addItems' });
  },

  /**
   * Remove items from a category
   */
  async removeItems(categoryId: number, itemIds: number[]) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericCategoryId = Number.parseInt(String(categoryId), 10);
      if (Number.isNaN(numericCategoryId) || itemIds.length === 0) return 0;

      const result = await db
        .delete(itemCategories)
        .where(
          sql`${itemCategories.categoryId} = ${numericCategoryId} AND ${itemCategories.itemId} = ANY(${itemIds})`
        )
        .returning();
      
      return result.length;
    }, { operationName: 'Category.removeItems' });
  },

  /**
   * Set categories for an item (replaces existing)
   */
  async setItemCategories(itemId: number, categoryIds: number[]) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericItemId = Number.parseInt(String(itemId), 10);
      if (Number.isNaN(numericItemId)) return false;

      // Remove existing categories
      await db.delete(itemCategories).where(eq(itemCategories.itemId, numericItemId));
      
      // Add new categories
      if (categoryIds.length > 0) {
        const values = categoryIds.map(categoryId => ({
          itemId: numericItemId,
          categoryId,
        }));
        await db.insert(itemCategories).values(values);
      }
      
      return true;
    }, { operationName: 'Category.setItemCategories' });
  },

  /**
   * Get categories for an item
   */
  async getItemCategories(itemId: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericItemId = Number.parseInt(String(itemId), 10);
      if (Number.isNaN(numericItemId)) return [];

      const result = await db
        .select({
          id: categories.id,
          name: categories.name,
          description: categories.description,
          color: categories.color,
          parentId: categories.parentId,
          displayOrder: categories.displayOrder,
          createdAt: categories.createdAt,
          updatedAt: categories.updatedAt,
        })
        .from(categories)
        .innerJoin(itemCategories, eq(categories.id, itemCategories.categoryId))
        .where(eq(itemCategories.itemId, numericItemId))
        .orderBy(asc(categories.displayOrder), asc(categories.name));
      
      return result.map(transformCategory);
    }, { operationName: 'Category.getItemCategories' });
  },

  /**
   * Bulk get categories for multiple items
   */
  async getItemsCategoriesBulk(itemIds: number[]) {
    return executeWithRetry(async () => {
      if (itemIds.length === 0) return new Map();
      
      const db = getDatabase();
      
      const result = await db
        .select({
          itemId: itemCategories.itemId,
          id: categories.id,
          name: categories.name,
          description: categories.description,
          color: categories.color,
          parentId: categories.parentId,
          displayOrder: categories.displayOrder,
          createdAt: categories.createdAt,
          updatedAt: categories.updatedAt,
        })
        .from(itemCategories)
        .innerJoin(categories, eq(itemCategories.categoryId, categories.id))
        .where(inArray(itemCategories.itemId, itemIds))
        .orderBy(asc(categories.displayOrder), asc(categories.name));
      
      // Group by item ID
      const categoriesByItemId = new Map<number, any[]>();
      for (const row of result) {
        const { itemId, ...categoryData } = row;
        if (!categoriesByItemId.has(itemId)) {
          categoriesByItemId.set(itemId, []);
        }
        categoriesByItemId.get(itemId)!.push(transformCategory(categoryData));
      }
      
      return categoriesByItemId;
    }, { operationName: 'Category.getItemsCategoriesBulk' });
  },
};

export default Category;
