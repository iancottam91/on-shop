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

seed_product "11111111-1111-1111-1111-111111111111" "Wireless Mouse"      "24.99" "120" "Electronics" true
seed_product "22222222-2222-2222-2222-222222222222" "Mechanical Keyboard" "89.99" "45"  "Electronics" true
seed_product "33333333-3333-3333-3333-333333333333" "Running Shoes"       "59.99" "0"   "Sportswear"  false
seed_product "44444444-4444-4444-4444-444444444444" "Yoga Mat"            "19.99" "200" "Sportswear"  true
seed_product "55555555-5555-5555-5555-555555555555" "Coffee Grinder"      "34.50" "15"  "HomeGoods"   true
seed_product "66666666-6666-6666-6666-666666666666" "Desk Lamp"           "22.00" "60"  "HomeGoods"   true

echo "Seeded 6 products into ProductDetails."
