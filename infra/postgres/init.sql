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

INSERT INTO available_stock (product_id, name, price, quantity, category) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Wireless Mouse',      24.99, 120, 'Electronics'),
  ('22222222-2222-2222-2222-222222222222', 'Mechanical Keyboard', 89.99, 45,  'Electronics'),
  ('33333333-3333-3333-3333-333333333333', 'Running Shoes',       59.99, 0,   'Sportswear'),
  ('44444444-4444-4444-4444-444444444444', 'Yoga Mat',            19.99, 200, 'Sportswear'),
  ('55555555-5555-5555-5555-555555555555', 'Coffee Grinder',      34.50, 15,  'HomeGoods'),
  ('66666666-6666-6666-6666-666666666666', 'Desk Lamp',           22.00, 60,  'HomeGoods');
