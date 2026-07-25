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
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const denseRouteCache = new Map<string, [number, number][]>();

async function fetchRoute(waypoints: [number, number][]): Promise<[number, number][] | null> {
  if (waypoints.length < 2) return null;
  const coords = waypoints.map((c) => `${c[1]},${c[0]}`).join(";");
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson&steps=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route?.geometry?.coordinates) return null;
    return route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
  } catch {
    return null;
  }
}

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

        const routeIdStr = route._id.toString();
        let path = denseRouteCache.get(routeIdStr);
        
        if (!path) {
           path = await fetchRoute(route.pathCoordinates);
           if (!path) {
              path = route.pathCoordinates; // Fallback to sparse
           } else {
              denseRouteCache.set(routeIdStr, path);
           }
        }

        if (!path || path.length === 0) continue;

        let currentIndex = (track as any).currentIndex || 0;
        
        // Skip if already completed
        if (track.status === "Completed" && currentIndex >= path.length - 1) {
          continue;
        }

        let step = path.length > route.pathCoordinates.length ? 5 : 1; 
        let nextIndex = currentIndex + step;
        
        let speed = Math.floor(Math.random() * 25) + 20;
        let status = "Live";
        
        if (nextIndex >= path.length - 1) {
          nextIndex = path.length - 1; // Stay at the end
          speed = 0; // Bus is not running anymore
          status = "Completed";
        }

        const [lat, lng] = path[nextIndex] as [number, number];
        
        // Calculate ETA and next stop based on original stops
        const progressRatio = nextIndex / (path.length - 1 || 1);
        const stopsLeft = Math.max(0, Math.floor((1 - progressRatio) * (route.stops?.length || 0)));
        const etaVal = stopsLeft * 3 + 2;
        const eta = status === "Completed" ? "Arrived" : `${etaVal} min away`;

        let nextStop = "Terminal Stop";
        if (route.stops && route.stops.length > 0) {
          const stopIndex = Math.min(
            Math.floor(progressRatio * route.stops.length) + 1,
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
              status,
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
