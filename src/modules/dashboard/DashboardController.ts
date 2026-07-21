import { Request, Response, NextFunction } from "express";
import BusModel from "../buses/BusModel.js";
import RouteModel from "../routes/RouteModel.js";
import TrackingModel from "../tracking/TrackingModel.js";
import NotificationModel from "../notifications/NotificationModel.js";
import UserModel from "../users/UserModel.js";
import ScheduleModel from "../schedules/ScheduleModel.js";

export class DashboardController {
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [totalBuses, activeBuses, totalRoutes, activeTracking, delaysCount, alertNotifications, totalUsers, totalSchedules] = await Promise.all([
        BusModel.countDocuments({}),
        BusModel.countDocuments({ status: "Active" }),
        RouteModel.countDocuments({}),
        TrackingModel.countDocuments({}),
        TrackingModel.countDocuments({ eta: { $regex: /delay/i } }),
        NotificationModel.countDocuments({ badge: "Alert" }),
        UserModel.countDocuments({}),
        ScheduleModel.countDocuments({}),
      ]);

      res.status(200).json({
        success: true,
        stats: {
          totalBuses,
          activeBuses,
          totalRoutes,
          activeTracking,
          delaysCount,
          alertNotifications,
          totalUsers,
          totalSchedules,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
export default DashboardController;
