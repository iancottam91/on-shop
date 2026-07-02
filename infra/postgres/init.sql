CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE available_stock (
  product_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  category TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pending_orders (
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_details JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expiry_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
