import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

export type BasketItem = { productId: string; quantity: number };

const basketKey = (userId: string) => `basket:${userId}`;

export async function getBasket(userId: string): Promise<BasketItem[]> {
  const entries = await redis.hgetall(basketKey(userId));
  return Object.entries(entries).map(([productId, quantity]) => ({
    productId,
    quantity: Number(quantity),
  }));
}

export async function addBasketItem(userId: string, productId: string, quantity: number): Promise<void> {
  await redis.hincrby(basketKey(userId), productId, quantity);
}

export async function removeBasketItem(userId: string, productId: string): Promise<void> {
  await redis.hdel(basketKey(userId), productId);
}

export async function clearBasket(userId: string): Promise<void> {
  await redis.del(basketKey(userId));
}
