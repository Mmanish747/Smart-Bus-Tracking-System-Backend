import { Router } from "express";
import authRouter from "../modules/auth/AuthRouter.js";
import busesRouter from "../modules/buses/BusRouter.js";
// import companyRouter from "../modules/company/CompanyRouter.js";
import routesRouter from "../modules/routes/RouteRouter.js";
import driverRouter from "../modules/drivers/DriverRouter.js";
import schedulesRouter from "../modules/schedules/ScheduleRouter.js";
import trackingRouter from "../modules/tracking/TrackingRouter.js";
import notificationsRouter from "../modules/notifications/NotificationRouter.js";
import dashboardRouter from "../modules/dashboard/DashboardRouter.js";
import usersRouter from "../modules/users/UserRouter.js";
import teamsRouter from "../modules/teams/TeamRouter.js";
import tripRouter from "../modules/trips/TripRouter.js";
import stopsRouter from "../modules/stops/StopRouter.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/drivers", driverRouter);
router.use("/buses", busesRouter);
router.use("/routes", routesRouter);
router.use("/trips", tripRouter);
router.use("/schedules", schedulesRouter);
router.use("/tracking", trackingRouter);
router.use("/dashboard", dashboardRouter);
router.use("/notifications", notificationsRouter);
router.use("/teams", teamsRouter);
router.use("/stops", stopsRouter);

// Future
// router.use("/api/companies", companyRouter);

export default router;