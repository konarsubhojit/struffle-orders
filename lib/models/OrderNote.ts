// @ts-nocheck
import { eq, desc, and, asc } from 'drizzle-orm';
import { getDatabase } from '@/lib/db/connection';
import { orderNotes } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/utils/dbRetry';
import type { CreateOrderNoteData, OrderNoteType } from '@/types';

function transformOrderNote(note: any) {
  return {
    ...note,
    _id: note.id,
    createdAt: note.createdAt?.toISOString() || null,
    updatedAt: note.updatedAt?.toISOString() || null,
  };
}

interface UpdateOrderNoteData {
  noteText?: string;
  isPinned?: boolean;
}

const OrderNote = {
  /**
   * Get all notes for an order, ordered by isPinned DESC, createdAt DESC
   */
  async findByOrderId(orderId: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericOrderId = Number.parseInt(String(orderId), 10);
      if (Number.isNaN(numericOrderId)) return [];

      const result = await db
        .select()
        .from(orderNotes)
        .where(eq(orderNotes.orderId, numericOrderId))
        .orderBy(desc(orderNotes.isPinned), desc(orderNotes.createdAt));

      return result.map(transformOrderNote);
    }, { operationName: 'OrderNote.findByOrderId' });
  },

  /**
   * Get a single note by ID
   */
  async findById(id: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(id), 10);
      if (Number.isNaN(numericId)) return null;

      const result = await db
        .select()
        .from(orderNotes)
        .where(eq(orderNotes.id, numericId));

      if (result.length === 0) return null;
      return transformOrderNote(result[0]);
    }, { operationName: 'OrderNote.findById' });
  },

  /**
   * Create a new order note
   */
  async create(data: CreateOrderNoteData & {
    userId?: number | null;
    userEmail?: string | null;
    userName?: string | null;
  }) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericOrderId = Number.parseInt(String(data.orderId), 10);
      if (Number.isNaN(numericOrderId)) {
        throw new Error('Invalid order ID');
      }

      const insertData = {
        orderId: numericOrderId,
        noteText: data.noteText,
        noteType: data.noteType,
        isPinned: data.isPinned ?? false,
        userId: data.userId ?? null,
        userEmail: data.userEmail ?? null,
        userName: data.userName ?? null,
      };

      const result = await db.insert(orderNotes).values(insertData).returning();
      return transformOrderNote(result[0]);
    }, { operationName: 'OrderNote.create' });
  },

  /**
   * Update an existing order note
   */
  async update(id: number, updates: UpdateOrderNoteData) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(id), 10);
      if (Number.isNaN(numericId)) return null;

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (updates.noteText !== undefined) {
        updateData.noteText = updates.noteText;
      }
      if (updates.isPinned !== undefined) {
        updateData.isPinned = updates.isPinned;
      }

      const result = await db
        .update(orderNotes)
        .set(updateData)
        .where(eq(orderNotes.id, numericId))
        .returning();

      if (result.length === 0) return null;
      return transformOrderNote(result[0]);
    }, { operationName: 'OrderNote.update' });
  },

  /**
   * Delete an order note
   */
  async delete(id: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(id), 10);
      if (Number.isNaN(numericId)) return false;

      const result = await db
        .delete(orderNotes)
        .where(eq(orderNotes.id, numericId))
        .returning();

      return result.length > 0;
    }, { operationName: 'OrderNote.delete' });
  },

  /**
   * Toggle pin status of a note
   */
  async pin(id: number, isPinned: boolean) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(id), 10);
      if (Number.isNaN(numericId)) return null;

      const result = await db
        .update(orderNotes)
        .set({ isPinned, updatedAt: new Date() })
        .where(eq(orderNotes.id, numericId))
        .returning();

      if (result.length === 0) return null;
      return transformOrderNote(result[0]);
    }, { operationName: 'OrderNote.pin' });
  },
};

export default OrderNote;
