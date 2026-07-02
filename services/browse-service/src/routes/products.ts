import { Router } from "express";
import { asyncHandler } from "../asyncHandler";
import { getProduct, listProducts, listProductsByCategory } from "../dynamo";

export const productsRouter = Router();

productsRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const { items, nextCursor } = await listProducts(cursor);
    res.json({ items, nextCursor });
  })
);

productsRouter.get(
  "/products/:productId",
  asyncHandler(async (req, res) => {
    const product = await getProduct(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  })
);

productsRouter.get(
  "/categories/:categoryId/products",
  asyncHandler(async (req, res) => {
    const items = await listProductsByCategory(req.params.categoryId);
    res.json({ items });
  })
);
