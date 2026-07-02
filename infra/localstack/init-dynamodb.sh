#!/bin/sh
set -e

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
