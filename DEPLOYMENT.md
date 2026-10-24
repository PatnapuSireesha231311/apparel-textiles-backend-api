# Deployment Checklist

1. Use a Node.js 20+ host or Docker-based application platform.
2. Configure environment variables in the host dashboard; do not upload `.env`.
3. Use PostgreSQL for production, with migrations, backups, and a least-privilege DB user.
4. Set `FRONTEND_ORIGIN` to the exact production website origin.
5. Enable HTTPS/TLS and health monitoring.
6. Configure Razorpay or Stripe only after account eligibility, business verification, currency, and payment methods are confirmed.
7. Implement raw-body signed webhook verification and idempotent event processing before enabling live payments.
8. Add authentication/authorization for customer order reads and admin stock changes.
9. Run unit, integration, concurrency, security, and load tests.
10. Deploy to staging first; run smoke tests; prepare rollback and database restore procedures.
11. Enable production traffic gradually and monitor error rates, webhook latency, inventory conflicts, and checkout conversion.
