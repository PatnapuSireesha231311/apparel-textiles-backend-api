import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const databaseFile = process.env.DATABASE_FILE || "./data/thread-and-loom.sqlite";
fs.mkdirSync(path.dirname(path.resolve(databaseFile)), { recursive: true });
export const db = new Database(databaseFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  sku TEXT NOT NULL UNIQUE,
  size TEXT NOT NULL DEFAULT 'One size',
  colour TEXT NOT NULL DEFAULT 'Natural',
  price_minor INTEGER NOT NULL CHECK(price_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK(stock_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK(reserved_quantity >= 0),
  CHECK(reserved_quantity <= stock_quantity)
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  address_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  subtotal_minor INTEGER NOT NULL,
  shipping_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  variant_id INTEGER NOT NULL REFERENCES product_variants(id),
  sku_snapshot TEXT NOT NULL,
  product_name_snapshot TEXT NOT NULL,
  size_snapshot TEXT NOT NULL,
  colour_snapshot TEXT NOT NULL,
  unit_price_minor INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  line_total_minor INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS inventory_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id),
  order_id INTEGER REFERENCES orders(id),
  event_type TEXT NOT NULL,
  quantity_delta INTEGER NOT NULL,
  reference TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, active);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
`);

const count = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
if (count === 0) {
  const insertCategory = db.prepare("INSERT INTO categories(name, slug) VALUES (?, ?)");
  const clothing = insertCategory.run("Clothing", "clothing").lastInsertRowid;
  const textiles = insertCategory.run("Textiles", "textiles").lastInsertRowid;
  const insertProduct = db.prepare("INSERT INTO products(category_id, name, slug, description) VALUES (?, ?, ?, ?)");
  const insertVariant = db.prepare("INSERT INTO product_variants(product_id, sku, size, colour, price_minor, currency, stock_quantity) VALUES (?, ?, ?, ?, ?, 'INR', ?)");
  const p1 = insertProduct.run(clothing, "Everyday Cotton Shirt", "everyday-cotton-shirt", "A breathable cotton shirt designed for everyday comfort.").lastInsertRowid;
  insertVariant.run(p1, "TL-SHIRT-WHT-M", "M", "White", 129900, 18);
  insertVariant.run(p1, "TL-SHIRT-WHT-L", "L", "White", 129900, 12);
  const p2 = insertProduct.run(textiles, "Handwoven Table Runner", "handwoven-table-runner", "A textured table runner inspired by traditional weaving.").lastInsertRowid;
  insertVariant.run(p2, "TL-RUNNER-NAT-1", "One size", "Natural", 189900, 9);
  const p3 = insertProduct.run(clothing, "Linen Blend Kurta", "linen-blend-kurta", "A relaxed-fit kurta with a soft linen-blend feel.").lastInsertRowid;
  insertVariant.run(p3, "TL-KURTA-SND-M", "M", "Sand", 219900, 7);
}
