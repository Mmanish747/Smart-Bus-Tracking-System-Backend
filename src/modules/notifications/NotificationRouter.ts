import { Router } from "express";
import { NotificationController } from "./NotificationController.js";
import { validateBody } from "../../middleware/ValidatorMiddleware.js";
import { authenticate, authorize } from "../../middleware/AuthMiddleware.js";

const notificationsRouter = Router();
const notificationCtrl = new NotificationController();

notificationsRouter.get("/", notificationCtrl.getAllNotifications.bind(notificationCtrl));
notificationsRouter.post("/", authenticate, authorize(["admin"]), validateBody(["title", "description", "badge", "icon"]), notificationCtrl.createNotification.bind(notificationCtrl));
notificationsRouter.put("/:id", authenticate, authorize(["admin"]), notificationCtrl.updateNotification.bind(notificationCtrl));
notificationsRouter.delete("/:id", authenticate, authorize(["admin"]), notificationCtrl.deleteNotification.bind(notificationCtrl));
notificationsRouter.patch("/:id/read", authenticate, notificationCtrl.markAsRead.bind(notificationCtrl));
notificationsRouter.post("/mark-all-read", authenticate, notificationCtrl.markAllAsRead.bind(notificationCtrl));

export default notificationsRouter;
