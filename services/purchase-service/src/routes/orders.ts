import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../asyncHandler";
import { pool } from "../db";
import { chargePayment } from "../payment";
import { clearBasket, getBasket } from "../redis";

export const ordersRouter = Router();

const checkoutSchema = z.object({
  userId: z.string().uuid(),
});

type StockRow = { product_id: string; price: string; quantity: number };

ordersRouter.post("/checkout", asyncHandler(async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { userId } = parsed.data;

  const basketItems = await getBasket(userId);
  if (basketItems.length === 0) {
    return res.status(400).json({ error: "Basket is empty" });
  }

  // Lock rows in a stable order across concurrent checkouts to avoid deadlocks.
  const sortedItems = [...basketItems].sort((a, b) => a.productId.localeCompare(b.productId));

  const client = await pool.connect();
  let orderId: string;
  let totalAmount = 0;
  const orderProductDetails: Array<{ productId: string; quantity: number; price: number }> = [];

  try {
    await client.query("BEGIN");

    for (const item of sortedItems) {
      const result = await client.query<StockRow>(
        `SELECT product_id, price, quantity FROM available_stock WHERE product_id = $1 FOR UPDATE`,
        [item.productId]
      );
      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Unknown product ${item.productId}` });
      }
      const stock = result.rows[0];
      if (stock.quantity < item.quantity) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: `Insufficient stock for product ${item.productId}`,
          available: stock.quantity,
          requested: item.quantity,
        });
      }

      const price = Number(stock.price);
      orderProductDetails.push({ productId: item.productId, quantity: item.quantity, price });
      totalAmount += price * item.quantity;

      await client.query(
        `UPDATE available_stock SET quantity = quantity - $1, updated_at = now() WHERE product_id = $2`,
        [item.quantity, item.productId]
      );
    }

    const insertResult = await client.query(
      `INSERT INTO pending_orders (user_id, product_details, status, expiry_time)
       VALUES ($1, $2, 'pending', now() + interval '15 minutes')
       RETURNING order_id`,
      [userId, JSON.stringify(orderProductDetails)]
    );
    orderId = insertResult.rows[0].order_id;

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const payment = await chargePayment(userId, totalAmount);

  if (payment.success) {
    await pool.query(`UPDATE pending_orders SET status = 'completed' WHERE order_id = $1`, [orderId]);
    await clearBasket(userId);
    return res.status(201).json({ orderId, status: "completed", paymentReference: payment.reference });
  }

  // Payment failed: restore the reserved stock and mark the order failed.
  const rollbackClient = await pool.connect();
  try {
    await rollbackClient.query("BEGIN");
    for (const item of orderProductDetails) {
      await rollbackClient.query(
        `UPDATE available_stock SET quantity = quantity + $1, updated_at = now() WHERE product_id = $2`,
        [item.quantity, item.productId]
      );
    }
    await rollbackClient.query(`UPDATE pending_orders SET status = 'failed' WHERE order_id = $1`, [orderId]);
    await rollbackClient.query("COMMIT");
  } catch (err) {
    await rollbackClient.query("ROLLBACK");
    throw err;
  } finally {
    rollbackClient.release();
  }

  res.status(402).json({ orderId, status: "failed", error: "Payment declined" });
}));

ordersRouter.get("/:orderId", asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT order_id AS "orderId", user_id AS "userId", product_details AS "productDetails", status, expiry_time AS "expiryTime"
     FROM pending_orders WHERE order_id = $1`,
    [req.params.orderId]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Order not found" });
  }
  res.json(result.rows[0]);
}));
