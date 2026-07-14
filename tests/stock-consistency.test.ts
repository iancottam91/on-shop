import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";
import { dynamo } from "./helpers/dynamo";
import { DYNAMODB_TABLE, PURCHASE_SERVICE_URL, STOCK_SERVICE_URL } from "./helpers/env";

describe("stock consistency between Postgres and DynamoDB", () => {
  it("reflects a successful checkout's stock decrement in the DynamoDB cache", async () => {
    const initialQuantity = 10;
    const orderedQuantity = 4;

    const createRes = await fetch(`${STOCK_SERVICE_URL}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Consistency Test Product",
        price: 15,
        quantity: initialQuantity,
        category: "IntegrationTest",
      }),
    });
    expect(createRes.status).toBe(201);
    const { productId } = await createRes.json();

    const userId = randomUUID();
    const basketRes = await fetch(`${PURCHASE_SERVICE_URL}/basket/${userId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: orderedQuantity }),
    });
    expect(basketRes.status).toBe(201);

    const checkoutRes = await fetch(`${PURCHASE_SERVICE_URL}/orders/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    expect(checkoutRes.status).toBe(201);
    const checkoutBody = await checkoutRes.json();
    expect(checkoutBody.status).toBe("completed");

    const dynamoItem = await dynamo.send(
      new GetCommand({ TableName: DYNAMODB_TABLE, Key: { productId } })
    );
    expect(dynamoItem.Item?.quantity).toBe(initialQuantity - orderedQuantity);
    expect(dynamoItem.Item?.inStock).toBe(true);
  });
});
