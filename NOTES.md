- why would I want multiple agents running at the same time?
- how to add shortcuts to the vscode editor
- how do we feel about having raw sql queries in the js code?


TESTS:
- Add standard journeys as end to end tests before implementing the below:

DESIGN IMPROVEMENTS TO MVP:
- A successful checkout doesn't change stock in the DynamoDB. This will lead to stock level drift. We should tackle this with the outbox pattern.
- Product writes go to postgress then dynamo. The dynamo write could fail when the postgress succeeds. To avoid this we could have an 'outbox' update table in postgress and then a worker that polls for these and updates dynamo, so we never update dynamo directly, only when postgress tells us to. (under plan `glittery-cuddling-spark.md`)
- We'd want to alert if a failed payment doesn't reset the stock correctly as this would lead to drift in stock data from actual data


## Validation

Does redis allow you to add products to the basket that aren't available in the stock?

Yes, it simply validates the UUID to make sure it's a valid UUID - it doesn't check if it is an actual product. Maybe it should?

Claude suggests this probably isn't worth it because we're validating at checkout time

## Logs

### Redis
How to look at the raw redis data for the basket and interact with it directly?

To do this, run `docker compose exec redis redis-cli` - this will connect to the locally running docker contain.
We can view hashes with `KEYS basket:*` and `HGETALL basket:{basket-id}`

### DynamoDB

Run `docker compose exec localstack bash` to get onto docker permanently.
Set the default region to uk: `export AWS_DEFAULT_REGION=eu-west-1`
Run `awslocal dynamodb list-tables` to list tables
Run `awslocal dynamodb describe-table --table-name ProductDetails` to check out the details
Run `awslocal dynamodb scan --table-name ProductDetails` to see the particular table content

### PostgreSQL

Run `docker compose exec postgres psql -U shop -d inventory` to get onto the docker container and connect with the 'shop' user to the 'inventory' database.

Here are some useful commands:

- \dt — list all tables
- \d available_stock — describe a table's columns/constraints
- \d pending_orders — same for the other table
- SELECT * FROM available_stock; — view stock rows
- SELECT * FROM pending_orders; — view pending orders
