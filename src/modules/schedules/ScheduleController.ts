import { Request, Response, NextFunction } from "express";
import ScheduleModel from "./ScheduleModel.js";

export class ScheduleController {
  async getAllSchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;
      const [schedules, total] = await Promise.all([
        ScheduleModel.find({}).populate("route").populate("bus").skip(skip).limit(limit),
        ScheduleModel.countDocuments({}),
      ]);
      res.status(200).json({ success: true, schedules, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
      next(error);
    }
  }

  async createSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { route, bus, firstBus, lastBus, frequency, status, active } = req.body;
      const newSchedule = await ScheduleModel.create({
        route,
        bus,
        firstBus,
        lastBus,
        frequency,
        status,
        active,
      });

      res.status(201).json({ success: true, schedule: newSchedule });
    } catch (error) {
      next(error);
    }
  }

  async updateSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { route, bus, firstBus, lastBus, frequency, status, active } = req.body;
      const schedule = await ScheduleModel.findByIdAndUpdate(id, { route, bus, firstBus, lastBus, frequency, status, active }, { new: true, runValidators: true });
      if (!schedule) {
        res.status(404).json({ success: false, message: "Schedule not found." });
        return;
      }
      res.status(200).json({ success: true, schedule });
    } catch (error) {
      next(error);
    }
  }

  async deleteSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const schedule = await ScheduleModel.findByIdAndDelete(id);
      if (!schedule) {
        res.status(404).json({ success: false, message: "Schedule not found." });
        return;
      }
      res.status(200).json({ success: true, message: "Schedule deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
}
export default ScheduleController;
