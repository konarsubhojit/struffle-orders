# API documentation

## `POST /api/digest`

Triggers a daily or weekly sales digest.

- Authentication: `X-Digest-Secret: <DIGEST_SECRET>`
- Query: `period=daily|weekly` (default: `daily`)
- `401`: missing or incorrect shared secret
- `200`: `sent`, `already_sent`, `in_progress`, or `skipped`

The digest reports created-order count, revenue, outstanding priority orders,
and feedback received since the previous successful digest. A unique
date/period database record prevents duplicate sends.

## `POST /api/orders`

Creates an order. Offline-capable clients send a stable `Idempotency-Key`
header. Reusing a key returns `409` with:

```json
{
  "message": "Order already created",
  "duplicate": true,
  "resource": {}
}
```

The client treats this response as a successful replay and never creates a
second order.

## `POST /api/items`

Creates an item and optional design images. It accepts the same
`Idempotency-Key` contract as order creation. A duplicate returns `409` with
`duplicate: true` and the existing resource.

## Offline response behavior

The PWA only queues create operations after a network failure. Validation and
not-found responses are not silently retried. During replay, `400`, `404`, and
non-idempotency `409` responses are retained as conflicts so entered data is
not discarded.
