import { Schema, model } from "mongoose";

const trackingSchema = new Schema(
  {
    driverId: { type: String, required: true },
    driverName: { type: String, required: true },
    busId: { type: Schema.Types.ObjectId, ref: "Bus", required: true },
    busNo: { type: String, required: true },
    routeId: { type: Schema.Types.ObjectId, ref: "Route", required: true },
    routeName: { type: String, required: true },
    direction: { type: String, enum: ["Going", "Coming"], default: "Going" },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, default: 0 },
    speed: { type: Number, default: 0 }, // Speed in km/h calculated via Haversine formula
    timestamp: { type: Date, default: Date.now },
    // Backwards-compatible reference aliases
    bus: { type: Schema.Types.ObjectId, ref: "Bus" },
    route: { type: Schema.Types.ObjectId, ref: "Route" },
    status: { type: String, default: "Live" },
  },
  { timestamps: true }
);

// Index for fast lookups by bus and route
trackingSchema.index({ busId: 1, createdAt: -1 });
trackingSchema.index({ busNo: 1, createdAt: -1 });
trackingSchema.index({ routeId: 1, createdAt: -1 });

export const TrackingModel = model("Tracking", trackingSchema);
export default TrackingModel;
