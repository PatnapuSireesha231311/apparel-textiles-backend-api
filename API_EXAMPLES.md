# API Examples

## Health
`GET /api/v1/health`

## Product catalog
`GET /api/v1/products?q=cotton&category=clothing`

## Create order
`POST /api/v1/orders`
Content-Type: application/json

```json
{
  "customer": { "name": "Demo Customer", "email": "customer@example.com" },
  "address": { "line1": "12 Market Road", "city": "Hyderabad", "postalCode": "500001", "country": "IN" },
  "items": [{ "variantId": 1, "quantity": 1 }]
}
```

The server calculates prices and totals from database records. It does not accept a client-supplied total.

## Create demo checkout session
`POST /api/v1/orders/TL-XXXXXXXX/checkout-session`

## Demo payment confirmation
`POST /api/v1/orders/TL-XXXXXXXX/demo-confirm-payment`

This endpoint is for a local demonstration only. A production deployment must use a provider's signed webhook and signature verification.
