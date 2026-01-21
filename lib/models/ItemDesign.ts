import { eq, desc, and } from 'drizzle-orm';
import { getDatabase } from '@/lib/db/connection';
import { itemDesigns } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/utils/dbRetry';

interface ItemDesignData {
  itemId: number;
  designName: string;
  imageUrl: string;
  isPrimary?: boolean;
  displayOrder?: number;
}

interface ItemDesignRow {
  id: number;
  itemId: number;
  designName: string;
  imageUrl: string;
  isPrimary: boolean;
  displayOrder: number;
  createdAt: Date;
}

function transformItemDesign(design: ItemDesignRow) {
  return {
    ...design,
    _id: design.id,
    itemId: design.itemId
  };
}

const ItemDesign = {
  async findByItemId(itemId: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = parseInt(String(itemId), 10);
      if (isNaN(numericId)) return [];

      const result = await db.select().from(itemDesigns)
        .where(eq(itemDesigns.itemId, numericId))
        .orderBy(desc(itemDesigns.isPrimary), itemDesigns.displayOrder);
      
      return result.map(transformItemDesign);
    }, { operationName: 'ItemDesign.findByItemId' });
  },

  async create(data: ItemDesignData) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      
      const result = await db.insert(itemDesigns).values({
        itemId: data.itemId,
        designName: data.designName.trim(),
        imageUrl: data.imageUrl,
        isPrimary: data.isPrimary || false,
        displayOrder: data.displayOrder || 0
      }).returning();

      return transformItemDesign(result[0]);
    }, { operationName: 'ItemDesign.create' });
  },

  async delete(id: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = parseInt(String(id), 10);
      if (isNaN(numericId)) return null;

      const result = await db.delete(itemDesigns)
        .where(eq(itemDesigns.id, numericId))
        .returning();
      
      if (result.length === 0) return null;
      return transformItemDesign(result[0]);
    }, { operationName: 'ItemDesign.delete' });
  },

  async updatePrimary(itemId: number, designId: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericItemId = parseInt(String(itemId), 10);
      const numericDesignId = parseInt(String(designId), 10);
      
      if (isNaN(numericItemId) || isNaN(numericDesignId)) return null;

      await db.update(itemDesigns)
        .set({ isPrimary: false })
        .where(eq(itemDesigns.itemId, numericItemId));

      const result = await db.update(itemDesigns)
        .set({ isPrimary: true })
        .where(and(
          eq(itemDesigns.itemId, numericItemId),
          eq(itemDesigns.id, numericDesignId)
        ))
        .returning();
      
      if (result.length === 0) return null;
      return transformItemDesign(result[0]);
    }, { operationName: 'ItemDesign.updatePrimary' });
  },

  async updateDisplayOrder(id: number, displayOrder: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = parseInt(String(id), 10);
      if (isNaN(numericId)) return null;

      const result = await db.update(itemDesigns)
        .set({ displayOrder })
        .where(eq(itemDesigns.id, numericId))
        .returning();
      
      if (result.length === 0) return null;
      return transformItemDesign(result[0]);
    }, { operationName: 'ItemDesign.updateDisplayOrder' });
  }
};

export default ItemDesign;
