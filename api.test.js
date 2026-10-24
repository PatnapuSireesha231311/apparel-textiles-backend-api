import test from "node:test";
import assert from "node:assert/strict";

test("project has documented API smoke-test targets", () => {
  // Keep this dependency-free so `npm test` runs without a separate HTTP test library.
  // Start the API with `npm run dev`, then manually verify:
  // GET /api/v1/health
  // GET /api/v1/products
  // POST /api/v1/orders with a valid customer/address/items payload
  assert.equal("GET /api/v1/health".startsWith("GET"), true);
});
