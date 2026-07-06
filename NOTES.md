- why would I want multiple agents running at the same time?


- Walk through a full journey - add product, add to basket, buy success, buy fail
- Add standard journeys as end to end tests
- How do the product writes work across DynamoDB and postgress? (The dual write design) - looks like it just writes to one, then the other without any rollback if one failed - we'd need to monitor this. - tackle this


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
