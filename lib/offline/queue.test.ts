import { describe, expect, it, vi } from 'vitest';
import {
  OfflineQueue,
  type OfflineOperation,
  type OfflineQueueStore,
  type ReplayResponse,
} from './queue';

class MemoryStore implements OfflineQueueStore {
  readonly values = new Map<string, OfflineOperation>();
  async get(id: string) { return this.values.get(id); }
  async getAll() { return [...this.values.values()]; }
  async put(operation: OfflineOperation) { this.values.set(operation.id, operation); }
  async delete(id: string) { this.values.delete(id); }
}

const operation: OfflineOperation = {
  id: 'order:12345678',
  idempotencyKey: 'order:12345678',
  type: 'order',
  label: 'Order for Customer',
  endpoint: '/api/orders',
  body: { customerName: 'Customer' },
  status: 'pending',
  createdAt: '2026-08-16T00:00:00.000Z',
};

function response(status: number, body: unknown): ReplayResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('OfflineQueue', () => {
  it('enqueues each idempotency key once', async () => {
    const store = new MemoryStore();
    const queue = new OfflineQueue(store, vi.fn());
    await queue.enqueue(operation);
    await queue.enqueue({ ...operation, label: 'Duplicate' });
    expect(await queue.list()).toEqual([operation]);
  });

  it('replays and removes a queued operation', async () => {
    const store = new MemoryStore();
    const request = vi.fn().mockResolvedValue(response(201, { id: 1 }));
    const queue = new OfflineQueue(store, request);
    await queue.enqueue(operation);
    await queue.replay();
    expect(await queue.list()).toHaveLength(0);
    expect(request).toHaveBeenCalledWith('/api/orders', expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': operation.idempotencyKey }),
    }));
  });

  it('treats an API idempotency duplicate as successfully synced', async () => {
    const store = new MemoryStore();
    const queue = new OfflineQueue(
      store,
      vi.fn().mockResolvedValue(response(409, { duplicate: true, resource: { id: 1 } })),
    );
    await queue.enqueue(operation);
    await queue.replay();
    expect(await queue.list()).toHaveLength(0);
  });

  it('retains conflicts with a non-destructive error', async () => {
    const store = new MemoryStore();
    const queue = new OfflineQueue(
      store,
      vi.fn().mockResolvedValue(response(404, { message: 'Referenced item was deleted' })),
    );
    await queue.enqueue(operation);
    await queue.replay();
    expect(await queue.list()).toEqual([
      expect.objectContaining({
        status: 'conflict',
        error: 'Referenced item was deleted',
      }),
    ]);
  });
});
