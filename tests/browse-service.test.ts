import { DeleteCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { dynamo } from "./helpers/dynamo";
import { BROWSE_SERVICE_URL, DYNAMODB_TABLE } from "./helpers/env";

type SeededProduct = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  inStock: boolean;
};

const seededProductIds: string[] = [];

async function seedProduct(overrides: Partial<Omit<SeededProduct, "productId">> = {}) {
  const product: SeededProduct = {
    productId: randomUUID(),
    name: "Browse Test Product",
    price: 12.5,
    quantity: 3,
    category: `IntegrationTest-${randomUUID()}`,
    inStock: true,
    ...overrides,
  };
  await dynamo.send(new PutCommand({ TableName: DYNAMODB_TABLE, Item: product }));
  seededProductIds.push(product.productId);
  return product;
}

afterEach(async () => {
  await Promise.all(
    seededProductIds.splice(0).map((productId) =>
      dynamo.send(new DeleteCommand({ TableName: DYNAMODB_TABLE, Key: { productId } }))
    )
  );
});

describe("GET /products/:productId", () => {
  it("returns a seeded product", async () => {
    const product = await seedProduct({ name: "Widget", price: 9.99 });
    const res = await fetch(`${BROWSE_SERVICE_URL}/products/${product.productId}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject(product);
  });

  it("returns 404 for an unknown product", async () => {
    const res = await fetch(`${BROWSE_SERVICE_URL}/products/${randomUUID()}`);
    expect(res.status).toBe(404);
  });
});

describe("GET /categories/:categoryId/products", () => {
  it("returns only products in the requested category", async () => {
    const category = `IntegrationTest-${randomUUID()}`;
    const a = await seedProduct({ category, name: "In Category A" });
    const b = await seedProduct({ category, name: "In Category B" });
    await seedProduct({ name: "Different Category" });

    const res = await fetch(`${BROWSE_SERVICE_URL}/categories/${encodeURIComponent(category)}/products`);
    expect(res.status).toBe(200);
    const body = await res.json();
    const ids = body.items.map((item: SeededProduct) => item.productId);
    expect(ids.sort()).toEqual([a.productId, b.productId].sort());
  });

  it("returns an empty list for an unknown category", async () => {
    const res = await fetch(`${BROWSE_SERVICE_URL}/categories/${randomUUID()}/products`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
  });
});
