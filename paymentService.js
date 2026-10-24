import { db } from "../db.js";
import { randomUUID } from "node:crypto";

/*
 * This is deliberately a demo adapter. It creates a payment record but does not charge money.
 * For production, replace with Razorpay/Stripe SDK calls and verify signed webhooks using the
 * provider's official SDK and the raw request body. Never trust a browser redirect as proof.
 */
export function createDemoCheckout(orderNumber) {
  const order = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(orderNumber);
  if (!order) {
    const e = new Error("Order not found"); e.status = 404; e.code = "ORDER_NOT_FOUND"; throw e;
  }
  if (order.payment_status === "paid") {
    const e = new Error("Order has already been paid"); e.status = 409; e.code = "ALREADY_PAID"; throw e;
  }
  const idempotencyKey = `demo-${order.order_number}`;
  let payment = db.prepare("SELECT * FROM payments WHERE idempotency_key = ?").get(idempotencyKey);
  if (!payment) {
    const result = db.prepare("INSERT INTO payments(order_id, provider, status, amount_minor, currency, idempotency_key) VALUES (?, 'demo', 'created', ?, ?, ?)")
      .run(order.id, order.total_minor, order.currency, idempotencyKey);
    payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(result.lastInsertRowid);
  }
  return { provider: "demo", paymentId: payment.id, orderNumber, amountMinor: order.total_minor, currency: order.currency, demoOnly: true, message: "No payment was taken. Configure a real provider before launch." };
}

const confirmTransaction = db.transaction((orderNumber, providerReference) => {
  const order = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(orderNumber);
  if (!order) { const e = new Error("Order not found"); e.status = 404; throw e; }
  if (order.payment_status === "paid") return { orderNumber, status: "paid", alreadyProcessed: true };
  db.prepare("UPDATE orders SET status = 'confirmed', payment_status = 'paid' WHERE id = ?").run(order.id);
  db.prepare("UPDATE payments SET status = 'paid', provider_payment_id = ? WHERE order_id = ?").run(providerReference || `demo-${randomUUID()}`, order.id);
  const items = db.prepare("SELECT variant_id, quantity FROM order_items WHERE order_id = ?").all(order.id);
  const commitStock = db.prepare("UPDATE product_variants SET stock_quantity = stock_quantity - ?, reserved_quantity = reserved_quantity - ? WHERE id = ? AND stock_quantity >= ? AND reserved_quantity >= ?");
  const event = db.prepare("INSERT INTO inventory_events(variant_id, order_id, event_type, quantity_delta, reference) VALUES (?, ?, 'sold', ?, ?)");
  for (const item of items) {
    const r = commitStock.run(item.quantity, item.quantity, item.variant_id, item.quantity, item.quantity);
    if (r.changes !== 1) throw new Error("Inventory invariant failed while confirming order");
    event.run(item.variant_id, order.id, -item.quantity, order.order_number);
  }
  return { orderNumber, status: "paid", alreadyProcessed: false };
});

export function confirmDemoPayment(orderNumber, providerReference) {
  return confirmTransaction(orderNumber, providerReference);
}
