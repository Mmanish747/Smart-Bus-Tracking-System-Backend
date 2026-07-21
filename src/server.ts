import http from "http";
import app from "./app.js";
import "./config/mongodb.js";
import { seedDatabase } from "./config/seed.js";
import { startTrackingSimulation } from "./modules/tracking/TrackingSimulator.js";
import { initializeSocket } from "./socket/index.js";

const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

const PORT = process.env.PORT || 9006;

const startServer = async () => {
  // Seed default data if database is empty (mongodb.ts connects on import)
  await seedDatabase();

  // Start live GPS tracking simulator
  startTrackingSimulation();

  server.listen(PORT, () => {
    console.log(`Server is running on port:${PORT}`);
    console.log(`Press CTRL+C to disconnect the server`);
  });
};

startServer();

server.on("error", (err: any) => {
  console.error(err);
  console.error("Server Error:", err.message);
  process.exit(1);
});

process.on("unhandledRejection", (err: any) => {
  console.error("Unhandled Rejection:", err.message);
});

process.on("uncaughtException", (err: any) => {
  console.error("Uncaught Exception:", err.message);
  process.exit(1);
});

const gracefulShutdown = () => {
  console.log("Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);