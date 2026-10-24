import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import productsRouter from "./routes/products.js";
import ordersRouter from "./routes/orders.js";
import { notFound, errorHandler } from "./middleware/errors.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5500,http://127.0.0.1:5500").split(",").map(s => s.trim());
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error("Origin not allowed by CORS"));
}}));
app.use(express.json({ limit: "100kb" }));
app.use("/api/", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

app.get("/api/v1/health", (req, res) => res.json({ status: "ok", service: "thread-and-loom-api", version: "1.0.0" }));
app.use("/api/v1/products", productsRouter);
app.use("/api/v1/orders", ordersRouter);
app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Thread & Loom API listening on http://localhost:${port}`));
