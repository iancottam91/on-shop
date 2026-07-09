# Web Shop (local golden path)

Local implementation of the golden path from `web-shop-v2.excalidraw`: browsing
products, managing stock, and checking out a basket. Async order confirmation,
notifications, and the Order Details DB are not implemented yet (see below).

## Services

| Service                     | Port | Purpose                                              |
| ---------------------------- | ---- | ----------------------------------------------------- |
| `browse-service`             | 3001 | Read-only product browsing (DynamoDB via LocalStack)  |
| `stock-management-service`   | 3002 | Create/update stock (Postgres + DynamoDB cache)       |
| `purchase-service`           | 3003 | Basket (Redis) + checkout (Postgres transaction)      |

Datastores: Postgres (`inventory` DB — `available_stock`, `pending_orders`),
Redis (basket state), LocalStack DynamoDB (`ProductDetails` table +
`CategoryIndex` GSI).

## Run it

```
docker compose up --build
```

Wait for all containers to report healthy (`docker compose ps`), then walk the
golden path:

```bash
# 1. Create a product (writes Postgres + DynamoDB cache)
curl -X POST localhost:3002/stock \
  -H 'Content-Type: application/json' \
  -d '{"name":"T-Shirt","price":19.99,"quantity":50,"category":"clothing"}'
# => {"productId":"<uuid>", ...}

# 2. Browse it back
curl localhost:3001/products
curl localhost:3001/products/<productId>
curl localhost:3001/categories/clothing/products

# 3. Add to basket
curl -X POST localhost:3003/basket/<userId>/items \
  -H 'Content-Type: application/json' \
  -d '{"productId":"<productId>","quantity":2}'

curl localhost:3003/basket/<userId>

# 4. Checkout
curl -X POST localhost:3003/orders/checkout \
  -H 'Content-Type: application/json' \
  -d '{"userId":"<userId>"}'

# 5. Confirm stock decremented
curl localhost:3002/stock/<productId>
```

`<userId>` just needs to be any valid UUID (e.g. `uuidgen` on macOS/Linux).

### Exercising the failure path

```bash
export PAYMENT_FAILURE_RATE=1
docker compose up -d purchase-service   # recreates just this service with the new rate
```

Re-run checkout — it should return `402` with `status: "failed"`, and the
reserved stock should be restored. `unset PAYMENT_FAILURE_RATE` and
`docker compose up -d purchase-service` again to go back to normal.

Checking out more than the available quantity returns `409` and leaves stock
untouched.

## Test it

``` bash
docker compose up -d postgres localstack stock-management-service
cd tests && npm install && npm test.
```

## Design notes / deviations from the diagram

- The diagram's DynamoDB key (partition `productId`, sort `category`) can't
  actually serve `/get-by-category/{catId}` on its own — Query needs a known
  partition key. `CategoryIndex` GSI (partition `category`, sort `productId`)
  is added to make that access pattern work, consistent with the diagram's own
  note that GSIs can serve other high-traffic queries (e.g. `/get-by-gender`).
- The "Third Party Payment Provider" is stubbed in-process in
  `purchase-service/src/payment.ts` (simulated latency + configurable failure
  rate) rather than a separate service.

## Not yet implemented (follow-up pass)

- Order Confirmation Service, Order Management Service, Notification Service,
  Order Details DB
- Async queue (SQS via LocalStack) for post-purchase processing
- Search index updates, load balancer/CDN, frontend web/mobile app
- Pending-order expiry background worker
