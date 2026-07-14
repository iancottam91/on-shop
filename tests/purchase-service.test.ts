import { randomUUID } from "crypto";
import { afterAll, describe, expect, it } from "vitest";
import { PURCHASE_SERVICE_PAYMENT_FAILURE_URL, PURCHASE_SERVICE_URL } from "./helpers/env";
import { pool } from "./helpers/postgres";

afterAll(async () => {
  await pool.end();
});

async function seedStock(overrides: Partial<{ price: number; quantity: number }> = {}) {
  const productId = randomUUID();
  const price = overrides.price ?? 10;
  const quantity = overrides.quantity ?? 10;
  await pool.query(
    `INSERT INTO available_stock (product_id, name, price, quantity, category)
     VALUES ($1, 'Purchase Test Product', $2, $3, 'IntegrationTest')`,
    [productId, price, quantity]
  );
  return { productId, price, quantity };
}

async function addToBasket(baseUrl: string, userId: string, productId: string, quantity: number) {
  const res = await fetch(`${baseUrl}/basket/${userId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, quantity }),
  });
  expect(res.status).toBe(201);
}

async function waitFor<T>(
  fn: () => Promise<T | undefined>,
  { timeoutMs = 2000, intervalMs = 10 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await fn();
    if (result !== undefined) return result;
    if (Date.now() >= deadline) throw new Error("waitFor timed out");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

async function getPendingOrder(userId: string) {
  const result = await pool.query(
    `SELECT order_id AS "orderId", status FROM pending_orders WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0];
}

describe("checkout - successful payment", () => {
  it("reserves stock while pending, then completes the order and clears the basket", async () => {
    const orderedQuantity = 3;
    const { productId, quantity: initialQuantity } = await seedStock({ quantity: 10 });
    const userId = randomUUID();
    await addToBasket(PURCHASE_SERVICE_URL, userId, productId, orderedQuantity);

    const checkoutPromise = fetch(`${PURCHASE_SERVICE_URL}/orders/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const pendingOrder = await waitFor(() => getPendingOrder(userId));
    expect(pendingOrder.status).toBe("pending");

    const stockWhilePending = await pool.query(
      `SELECT quantity FROM available_stock WHERE product_id = $1`,
      [productId]
    );
    expect(stockWhilePending.rows[0].quantity).toBe(initialQuantity - orderedQuantity);

    const checkoutRes = await checkoutPromise;
    expect(checkoutRes.status).toBe(201);
    const checkoutBody = await checkoutRes.json();
    expect(checkoutBody.status).toBe("completed");
    expect(checkoutBody.orderId).toBe(pendingOrder.orderId);

    const finalOrder = await getPendingOrder(userId);
    expect(finalOrder.status).toBe("completed");

    const finalStock = await pool.query(
      `SELECT quantity FROM available_stock WHERE product_id = $1`,
      [productId]
    );
    expect(finalStock.rows[0].quantity).toBe(initialQuantity - orderedQuantity);

    const basketRes = await fetch(`${PURCHASE_SERVICE_URL}/basket/${userId}`);
    expect(await basketRes.json()).toEqual({ items: [] });
  });
});

describe("checkout - failed payment", () => {
  it("reserves stock while pending, then fails the order and restores stock", async () => {
    const orderedQuantity = 4;
    const { productId, quantity: initialQuantity } = await seedStock({ quantity: 10 });
    const userId = randomUUID();
    await addToBasket(PURCHASE_SERVICE_PAYMENT_FAILURE_URL, userId, productId, orderedQuantity);

    const checkoutPromise = fetch(`${PURCHASE_SERVICE_PAYMENT_FAILURE_URL}/orders/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const pendingOrder = await waitFor(() => getPendingOrder(userId));
    expect(pendingOrder.status).toBe("pending");

    const stockWhilePending = await pool.query(
      `SELECT quantity FROM available_stock WHERE product_id = $1`,
      [productId]
    );
    expect(stockWhilePending.rows[0].quantity).toBe(initialQuantity - orderedQuantity);

    const checkoutRes = await checkoutPromise;
    expect(checkoutRes.status).toBe(402);
    const checkoutBody = await checkoutRes.json();
    expect(checkoutBody.status).toBe("failed");
    expect(checkoutBody.orderId).toBe(pendingOrder.orderId);

    const finalOrder = await getPendingOrder(userId);
    expect(finalOrder.status).toBe("failed");

    const finalStock = await pool.query(
      `SELECT quantity FROM available_stock WHERE product_id = $1`,
      [productId]
    );
    expect(finalStock.rows[0].quantity).toBe(initialQuantity);

    const basketRes = await fetch(`${PURCHASE_SERVICE_PAYMENT_FAILURE_URL}/basket/${userId}`);
    const basketBody = await basketRes.json();
    expect(basketBody.items).toEqual([{ productId, quantity: orderedQuantity }]);
  });
});
