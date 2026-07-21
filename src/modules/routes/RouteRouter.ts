import { Router } from "express";
import { RouteController } from "./RouteController.js";
import { validateBody } from "../../middleware/ValidatorMiddleware.js";
import { authenticate, authorize } from "../../middleware/AuthMiddleware.js";

const routesRouter = Router();
const routeCtrl = new RouteController();

routesRouter.get("/", routeCtrl.getAllRoutes.bind(routeCtrl));
routesRouter.get("/:id", routeCtrl.getRouteById.bind(routeCtrl));
routesRouter.post("/", authenticate, authorize(["admin"]), validateBody(["routeNo", "from", "to", "frequency", "pathCoordinates"]), routeCtrl.createRoute.bind(routeCtrl));
routesRouter.put("/:id", authenticate, authorize(["admin"]), routeCtrl.updateRoute.bind(routeCtrl));
routesRouter.delete("/:id", authenticate, authorize(["admin"]), routeCtrl.deleteRoute.bind(routeCtrl));
routesRouter.patch("/:id/assign-bus",authenticate,routeCtrl.assignBus.bind(routeCtrl));

routesRouter.patch("/:id/remove-bus",authenticate,routeCtrl.removeBus.bind(routeCtrl));

export default routesRouter;
