import { randomUUID } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../asyncHandler";
import { pool } from "../db";
import { putProduct, updateProductStock } from "../dynamo";

export const stockRouter = Router();

const createStockSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  quantity: z.number().int().nonnegative(),
  category: z.string().min(1),
});

stockRouter.post("/", asyncHandler(async (req, res) => {
  const parsed = createStockSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { name, price, quantity, category } = parsed.data;
  const productId = randomUUID();

  await pool.query(
    `INSERT INTO available_stock (product_id, name, price, quantity, category)
     VALUES ($1, $2, $3, $4, $5)`,
    [productId, name, price, quantity, category]
  );

  await putProduct({ productId, name, price, quantity, category, inStock: quantity > 0 });

  res.status(201).json({ productId, name, price, quantity, category });
}));

const updateStockSchema = z.object({
  price: z.number().positive().optional(),
  quantity: z.number().int().nonnegative().optional(),
});

stockRouter.put("/:productId", asyncHandler(async (req, res) => {
  const parsed = updateStockSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { productId } = req.params;

  const existing = await pool.query(
    `SELECT price, quantity FROM available_stock WHERE product_id = $1`,
    [productId]
  );
  if (existing.rowCount === 0) {
    return res.status(404).json({ error: "Product not found" });
  }

  const price = parsed.data.price ?? existing.rows[0].price;
  const quantity = parsed.data.quantity ?? existing.rows[0].quantity;

  await pool.query(
    `UPDATE available_stock SET price = $1, quantity = $2, updated_at = now() WHERE product_id = $3`,
    [price, quantity, productId]
  );

  await updateProductStock(productId, price, quantity);

  res.json({ productId, price, quantity });
}));

stockRouter.get("/:productId", asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT product_id AS "productId", name, price, quantity, category
     FROM available_stock WHERE product_id = $1`,
    [req.params.productId]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json(result.rows[0]);
}));
