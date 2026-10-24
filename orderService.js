import { db } from "../db.js";
import { randomUUID } from "node:crypto";

const createOrderTransaction = db.transaction(({ customer, address, items }) => {
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
    const e = new Error("Provide between 1 and 30 order items"); e.status = 400; e.code = "INVALID_ITEMS"; throw e;
  }
  const normalized = [];
  let subtotal = 0;

  for (const item of items) {
    const variant = db.prepare(`
      SELECT v.*, p.name AS product_name, p.active
      FROM product_variants v JOIN products p ON p.id = v.product_id
      WHERE v.id = ?
    `).get(item.variantId);
    if (!variant || !variant.active) {
      const e = new Error(`Product variant ${item.variantId} is unavailable`); e.status = 400; e.code = "VARIANT_UNAVAILABLE"; throw e;
    }
    const quantity = item.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      const e = new Error("Each quantity must be an integer between 1 and 10"); e.status = 400; e.code = "INVALID_QUANTITY"; throw e;
    }
    const available = variant.stock_quantity - variant.reserved_quantity;
    if (available < quantity) {
      const e = new Error(`Insufficient stock for ${variant.sku}`); e.status = 409; e.code = "OUT_OF_STOCK"; throw e;
    }
    normalized.push({ ...variant, quantity });
    subtotal += variant.price_minor * quantity;
  }

  const shipping = subtotal >= 500000 ? 0 : 49900;
  const total = subtotal + shipping;
  const orderNumber = `TL-${randomUUID().slice(0, 8).toUpperCase()}`;
  const orderId = Number(db.prepare(`
    INSERT INTO orders(order_number, customer_email, customer_name, address_json, subtotal_minor, shipping_minor, total_minor)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(orderNumber, customer.email, customer.name, JSON.stringify(address), subtotal, shipping, total).lastInsertRowid);

  const insertItem = db.prepare(`
    INSERT INTO order_items(order_id, variant_id, sku_snapshot, product_name_snapshot, size_snapshot, colour_snapshot, unit_price_minor, quantity, line_total_minor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const reserve = db.prepare("UPDATE product_variants SET reserved_quantity = reserved_quantity + ? WHERE id = ? AND stock_quantity - reserved_quantity >= ?");
  const event = db.prepare("INSERT INTO inventory_events(variant_id, order_id, event_type, quantity_delta, reference) VALUES (?, ?, 'reserved', ?, ?)");
  for (const item of normalized) {
    const result = reserve.run(item.quantity, item.id, item.quantity);
    if (result.changes !== 1) {
      const e = new Error(`Stock changed during checkout for ${item.sku}`); e.status = 409; e.code = "STOCK_CONFLICT"; throw e;
    }
    insertItem.run(orderId, item.id, item.sku, item.product_name, item.size, item.colour, item.price_minor, item.quantity, item.price_minor * item.quantity);
    event.run(item.id, orderId, -item.quantity, orderNumber);
  }
  return { id: orderId, orderNumber, subtotalMinor: subtotal, shippingMinor: shipping, totalMinor: total, currency: "INR", status: "pending_payment", paymentStatus: "pending" };
});

export function createOrder(input) {
  return createOrderTransaction(input);
}

export function getOrder(orderNumber) {
  const order = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(orderNumber);
  if (!order) return null;
  const items = db.prepare("SELECT sku_snapshot AS sku, product_name_snapshot AS name, size_snapshot AS size, colour_snapshot AS colour, unit_price_minor AS unitPriceMinor, quantity, line_total_minor AS lineTotalMinor FROM order_items WHERE order_id = ?").all(order.id);
  return { orderNumber: order.order_number, customerEmail: order.customer_email, status: order.status, paymentStatus: order.payment_status, subtotalMinor: order.subtotal_minor, shippingMinor: order.shipping_minor, totalMinor: order.total_minor, currency: order.currency, items, createdAt: order.created_at };
}
