import TrackingModel from "./TrackingModel.js";
import { getIO } from "../../socket/index.js";
// backend/src/modules/tracking/TrackingModel.ts

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
    speed: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
    bus: { type: Schema.Types.ObjectId, ref: "Bus" },
    route: { type: Schema.Types.ObjectId, ref: "Route" },
    status: { type: String, default: "Live" },
    
    // 👇 ADD THESE THREE MISSING FIELDS 👇
    currentIndex: { type: Number, default: 0 },
    eta: { type: String },
    nextStop: { type: String },
  },
  { timestamps: true }
);

// ... rest of the file
export const startTrackingSimulation = (): void => {
  console.log("Initializing GPS Live Tracking Simulator...");

  setInterval(async () => {
    try {
      const trackingRecords = await TrackingModel.find({}).populate("route"); 

      const bulkOps: any[] = [];

      for (const track of trackingRecords) {
        const route = track.route as any;
        if (!route || !route.pathCoordinates || route.pathCoordinates.length === 0) {
          continue;
        }

        const path = route.pathCoordinates;
        let nextIndex = ((track as any).currentIndex || 0) + 1;
        if (nextIndex >= path.length) {
          nextIndex = 0;
        }

        const [lat, lng] = path[nextIndex] as [number, number];
        const speed = Math.floor(Math.random() * 25) + 20;
        const stopsLeft = path.length - 1 - nextIndex;
        const etaVal = stopsLeft * 3 + 2;
        const eta = stopsLeft === 0 ? "Arriving" : `${etaVal} min away`;

        let nextStop = "Terminal Stop";
        if (route.stops && route.stops.length > 0) {
          const stopIndex = Math.min(
            Math.floor((nextIndex / path.length) * route.stops.length),
            route.stops.length - 1
          );
          nextStop = route.stops[stopIndex]?.name || "Terminal Stop";
        }

        bulkOps.push({
          updateOne: {
            filter: { _id: track._id },
            update: {
              latitude: lat,
              longitude: lng,
              speed,
              eta,
              nextStop,
              currentIndex: nextIndex,
            },
          },
        });
      }

      if (bulkOps.length > 0) {
        await TrackingModel.bulkWrite(bulkOps);

          const updatedTracking = await TrackingModel.find({})
            .populate("bus")
            .populate("route");

          // Emit live updates to all connected clients
          const io = getIO();
          io.emit("tracking-update", updatedTracking);
      }
    } catch (error: any) {
      console.error("GPS Simulator Loop Error:", error.message);
    }
  }, 10000);
};