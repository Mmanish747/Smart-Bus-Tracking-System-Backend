import { Router } from "express";
import { StopController } from "./StopController.js";
import { authenticate, authorize } from "../../middleware/AuthMiddleware.js";

const stopsRouter = Router();
const stopCtrl = new StopController();

// Public — passengers/tracking can read stop info
stopsRouter.get("/:routeId", stopCtrl.getByRouteId.bind(stopCtrl));

// Protected — only admins can write stop data
stopsRouter.post(
  "/",
  authenticate,
  authorize(["admin"]),
  stopCtrl.createOrReplace.bind(stopCtrl)
);

stopsRouter.delete(
  "/:routeId",
  authenticate,
  authorize(["admin"]),
  stopCtrl.deleteByRouteId.bind(stopCtrl)
);

export default stopsRouter;
