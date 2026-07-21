import { Router } from "express";
import { ScheduleController } from "./ScheduleController.js";
import { validateBody } from "../../middleware/ValidatorMiddleware.js";
import { authenticate, authorize } from "../../middleware/AuthMiddleware.js";

const schedulesRouter = Router();
const scheduleCtrl = new ScheduleController();

schedulesRouter.get("/", scheduleCtrl.getAllSchedules.bind(scheduleCtrl));
schedulesRouter.post("/", authenticate, authorize(["admin"]), validateBody(["route", "bus", "firstBus", "lastBus", "frequency"]), scheduleCtrl.createSchedule.bind(scheduleCtrl));
schedulesRouter.put("/:id", authenticate, authorize(["admin"]), scheduleCtrl.updateSchedule.bind(scheduleCtrl));
schedulesRouter.delete("/:id", authenticate, authorize(["admin"]), scheduleCtrl.deleteSchedule.bind(scheduleCtrl));

export default schedulesRouter;
