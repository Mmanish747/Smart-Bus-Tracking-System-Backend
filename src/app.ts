import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import router from "./router/index.js";
import { errorHandler } from "./middleware/ErrorHandling.js";

const app: Application = express();

app.set("trust proxy", 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

app.use(limiter);
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  })
);
app.use(express.json());

// Main Router API Mount
app.use("/api", router);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Central Error Interceptor
app.use(errorHandler);

export default app;
