import { Router } from "express";
import { DashboardController } from "./DashboardController.js";

const dashboardRouter = Router();
const dashboardCtrl = new DashboardController();

dashboardRouter.get("/stats", dashboardCtrl.getStats.bind(dashboardCtrl));

export default dashboardRouter;
