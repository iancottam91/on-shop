import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL,
});

export const dynamo = DynamoDBDocumentClient.from(client);
export const TABLE_NAME = process.env.DYNAMODB_TABLE ?? "ProductDetails";

export type ProductRecord = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  inStock: boolean;
};

export async function putProduct(product: ProductRecord): Promise<void> {
  await dynamo.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: product,
    })
  );
}

export async function updateProductStock(
  productId: string,
  price: number,
  quantity: number
): Promise<void> {
  await dynamo.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { productId },
      UpdateExpression: "SET price = :price, quantity = :quantity, inStock = :inStock",
      ExpressionAttributeValues: {
        ":price": price,
        ":quantity": quantity,
        ":inStock": quantity > 0,
      },
    })
  );
}
