import { Router } from "express";
import { TrackingController } from "./TrackingController.js";

const trackingRouter = Router();
const trackingCtrl = new TrackingController();

// Public telemetry submission from Driver Mobile App
trackingRouter.post("/track", trackingCtrl.receiveTelemetry.bind(trackingCtrl));
trackingRouter.post("/", trackingCtrl.receiveTelemetry.bind(trackingCtrl));
trackingRouter.post("/initialize", trackingCtrl.initializeTracking.bind(trackingCtrl));

// Public tracking lookup endpoints
trackingRouter.get("/", trackingCtrl.getAllLiveTrackings.bind(trackingCtrl));
trackingRouter.get("/route/:routeId", trackingCtrl.getLiveTrackingByRouteId.bind(trackingCtrl));
trackingRouter.get("/:busId", trackingCtrl.getLiveTrackingByBusId.bind(trackingCtrl));

export default trackingRouter;
