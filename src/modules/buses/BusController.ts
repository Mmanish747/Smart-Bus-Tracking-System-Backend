import { Request, Response, NextFunction } from "express";
import BusModel from "./BusModel.js";
import DriverModel from "../drivers/DriverModel.js";
import RouteModel from "../routes/RouteModel.js";

export class BusController {
  // ── GET /api/buses ────────────────────────────────────────────────────────
  async getAllBuses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 100));
      const skip = (page - 1) * limit;

      const [buses, total] = await Promise.all([
        BusModel.find({})
          .populate("assignedDrivers")
          .populate("assignedRoute")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        BusModel.countDocuments({}),
      ]);

      res.status(200).json({
        success: true,
        buses,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }

  // ── GET /api/buses/:id ────────────────────────────────────────────────────
  async getBusById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const bus = await BusModel.findById(id)
        .populate("assignedDrivers")
        .populate("assignedRoute");

      if (!bus) {
        res.status(404).json({ success: false, message: "Bus not found." });
        return;
      }
      res.status(200).json({ success: true, bus });
    } catch (error) {
      next(error);
    }
  }

  // ── GET /api/buses/:busId/route ───────────────────────────────────────────
  // Fetch assigned route for a specific bus (Mobile App Route Loading)
  async getBusRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { busId } = req.params;

      const bus = await BusModel.findById(busId).populate("assignedRoute");

      if (!bus) {
        res.status(404).json({ success: false, message: "Bus not found." });
        return;
      }

      if (!bus.assignedRoute) {
        res.status(404).json({
          success: false,
          message: "No route currently assigned to this bus.",
          busNo: bus.busNumber,
        });
        return;
      }

      const routeObj: any = bus.assignedRoute;

      res.status(200).json({
        success: true,
        routeId: routeObj._id,
        routeName: `${routeObj.from} - ${routeObj.to}`,
        routeNo: routeObj.routeNo,
        from: routeObj.from,
        to: routeObj.to,
        via: routeObj.via || "",
        route: routeObj,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── POST /api/buses ───────────────────────────────────────────────────────
  async createBus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { busNumber, modelName, capacity, status, assignedDrivers, assignedRoute } = req.body;

      const existing = await BusModel.findOne({ busNumber });
      if (existing) {
        res.status(400).json({ success: false, message: "Bus number already exists." });
        return;
      }

      const driverIds = Array.isArray(assignedDrivers) ? assignedDrivers : [];

      let routeIdStr = "";
      let routeNameStr = "";

      if (assignedRoute) {
        const routeDoc = await RouteModel.findById(assignedRoute);
        if (routeDoc) {
          routeIdStr = routeDoc._id.toString();
          routeNameStr = `${routeDoc.from} - ${routeDoc.to}`;
        }
      }

      const newBus = await BusModel.create({
        busNumber,
        modelName,
        capacity,
        status: status || "Active",
        assignedDrivers: driverIds,
        assignedRoute: assignedRoute || null,
        routeId: routeIdStr,
        routeName: routeNameStr,
      });

      // Synchronize Driver collection
      if (driverIds.length > 0) {
        await DriverModel.updateMany(
          { _id: { $in: driverIds } },
          { $addToSet: { assignedBuses: newBus._id } }
        );
      }

      // Synchronize Route collection
      if (assignedRoute) {
        await RouteModel.findByIdAndUpdate(assignedRoute, {
          assignedBusId: newBus._id.toString(),
          assignedBusNo: newBus.busNumber,
          $addToSet: { assignedBuses: newBus._id },
        });
      }

      const populatedBus = await BusModel.findById(newBus._id)
        .populate("assignedDrivers")
        .populate("assignedRoute");

      res.status(201).json({ success: true, bus: populatedBus });
    } catch (error) {
      next(error);
    }
  }

  // ── PUT /api/buses/:id ────────────────────────────────────────────────────
  async updateBus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { busNumber, modelName, capacity, status, assignedDrivers, assignedRoute } = req.body;

      const bus = await BusModel.findById(id);
      if (!bus) {
        res.status(404).json({ success: false, message: "Bus not found." });
        return;
      }

      if (busNumber && busNumber !== bus.busNumber) {
        const existing = await BusModel.findOne({ busNumber, _id: { $ne: id } });
        if (existing) {
          res.status(400).json({ success: false, message: "Bus number already exists." });
          return;
        }
        bus.busNumber = busNumber;
      }

      if (modelName !== undefined) bus.modelName = modelName;
      if (capacity !== undefined) bus.capacity = capacity;
      if (status !== undefined) bus.status = status;

      // Handle assignedRoute updates
      if (assignedRoute !== undefined) {
        const oldRouteId = bus.assignedRoute?.toString();

        if (assignedRoute) {
          const routeDoc = await RouteModel.findById(assignedRoute);
          if (routeDoc) {
            bus.assignedRoute = routeDoc._id as any;
            bus.routeId = routeDoc._id.toString();
            bus.routeName = `${routeDoc.from} - ${routeDoc.to}`;

            // Sync new route
            await RouteModel.findByIdAndUpdate(assignedRoute, {
              assignedBusId: bus._id.toString(),
              assignedBusNo: bus.busNumber,
              $addToSet: { assignedBuses: bus._id },
            });
          }
        } else {
          // Unlink route
          bus.assignedRoute = null;
          bus.routeId = "";
          bus.routeName = "";

          if (oldRouteId) {
            await RouteModel.findByIdAndUpdate(oldRouteId, {
              assignedBusId: "",
              assignedBusNo: "",
              $pull: { assignedBuses: bus._id },
            });
          }
        }
      }

      // Handle assignedDrivers updates
      if (Array.isArray(assignedDrivers)) {
        const oldDriverIds = bus.assignedDrivers.map((d) => d.toString());
        const newDriverIds = assignedDrivers.map((d: string) => d.toString());

        const removedDriverIds = oldDriverIds.filter((did) => !newDriverIds.includes(did));
        const addedDriverIds = newDriverIds.filter((did) => !oldDriverIds.includes(did));

        if (removedDriverIds.length > 0) {
          await DriverModel.updateMany(
            { _id: { $in: removedDriverIds } },
            { $pull: { assignedBuses: bus._id } }
          );
        }
        if (addedDriverIds.length > 0) {
          await DriverModel.updateMany(
            { _id: { $in: addedDriverIds } },
            { $addToSet: { assignedBuses: bus._id } }
          );
        }

        bus.assignedDrivers = assignedDrivers as any;
      }

      await bus.save();

      const updatedBus = await BusModel.findById(id)
        .populate("assignedDrivers")
        .populate("assignedRoute");

      res.status(200).json({ success: true, bus: updatedBus });
    } catch (error) {
      next(error);
    }
  }

  // ── DELETE /api/buses/:id ─────────────────────────────────────────────────
  async deleteBus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const bus = await BusModel.findById(id);
      if (!bus) {
        res.status(404).json({ success: false, message: "Bus not found." });
        return;
      }

      // Clean up driver references
      await DriverModel.updateMany(
        { assignedBuses: bus._id },
        { $pull: { assignedBuses: bus._id } }
      );

      // Clean up route references
      if (bus.assignedRoute) {
        await RouteModel.findByIdAndUpdate(bus.assignedRoute, {
          assignedBusId: "",
          assignedBusNo: "",
          $pull: { assignedBuses: bus._id },
        });
      }

      await bus.deleteOne();
      res.status(200).json({ success: true, message: "Bus deleted successfully." });
    } catch (error) {
      next(error);
    }
  }

  // ── POST /api/buses/:busId/assign-driver ──────────────────────────────────
  async assignDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { driverId } = req.body;
      const busId = req.params.busId || req.params.id;

      if (!driverId) {
        res.status(400).json({ success: false, message: "driverId is required" });
        return;
      }

      const bus = await BusModel.findById(busId);
      if (!bus) {
        res.status(404).json({ success: false, message: "Bus not found" });
        return;
      }

      const driver = await DriverModel.findById(driverId);
      if (!driver) {
        res.status(404).json({ success: false, message: "Driver not found" });
        return;
      }

      await BusModel.findByIdAndUpdate(busId, { $addToSet: { assignedDrivers: driverId } });
      await DriverModel.findByIdAndUpdate(driverId, { $addToSet: { assignedBuses: busId } });

      const updatedBus = await BusModel.findById(busId)
        .populate("assignedDrivers")
        .populate("assignedRoute");

      res.status(200).json({
        success: true,
        message: "Driver assigned successfully",
        bus: updatedBus,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── POST /api/buses/:busId/remove-driver ──────────────────────────────────
  async removeDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { driverId } = req.body;
      const busId = req.params.busId || req.params.id;

      if (!driverId) {
        res.status(400).json({ success: false, message: "driverId is required" });
        return;
      }

      const bus = await BusModel.findById(busId);
      if (!bus) {
        res.status(404).json({ success: false, message: "Bus not found" });
        return;
      }

      await BusModel.findByIdAndUpdate(busId, { $pull: { assignedDrivers: driverId } });
      await DriverModel.findByIdAndUpdate(driverId, { $pull: { assignedBuses: busId } });

      const updatedBus = await BusModel.findById(busId)
        .populate("assignedDrivers")
        .populate("assignedRoute");

      res.status(200).json({
        success: true,
        message: "Driver removed successfully",
        bus: updatedBus,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default BusController;
