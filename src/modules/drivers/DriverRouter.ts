import { Router } from "express";
import { DriverController } from "./DriverController.js";
import { authenticate } from "../../middleware/AuthMiddleware.js";

const driverRouter = Router();
const driverCtrl = new DriverController();

// Driver Mobile App Authentication & Bus Fetching (Public endpoints for mobile app)
driverRouter.post("/login", driverCtrl.loginDriver.bind(driverCtrl));
driverRouter.get("/:driverId/buses", driverCtrl.getDriverBuses.bind(driverCtrl));

// Admin CRUD Driver Endpoints
driverRouter.get("/", authenticate, driverCtrl.getAllDrivers.bind(driverCtrl));
driverRouter.get("/:id", authenticate, driverCtrl.getDriverById.bind(driverCtrl));
driverRouter.post("/", authenticate, driverCtrl.createDriver.bind(driverCtrl));
driverRouter.put("/:id", authenticate, driverCtrl.updateDriver.bind(driverCtrl));
driverRouter.delete("/:id", authenticate, driverCtrl.deleteDriver.bind(driverCtrl));

export default driverRouter;