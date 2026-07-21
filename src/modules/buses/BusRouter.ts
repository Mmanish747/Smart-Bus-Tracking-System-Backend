import { Router } from "express";
import { BusController } from "./BusController.js";
import { validateBody } from "../../middleware/ValidatorMiddleware.js";
import { authenticate, authorize } from "../../middleware/AuthMiddleware.js";

const busesRouter = Router();
const busCtrl = new BusController();

// Public route lookup for Driver Mobile App
busesRouter.get("/:busId/route", busCtrl.getBusRoute.bind(busCtrl));

// Bus CRUD & Assignment routes
busesRouter.get("/", busCtrl.getAllBuses.bind(busCtrl));
busesRouter.get("/:id", busCtrl.getBusById.bind(busCtrl));
busesRouter.post("/", authenticate, authorize(["admin"]), validateBody(["busNumber"]), busCtrl.createBus.bind(busCtrl));
busesRouter.put("/:id", authenticate, authorize(["admin"]), busCtrl.updateBus.bind(busCtrl));
busesRouter.delete("/:id", authenticate, authorize(["admin"]), busCtrl.deleteBus.bind(busCtrl));
busesRouter.patch("/:id/status", authenticate, authorize(["admin","driver"]), busCtrl.updateStatus.bind(busCtrl));

// Driver Assignment APIs
busesRouter.post("/:busId/assign-driver", authenticate, busCtrl.assignDriver.bind(busCtrl));
busesRouter.post("/:busId/remove-driver", authenticate, busCtrl.removeDriver.bind(busCtrl));
busesRouter.patch("/:id/assign-driver", authenticate, busCtrl.assignDriver.bind(busCtrl));
busesRouter.patch("/:id/remove-driver", authenticate, busCtrl.removeDriver.bind(busCtrl));


export default busesRouter;
