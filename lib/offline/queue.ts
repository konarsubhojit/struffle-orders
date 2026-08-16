export type OfflineOperationType = 'order' | 'item';
export type OfflineOperationStatus = 'pending' | 'syncing' | 'conflict' | 'failed';

export interface OfflineOperation {
  id: string;
  idempotencyKey: string;
  type: OfflineOperationType;
  label: string;
  endpoint: '/api/orders' | '/api/items';
  body: Record<string, unknown>;
  status: OfflineOperationStatus;
  error?: string;
  createdAt: string;
}

export interface OfflineQueueStore {
  get(id: string): Promise<OfflineOperation | undefined>;
  getAll(): Promise<OfflineOperation[]>;
  put(operation: OfflineOperation): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ReplayResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

type ReplayRequest = (
  endpoint: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string },
) => Promise<ReplayResponse>;

export class OfflineQueue {
  constructor(
    private readonly store: OfflineQueueStore,
    private readonly request: ReplayRequest,
  ) {}

  async enqueue(operation: OfflineOperation): Promise<OfflineOperation> {
    const existing = await this.store.get(operation.idempotencyKey);
    if (existing) return existing;
    await this.store.put(operation);
    return operation;
  }

  list(): Promise<OfflineOperation[]> {
    return this.store.getAll();
  }

  async replay(): Promise<void> {
    const operations = (await this.store.getAll()).sort(
      (left, right) => left.createdAt.localeCompare(right.createdAt),
    );

    for (const operation of operations) {
      await this.store.put({ ...operation, status: 'syncing', error: undefined });
      try {
        const response = await this.request(operation.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': operation.idempotencyKey,
          },
          body: JSON.stringify(operation.body),
        });
        const data = await response.json().catch(() => ({})) as {
          duplicate?: boolean;
          message?: string;
        };

        if (response.ok || (response.status === 409 && data.duplicate)) {
          await this.store.delete(operation.id);
          continue;
        }

        const status: OfflineOperationStatus =
          response.status === 400 || response.status === 404 || response.status === 409
            ? 'conflict'
            : 'failed';
        await this.store.put({
          ...operation,
          status,
          error: data.message || `Sync failed with HTTP ${response.status}`,
        });
      } catch (error) {
        await this.store.put({
          ...operation,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Network unavailable',
        });
        break;
      }
    }
  }
}

const DATABASE_NAME = 'kiyon-offline';
const STORE_NAME = 'operations';

export class IndexedDbQueueStore implements OfflineQueueStore {
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async transaction<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  get(id: string): Promise<OfflineOperation | undefined> {
    return this.transaction('readonly', (store) => store.get(id));
  }

  getAll(): Promise<OfflineOperation[]> {
    return this.transaction('readonly', (store) => store.getAll());
  }

  async put(operation: OfflineOperation): Promise<void> {
    await this.transaction('readwrite', (store) => store.put(operation));
  }

  async delete(id: string): Promise<void> {
    await this.transaction('readwrite', (store) => store.delete(id));
  }
}

let browserQueue: OfflineQueue | undefined;

export function getOfflineQueue(): OfflineQueue {
  if (typeof indexedDB === 'undefined') throw new Error('Offline queue is only available in the browser');
  browserQueue ??= new OfflineQueue(
    new IndexedDbQueueStore(),
    (endpoint, init) => fetch(endpoint, init),
  );
  return browserQueue;
}

export function notifyOfflineQueueChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('offline-queue-changed'));
}

export async function requestBackgroundSync(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const sync = (registration as ServiceWorkerRegistration & {
    sync?: { register(tag: string): Promise<void> };
  }).sync;
  await sync?.register('sync-offline-operations');
}
