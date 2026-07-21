import { Request, Response, NextFunction } from "express";
import TrackingModel from "./TrackingModel.js";
import RouteModel from "../routes/RouteModel.js";
import BusModel from "../buses/BusModel.js";
import { calculateSpeed } from "../../utils/haversine.js";

export class TrackingController {
  // ── POST /api/track ───────────────────────────────────────────────────────
  // Receives telemetry from mobile driver app every 10 seconds
  async receiveTelemetry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        driverId,
        driverName,
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
          latitude,
          longitude,
          currentTimestamp,
          prevRecord.speed || 0
        );
      }

      // Create tracking record
      // Update existing tracking or create if not exists
    const trackingRecord = await TrackingModel.findOneAndUpdate(
      { bus: busId },
      {
        driverId: driverId || "UNKNOWN",
        driverName: driverName || "Unknown Driver",
        busId: busId,
        busNo: busNo || "BUS-000",
        routeId: routeId || busId,
        routeName: routeName || "Default Route",
        direction: direction || "Going",
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracy: Number(accuracy) || 0,
        speed: calculatedSpeed,
        timestamp: currentTimestamp,
        bus: busId,
        route: routeId,
        status: "Live",
      },
      {
        new: true,
        upsert: true,
      }
    );
      // Also update Bus location field
      await BusModel.findByIdAndUpdate(busId, {
        location: {
          lat: Number(latitude),
          lng: Number(longitude),
          updatedAt: currentTimestamp,
        },
      });

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

      // Get bus IDs assigned to this route
      const busIds = route.assignedBuses?.map((b: any) => b._id) || [];

      // Find latest tracking entry for any of the assigned buses or matching routeId
      const latestTracking = await TrackingModel.findOne({
        $or: [
          { routeId: route._id },
          { route: route._id },
          { busId: { $in: busIds } },
          { bus: { $in: busIds } },
        ],
      })
        .sort({ createdAt: -1 })
        .populate("bus")
        .populate("route");

      if (!latestTracking) {
        res.status(404).json({
          success: false,
          message: "No live tracking data available for buses on this route.",
          route,
        });
        return;
      }

      res.status(200).json({
        success: true,
        route,
        tracking: latestTracking,
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
      })
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
      const trackings = await TrackingModel.aggregate([
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$busId",
            doc: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$doc" } },
      ]);

      res.status(200).json({ success: true, count: trackings.length, tracking: trackings });
    } catch (error) {
      next(error);
    }
  }
}

export default TrackingController;
