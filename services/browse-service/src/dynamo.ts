import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL,
});

export const dynamo = DynamoDBDocumentClient.from(client);
export const TABLE_NAME = process.env.DYNAMODB_TABLE ?? "ProductDetails";

export async function getProduct(productId: string) {
  const result = await dynamo.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { productId } })
  );
  return result.Item;
}

export async function listProducts(cursor?: string) {
  const result = await dynamo.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 20,
      ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, "base64").toString()) : undefined,
    })
  );
  return {
    items: result.Items ?? [],
    nextCursor: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64")
      : null,
  };
}

export async function listProductsByCategory(category: string) {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "CategoryIndex",
      KeyConditionExpression: "category = :category",
      ExpressionAttributeValues: { ":category": category },
    })
  );
  return result.Items ?? [];
}
