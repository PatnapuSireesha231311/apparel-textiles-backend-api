# Thread & Loom — Week 3 Back-End Scaffold

This is a learning scaffold for the Week 3 task: Back-End Development Planning and API Integration.

## Stack
- Node.js 20+
- Express REST API
- SQLite for local demonstration
- Zod request validation, Helmet security headers, CORS allowlist, rate limiting
- PostgreSQL recommended for production

## Run locally
1. Install Node.js 20 or newer.
2. In this folder run:
   ```bash
   npm install
   cp .env.example .env
   npm run dev
   ```
   On Windows Command Prompt, copy `.env.example` to `.env` instead of using `cp`.
3. Open `http://localhost:3000/api/v1/health`.
4. Product list: `http://localhost:3000/api/v1/products`.

## Example order request
Send `POST http://localhost:3000/api/v1/orders` with JSON:
```json
{
  "customer": { "name": "Demo Customer", "email": "customer@example.com" },
  "address": { "line1": "12 Market Road", "city": "Hyderabad", "postalCode": "500001", "country": "IN" },
  "items": [{ "variantId": 1, "quantity": 1 }]
}
```
Use the returned `orderNumber` to call `POST /api/v1/orders/{orderNumber}/checkout-session`.
The payment adapter is intentionally demo-only and does not take money. For a local workflow demonstration, call `POST /api/v1/orders/{orderNumber}/demo-confirm-payment`. Never expose this simulation in production.

## Important production gaps
Before launch, use PostgreSQL and migrations; implement real authentication and order ownership; replace demo payment routes with the official Razorpay or Stripe SDK; verify signed webhooks using raw request bodies; add CSRF protection if cookie sessions are used; add shipping/email adapters, observability, backups, concurrency tests, and a deployment secret manager. Never trust prices supplied by the browser or store card details.

## API overview
- `GET /api/v1/health`
- `GET /api/v1/products?q=shirt&category=clothing`
- `GET /api/v1/products/:id`
- `POST /api/v1/orders`
- `GET /api/v1/orders/:orderNumber` (demo endpoint; secure it in production)
- `POST /api/v1/orders/:orderNumber/checkout-session` (demo adapter)
- `POST /api/v1/orders/:orderNumber/demo-confirm-payment` (demo only)

## Suggested GitHub Pages/front-end connection
Set the front-end API base URL to your deployed backend URL. Do not put payment provider secret keys in browser JavaScript. Deploy this API on a Node-compatible host; GitHub Pages can host static files but cannot run this Node server.
