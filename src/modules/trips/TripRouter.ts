import { Router } from "express";
import TripController from "./TripController.js";
import { authenticate } from "../../middleware/AuthMiddleware.js";

const tripRouter = Router();
const tripCtrl = new TripController();

// Start a trip
tripRouter.post(
  "/start",
  authenticate,
  tripCtrl.startTrip.bind(tripCtrl)
);

// End a trip
tripRouter.patch(
  "/:id/end",
  authenticate,
  tripCtrl.endTrip.bind(tripCtrl)
);

// Get all trips
tripRouter.get(
  "/",
  authenticate,
  tripCtrl.getAllTrips.bind(tripCtrl)
);

// Get active trips
tripRouter.get(
  "/active",
  authenticate,
  tripCtrl.getActiveTrips.bind(tripCtrl)
);

export default tripRouter;