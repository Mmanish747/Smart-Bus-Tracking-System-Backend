import { Schema, model } from "mongoose";

const notificationSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    badge: { type: String, required: true }, // Alert, Service Update, Promotion, General
    icon: { type: String, required: true }, // TriangleAlert, BusFront, CircleX, Megaphone, Gift, Construction
    iconBg: { type: String, default: "bg-red-100" },
    iconColor: { type: String, default: "text-red-500" },
    badgeBg: { type: String, default: "bg-red-100" },
    badgeColor: { type: String, default: "text-red-600" },
      read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const NotificationModel = model("Notification", notificationSchema);
export default NotificationModel;
