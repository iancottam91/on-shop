import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../asyncHandler";
import { addBasketItem, getBasket, removeBasketItem } from "../redis";

export const basketRouter = Router();

const addItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

basketRouter.get(
  "/:userId",
  asyncHandler(async (req, res) => {
    const items = await getBasket(req.params.userId);
    res.json({ items });
  })
);

basketRouter.post(
  "/:userId/items",
  asyncHandler(async (req, res) => {
    const parsed = addItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    await addBasketItem(req.params.userId, parsed.data.productId, parsed.data.quantity);
    const items = await getBasket(req.params.userId);
    res.status(201).json({ items });
  })
);

basketRouter.delete(
  "/:userId/items/:productId",
  asyncHandler(async (req, res) => {
    await removeBasketItem(req.params.userId, req.params.productId);
    const items = await getBasket(req.params.userId);
    res.json({ items });
  })
);
