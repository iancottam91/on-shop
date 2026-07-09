import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { afterAll, describe, expect, it } from "vitest";
import { dynamo } from "./helpers/dynamo";
import { DYNAMODB_TABLE, STOCK_SERVICE_URL } from "./helpers/env";
import { pool } from "./helpers/postgres";

afterAll(async () => {
  await pool.end();
});

async function createProduct(overrides: Partial<Record<string, unknown>> = {}) {
  const res = await fetch(`${STOCK_SERVICE_URL}/stock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Integration Test Widget",
      price: 9.99,
      quantity: 5,
      category: "IntegrationTest",
      ...overrides,
    }),
  });
  return { res, body: await res.json() };
}

describe("POST /stock", () => {
  it("creates the product in Postgres and DynamoDB", async () => {
    const { res, body } = await createProduct();
    expect(res.status).toBe(201);
    const { productId } = body;

    const pgRow = await pool.query(
      `SELECT name, price, quantity, category FROM available_stock WHERE product_id = $1`,
      [productId]
    );
    expect(pgRow.rows[0]).toMatchObject({
      name: "Integration Test Widget",
      quantity: 5,
      category: "IntegrationTest",
    });

    const dynamoItem = await dynamo.send(
      new GetCommand({ TableName: DYNAMODB_TABLE, Key: { productId } })
    );
    expect(dynamoItem.Item).toMatchObject({
      productId,
      name: "Integration Test Widget",
      quantity: 5,
      inStock: true,
    });
  });

  it("rejects an invalid payload with 400", async () => {
    const { res } = await createProduct({ name: "", price: -1, quantity: -1, category: "" });
    expect(res.status).toBe(400);
  });
});

describe("PUT /stock/:productId", () => {
  it("updates quantity in Postgres and keeps the DynamoDB cache in sync", async () => {
    const { body: created } = await createProduct({ quantity: 3 });
    const { productId } = created;

    const res = await fetch(`${STOCK_SERVICE_URL}/stock/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 0 }),
    });
    expect(res.status).toBe(200);

    const pgRow = await pool.query(
      `SELECT quantity FROM available_stock WHERE product_id = $1`,
      [productId]
    );
    expect(pgRow.rows[0].quantity).toBe(0);

    const dynamoItem = await dynamo.send(
      new GetCommand({ TableName: DYNAMODB_TABLE, Key: { productId } })
    );
    expect(dynamoItem.Item?.quantity).toBe(0);
    expect(dynamoItem.Item?.inStock).toBe(false);
  });

  it("returns 404 for an unknown product", async () => {
    const res = await fetch(`${STOCK_SERVICE_URL}/stock/${randomUUID()}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 1 }),
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /stock/:productId", () => {
  it("returns the created product", async () => {
    const { body: created } = await createProduct();
    const res = await fetch(`${STOCK_SERVICE_URL}/stock/${created.productId}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ productId: created.productId, name: "Integration Test Widget" });
  });

  it("returns 404 for an unknown product", async () => {
    const res = await fetch(`${STOCK_SERVICE_URL}/stock/${randomUUID()}`);
    expect(res.status).toBe(404);
  });
});
