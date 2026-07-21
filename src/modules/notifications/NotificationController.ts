import { Request, Response, NextFunction } from "express";
import NotificationModel from "./NotificationModel.js";

export class NotificationController {
  async getAllNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;
      const [notifications, total] = await Promise.all([
        NotificationModel.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
        NotificationModel.countDocuments({}),
      ]);
      res.status(200).json({ success: true, notifications, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
      next(error);
    }
  }

  async createNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        title,
        description,
        badge,
        icon,
        iconBg,
        iconColor,
        badgeBg,
        badgeColor,
      } = req.body;

      const newNotification = await NotificationModel.create({
        title,
        description,
        badge,
        icon,
        iconBg,
        iconColor,
        badgeBg,
        badgeColor,
      });

      res.status(201).json({ success: true, notification: newNotification });
    } catch (error) {
      next(error);
    }
  }

  async updateNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, badge, icon, iconBg, iconColor, badgeBg, badgeColor } = req.body;
      const notification = await NotificationModel.findByIdAndUpdate(id, { title, description, badge, icon, iconBg, iconColor, badgeBg, badgeColor }, { new: true, runValidators: true });
      if (!notification) {
        res.status(404).json({ success: false, message: "Notification not found." });
        return;
      }
      res.status(200).json({ success: true, notification });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { read } = req.body;
      const notification = await NotificationModel.findByIdAndUpdate(id, { read: !!read }, { new: true });
      if (!notification) {
        res.status(404).json({ success: false, message: "Notification not found." });
        return;
      }
      res.status(200).json({ success: true, notification });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await NotificationModel.updateMany({}, { $set: { read: true } });
      res.status(200).json({ success: true, message: "All notifications marked as read." });
    } catch (error) {
      next(error);
    }
  }

  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await NotificationModel.findByIdAndDelete(id);
      if (!notification) {
        res.status(404).json({ success: false, message: "Notification not found." });
        return;
      }
      res.status(200).json({ success: true, message: "Notification deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
}
export default NotificationController;
