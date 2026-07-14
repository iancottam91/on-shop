export const STOCK_SERVICE_URL = process.env.STOCK_SERVICE_URL ?? "http://localhost:3002";
export const BROWSE_SERVICE_URL = process.env.BROWSE_SERVICE_URL ?? "http://localhost:3001";
export const PURCHASE_SERVICE_URL = process.env.PURCHASE_SERVICE_URL ?? "http://localhost:3003";
export const PURCHASE_SERVICE_PAYMENT_FAILURE_URL =
  process.env.PURCHASE_SERVICE_PAYMENT_FAILURE_URL ?? "http://localhost:3004";
export const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://shop:shop@localhost:5432/inventory";
export const DYNAMODB_ENDPOINT = process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566";
export const AWS_REGION = process.env.AWS_REGION ?? "eu-west-1";
export const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE ?? "ProductDetails";
