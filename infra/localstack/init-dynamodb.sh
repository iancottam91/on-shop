#!/bin/sh
set -e

if awslocal dynamodb describe-table --region eu-west-1 --table-name ProductDetails >/dev/null 2>&1; then
  echo "ProductDetails table already exists, skipping creation."
else
  awslocal dynamodb create-table \
    --region eu-west-1 \
    --table-name ProductDetails \
    --attribute-definitions \
      AttributeName=productId,AttributeType=S \
      AttributeName=category,AttributeType=S \
    --key-schema \
      AttributeName=productId,KeyType=HASH \
    --global-secondary-indexes \
      '[{
        "IndexName": "CategoryIndex",
        "KeySchema": [
          {"AttributeName": "category", "KeyType": "HASH"},
          {"AttributeName": "productId", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }]' \
    --billing-mode PAY_PER_REQUEST

  echo "ProductDetails table created."
fi

seed_product() {
  awslocal dynamodb put-item \
    --region eu-west-1 \
    --table-name ProductDetails \
    --item "{
      \"productId\": {\"S\": \"$1\"},
      \"name\": {\"S\": \"$2\"},
      \"price\": {\"N\": \"$3\"},
      \"quantity\": {\"N\": \"$4\"},
      \"category\": {\"S\": \"$5\"},
      \"inStock\": {\"BOOL\": $6}
    }"
}

row_count=$(($(wc -l < /seed/products.csv) - 1))

tail -n +2 /seed/products.csv | while IFS=, read -r product_id name price quantity category; do
  in_stock=false
  [ "$quantity" -gt 0 ] && in_stock=true
  seed_product "$product_id" "$name" "$price" "$quantity" "$category" "$in_stock"
done

echo "Seeded $row_count products from /seed/products.csv into ProductDetails."
