import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { AWS_REGION, DYNAMODB_ENDPOINT } from "./env";

const client = new DynamoDBClient({
  region: AWS_REGION,
  endpoint: DYNAMODB_ENDPOINT,
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
});

export const dynamo = DynamoDBDocumentClient.from(client);
