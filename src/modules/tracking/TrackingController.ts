import { Request, Response, NextFunction } from "express";
import TrackingModel from "./TrackingModel.js";
import RouteModel from "../routes/RouteModel.js";
import BusModel from "../buses/BusModel.js";
import StopModel from "../stops/StopModel.js";
import { calculateSpeed, calculateHaversineDistance } from "../../utils/haversine.js";
import { getIO } from "../../socket/index.js";

export class TrackingController {
  // ── POST /api/track ───────────────────────────────────────────────────────
  // Receives telemetry from mobile driver app every 10 seconds
  async receiveTelemetry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        driverId,
        // driverName,
        busId,
        busNo,
        routeId,
        routeName,
        direction,
        latitude,
        longitude,
        accuracy,
        timestamp,
      } = req.body;

      if (!busId || !latitude || !longitude) {
        res.status(400).json({
          success: false,
          message: "Missing required tracking fields (busId, latitude, longitude)",
        });
        return;
      }

      // Fetch Bus Document to ensure we have route & status info
      const busDoc = await BusModel.findById(busId).populate("assignedRoute");
      
      // Determine effective route ID & Route Name
      let effectiveRouteId = routeId;
      let effectiveRouteName = routeName;

      if (!effectiveRouteId || effectiveRouteId === "null" || effectiveRouteId === "Unassigned") {
        if (busDoc && busDoc.assignedRoute) {
          const assignedRouteObj = busDoc.assignedRoute as any;
          effectiveRouteId = assignedRouteObj._id ? assignedRouteObj._id.toString() : busDoc.assignedRoute.toString();
          effectiveRouteName = assignedRouteObj.from && assignedRouteObj.to 
            ? `${assignedRouteObj.from} - ${assignedRouteObj.to}` 
            : busDoc.routeName || "Assigned Route";
        }
      }

      // Fetch previous tracking record for this bus to calculate speed via Haversine
      const prevRecord = await TrackingModel.findOne({
        $or: [{ busId }, { busNo }, { bus: busId }],
      }).sort({ createdAt: -1 });

      let calculatedSpeed = 0;
      const currentTimestamp = timestamp ? new Date(timestamp) : new Date();

      if (prevRecord) {
        calculatedSpeed = calculateSpeed(
          prevRecord.latitude,
          prevRecord.longitude,
          prevRecord.timestamp || prevRecord.createdAt,
          Number(latitude),
          Number(longitude),
          currentTimestamp,
          prevRecord.speed || 0
        );
      }

      // ── Geofencing & ETA calculations ──
      let nextStop = prevRecord?.nextStop || "N/A";
      let distanceToNextStop = 0;
      let eta = "N/A";
      let stopETAs: any[] = [];

      if (effectiveRouteId) {
        // 1. First attempt: Get stops from RouteModel directly
        let stops: Array<{ name: string; lat: number; lng: number }> = [];
        const routeDoc = await RouteModel.findById(effectiveRouteId);
        
        if (routeDoc && routeDoc.stops && routeDoc.stops.length > 0) {
          stops = routeDoc.stops
            .filter((s: any) => s && s.name && typeof s.lat === "number" && typeof s.lng === "number")
            .map((s: any) => ({ name: String(s.name), lat: Number(s.lat), lng: Number(s.lng) }));
        }

        // 2. Fallback attempt: Get stops from StopModel if RouteModel stops are empty
        if (stops.length === 0) {
          const routeStopsDoc = await StopModel.findOne({ routeId: effectiveRouteId });
          if (routeStopsDoc && routeStopsDoc.stops && routeStopsDoc.stops.length > 0) {
            stops = routeStopsDoc.stops
              .filter((s: any) => s && s.name && typeof s.lat === "number" && typeof s.lng === "number")
              .map((s: any) => ({ name: String(s.name), lat: Number(s.lat), lng: Number(s.lng) }));
          }
        }

        // Process stops if available
        if (stops.length > 0) {
          let targetIdx = 0;
          if (prevRecord && prevRecord.nextStop) {
            const idx = stops.findIndex((s) => s.name === prevRecord.nextStop);
            if (idx !== -1) targetIdx = idx;
          }

          if (targetIdx < 0 || targetIdx >= stops.length) {
            targetIdx = 0;
          }

          let currentTarget = stops[targetIdx];
          if (currentTarget) {
            let dist = calculateHaversineDistance(
              Number(latitude),
              Number(longitude),
              currentTarget.lat,
              currentTarget.lng
            );

            // 30m geofence = 0.03 km
            if (dist <= 0.03) {
              nextStop = currentTarget.name;
              distanceToNextStop = dist;
              eta = "Arrived";
            } else {
              // If we left the 30m geofence and were previously Arrived, advance to next stop
              if (prevRecord && prevRecord.eta === "Arrived" && targetIdx + 1 < stops.length) {
                targetIdx++;
                currentTarget = stops[targetIdx];
              }

              if (currentTarget) {
                dist = calculateHaversineDistance(
                  Number(latitude),
                  Number(longitude),
                  currentTarget.lat,
                  currentTarget.lng
                );
                nextStop = currentTarget.name;
                distanceToNextStop = dist;
                const speedToUse = calculatedSpeed > 0 ? calculatedSpeed : 20;
                const etaMins = (dist / speedToUse) * 60;
                eta = `${Math.ceil(etaMins)} min`;
              }
            }

            // Calculate ETAs for all valid stops
            for (let i = 0; i < stops.length; i++) {
              const stop = stops[i];
              if (!stop) continue;

              const sDist = calculateHaversineDistance(
                Number(latitude),
                Number(longitude),
                stop.lat,
                stop.lng
              );
              const speedToUse = calculatedSpeed > 0 ? calculatedSpeed : 20;
              const sEtaMins = (sDist / speedToUse) * 60;
              stopETAs.push({
                name: stop.name || `Stop ${i + 1}`,
                distance: sDist,
                eta: i === targetIdx && dist <= 0.03 ? "Arrived" : `${Math.ceil(sEtaMins)} min`,
              });
            }
          }
        }
      }

      // Update existing tracking or create if not exists
      const trackingRecord = await TrackingModel.findOneAndUpdate(
        { bus: busId },
        {
          driverId: driverId || "UNKNOWN",
          busId: busId,
          busNo: busNo || busDoc?.busNumber || "BUS-000",
          routeId: effectiveRouteId || busId,
          routeName: effectiveRouteName || "Default Route",
          direction: direction || "Going",
          latitude: Number(latitude),
          longitude: Number(longitude),
          accuracy: Number(accuracy) || 0,
          speed: calculatedSpeed,
          timestamp: currentTimestamp,
          bus: busId,
          route: effectiveRouteId || undefined,
          status: "Live",
          nextStop,
          distanceToNextStop,
          eta,
          stopETAs,
        },
        {
          new: true,
          upsert: true,
        }
      );

      // Update Bus location field
      await BusModel.findByIdAndUpdate(busId, {
        location: {
          lat: Number(latitude),
          lng: Number(longitude),
          updatedAt: currentTimestamp,
        },
      });

      // Broadcast tracking update to connected socket clients
      try {
        const io = getIO();
        if (io) {
          io.emit("tracking-update", [trackingRecord]);
        }
      } catch (err) {
        // Socket broadcast optional fallback
      }

      res.status(200).json({
        success: true,
        message: "Telemetry recorded successfully",
        speed: calculatedSpeed,
        tracking: trackingRecord,
      });
    } catch (error) {
      next(error);
    }
  }

  async initializeTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bus, route } = req.body;
      if (!bus || !route) {
        res.status(400).json({ success: false, message: "Bus and route are required to initialize tracking." });
        return;
      }

      const busDoc = await BusModel.findById(bus).populate("assignedDrivers");
      const routeDoc = await RouteModel.findById(route).populate("assignedBuses");

      if (!busDoc) {
        res.status(404).json({ success: false, message: "Bus not found." });
        return;
      }
      if (!routeDoc) {
        res.status(404).json({ success: false, message: "Route not found." });
        return;
      }

      if (busDoc.assignedRoute && busDoc.assignedRoute.toString() !== routeDoc._id.toString()) {
        res.status(400).json({ success: false, message: "Bus is already assigned to another route." });
        return;
      }

      if (!busDoc.assignedRoute) {
        busDoc.assignedRoute = routeDoc._id;
        busDoc.routeAssigned = true;
        busDoc.routeId = routeDoc._id.toString();
        busDoc.routeName = `${routeDoc.from} - ${routeDoc.to}`;
        await busDoc.save();
      }

      const defaultLat = busDoc.location?.lat ?? routeDoc.pathCoordinates?.[0]?.[0] ?? 0;
      const defaultLng = busDoc.location?.lng ?? routeDoc.pathCoordinates?.[0]?.[1] ?? 0;
      const assignedDriver = Array.isArray(busDoc.assignedDrivers) ? busDoc.assignedDrivers[0] : undefined;
      const driverId = assignedDriver && typeof (assignedDriver as any)._id === "string" ? (assignedDriver as any)._id : "UNKNOWN";
      const driverName = assignedDriver && typeof (assignedDriver as any).name === "string" ? (assignedDriver as any).name : "Unknown Driver";

      const trackingRecord = await TrackingModel.findOneAndUpdate(
        { bus: busDoc._id },
        {
          driverId,
          driverName,
          busId: busDoc._id,
          busNo: busDoc.busNumber,
          routeId: routeDoc._id,
          routeName: `${routeDoc.from} - ${routeDoc.to}`,
          direction: "Outbound",
          latitude: Number(defaultLat),
          longitude: Number(defaultLng),
          accuracy: 0,
          speed: 0,
          timestamp: new Date(),
          bus: busDoc._id,
          route: routeDoc._id,
          status: "Live",
        },
        { new: true, upsert: true }
      );

      if (!routeDoc.assignedBuses?.some((id) => id.toString() === busDoc._id.toString())) {
        routeDoc.assignedBuses = [...(routeDoc.assignedBuses || []), busDoc._id as any];
      }
      await routeDoc.save();

      res.status(200).json({ success: true, tracking: trackingRecord });
    } catch (error) {
      next(error);
    }
  }

  // ── GET /api/tracking/route/:routeId ──────────────────────────────────────
  // Route-based Live Tracking: Route -> Assigned Bus -> Latest Location
  async getLiveTrackingByRouteId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { routeId } = req.params;

      const route = await RouteModel.findById(routeId).populate("assignedBuses");
      if (!route) {
        res.status(404).json({ success: false, message: "Route not found" });
        return;
      }

      const busIds = [
        ...(route.assignedBuses || []).map((bus) => (typeof bus === "string" ? bus : (bus as any)._id.toString())),
        ...(route.assignedBus ? [typeof route.assignedBus === "string" ? route.assignedBus : (route.assignedBus as any)._id.toString()] : []),
      ].filter(Boolean);

      const trackings = await TrackingModel.find({
        $or: [
          { routeId: route._id },
          { route: route._id },
          { busId: { $in: busIds } },
          { bus: { $in: busIds } },
        ],
      } as any)
        .sort({ createdAt: -1 })
        .populate("bus")
        .populate("route")
        .limit(10);

      const activeTracking = trackings.find(t => t.bus && (t.bus as any).status !== "Inactive");

      if (!activeTracking) {
        res.status(404).json({
          success: false,
          message: "No active live tracking data available for buses on this route.",
          route,
        });
        return;
      }

      res.status(200).json({
        success: true,
        route,
        tracking: activeTracking,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── GET /api/tracking/:busId ──────────────────────────────────────────────
  async getLiveTrackingByBusId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { busId } = req.params;
      const tracking = await TrackingModel.findOne({
        $or: [{ busId }, { bus: busId }],
      } as any)
        .sort({ createdAt: -1 })
        .populate("bus")
        .populate("route");

      if (!tracking) {
        res.status(404).json({ success: false, message: "Tracking record not found." });
        return;
      }
      res.status(200).json({ success: true, tracking });
    } catch (error) {
      next(error);
    }
  }

  // ── GET /api/tracking ─────────────────────────────────────────────────────
  async getAllLiveTrackings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const aggregateTrackings = await TrackingModel.aggregate([
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: { $ifNull: ["$bus", "$busId"] },
            doc: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$doc" } },
      ]);

      const populatedTrackings = await TrackingModel.populate(aggregateTrackings, { path: "bus route" });
      const activeTrackings = populatedTrackings.filter(t => t.bus && (t.bus as any).status !== "Inactive");

      res.status(200).json({ success: true, count: activeTrackings.length, tracking: activeTrackings });
    } catch (error) {
      next(error);
    }
  }

  // ── DELETE /api/tracking/:id ──────────────────────────────────────────────
  async deleteTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await TrackingModel.findByIdAndDelete(id);
      if (!deleted) {
        res.status(404).json({ success: false, message: "Tracking record not found." });
        return;
      }
      res.status(200).json({ success: true, message: "Tracking deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
}

export default TrackingController;
