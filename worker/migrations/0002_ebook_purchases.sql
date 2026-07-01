CREATE TABLE IF NOT EXISTS ebook_purchases (
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  product_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  provider_preference_id TEXT,
  provider_payment_id TEXT UNIQUE,
  checkout_url TEXT,
  amount REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_ebook_purchases_payment_id
  ON ebook_purchases(provider_payment_id);

CREATE INDEX IF NOT EXISTS idx_ebook_purchases_preference_id
  ON ebook_purchases(provider_preference_id);
