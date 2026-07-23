import { Request, Response, NextFunction } from "express";
import RouteModel from "./RouteModel.js";
import BusModel from "../buses/BusModel.js";
import StopModel from "../stops/StopModel.js";
import ScheduleModel from "../schedules/ScheduleModel.js";

export class RouteController {
  private async syncRouteSchedules(routeId: string, busIds: string[], frequency: string): Promise<void> {
    const defaultFirstBus = "06:00";
    const defaultLastBus = "22:00";

    await Promise.all(
      busIds.map((busId) =>
        ScheduleModel.findOneAndUpdate(
          { route: routeId, bus: busId },
          {
            route: routeId,
            bus: busId,
            firstBus: defaultFirstBus,
            lastBus: defaultLastBus,
            frequency,
            status: "On Time",
            active: true,
          },
          { upsert: true, new: true, runValidators: true }
        )
      )
    );

    await ScheduleModel.deleteMany({ route: routeId, bus: { $nin: busIds } } as any);
  }

  async getAllRoutes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;
      const [routes, total] = await Promise.all([
        RouteModel.find({}).populate("assignedBus").populate("assignedBuses").skip(skip).limit(limit),
        RouteModel.countDocuments({}),
      ]);
      res.status(200).json({ success: true, routes, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
      next(error);
    }
  }

  async getRouteById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const route = await RouteModel.findById(id).populate("assignedBus").populate("assignedBuses");
      if (!route) {
        res.status(404).json({ success: false, message: "Route not found." });
        return;
      }
      res.status(200).json({ success: true, route });
    } catch (error) {
      next(error);
    }
  }

  async createRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        routeNo, from, to, via, frequency, status, color, active, stops, pathCoordinates, namedStops, assignedBuses, assignedBus
      } = req.body;

      const busIds = Array.isArray(assignedBuses)
        ? assignedBuses.filter(Boolean)
        : assignedBus
        ? [assignedBus]
        : [];

      if (busIds.length > 0) {
        const busDocs = await BusModel.find({ _id: { $in: busIds } });
        const alreadyAssigned = busDocs.find((bus) => bus.routeAssigned && bus.assignedRoute);
        if (alreadyAssigned) {
          res.status(400).json({ success: false, message: "One or more selected buses are already assigned to another route." });
          return;
        }
      }

      const newRoute = await RouteModel.create({
        routeNo,
        from,
        to,
        via,
        frequency,
        status,
        color,
        active,
        stops,
        pathCoordinates,
        assignedBus: busIds[0] || null,
        busAssigned: busIds.length > 0,
        assignedBuses: busIds,
      });

      if (busIds.length > 0) {
        await BusModel.updateMany(
          { _id: { $in: busIds } },
          {
            assignedRoute: newRoute._id,
            routeAssigned: true,
            routeId: newRoute._id.toString(),
            routeName: `${newRoute.from} - ${newRoute.to}`,
          }
        );
        await this.syncRouteSchedules(newRoute._id.toString(), busIds, newRoute.frequency);
      }

      if (namedStops && namedStops.length >= 2) {
        const startPoint = namedStops[0];
        const endPoint = namedStops[namedStops.length - 1];
        await StopModel.findOneAndUpdate(
          { routeId: newRoute._id } as any,
          {
            routeId: newRoute._id,
            startPoint: { name: startPoint.name, lat: startPoint.lat, lng: startPoint.lng },
            endPoint: { name: endPoint.name, lat: endPoint.lat, lng: endPoint.lng },
            stops: namedStops,
          },
          { upsert: true, new: true, runValidators: true }
        );
      }

      res.status(201).json({ success: true, route: newRoute });
    } catch (error) {
      next(error);
    }
  }

  async updateRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { routeNo, from, to, via, frequency, status, color, active, stops, pathCoordinates, namedStops, assignedBuses, assignedBus } = req.body;
      
      const route = await RouteModel.findById(id);
      if (!route) {
        res.status(404).json({ success: false, message: "Route not found." });
        return;
      }

      const oldAssignedBusIds = (route.assignedBuses || (route.assignedBus ? [route.assignedBus] : [])).map((bus) =>
        typeof bus === "string" ? bus : (bus as any)._id.toString()
      );

      route.routeNo = routeNo;
      route.from = from;
      route.to = to;
      route.via = via;
      route.frequency = frequency;
      route.status = status;
      route.color = color;
      route.active = active;
      route.stops = stops;
      route.pathCoordinates = pathCoordinates;

      if (assignedBuses !== undefined || assignedBus !== undefined) {
        const newBusIds = Array.isArray(assignedBuses)
          ? assignedBuses.filter(Boolean)
          : assignedBus
          ? [assignedBus]
          : [];

        const busesToAssign = newBusIds.filter((id: string) => !oldAssignedBusIds.includes(id));
        const busesToUnassign = oldAssignedBusIds.filter((id) => !newBusIds.includes(id));

        if (busesToAssign.length > 0) {
          const busDocs = await BusModel.find({ _id: { $in: busesToAssign } });
          const alreadyAssigned = busDocs.find(
            (bus) => bus.routeAssigned && bus.assignedRoute && bus.assignedRoute.toString() !== route._id.toString()
          );
          if (alreadyAssigned) {
            res.status(400).json({ success: false, message: "One or more selected buses are already assigned to another route." });
            return;
          }

          await BusModel.updateMany(
            { _id: { $in: busesToAssign } },
            {
              assignedRoute: route._id,
              routeAssigned: true,
              routeId: route._id.toString(),
              routeName: `${route.from} - ${route.to}`,
            }
          );
        }

        if (busesToUnassign.length > 0) {
          await BusModel.updateMany(
            { _id: { $in: busesToUnassign } },
            {
              assignedRoute: null,
              routeAssigned: false,
              routeId: "",
              routeName: "",
            }
          );
        }

        route.assignedBuses = newBusIds;
        route.assignedBus = newBusIds[0] || null;
        route.busAssigned = newBusIds.length > 0;
      }

      await route.save();

      if (assignedBuses !== undefined || assignedBus !== undefined) {
        const newBusIds = Array.isArray(assignedBuses)
          ? assignedBuses.filter(Boolean)
          : assignedBus
          ? [assignedBus]
          : [];
        await this.syncRouteSchedules(route._id.toString(), newBusIds, route.frequency);
      }

      if (namedStops && namedStops.length >= 2) {
        const startPoint = namedStops[0];
        const endPoint = namedStops[namedStops.length - 1];
        await StopModel.findOneAndUpdate(
          { routeId: id } as any,
          {
            routeId: id,
            startPoint: { name: startPoint.name, lat: startPoint.lat, lng: startPoint.lng },
            endPoint: { name: endPoint.name, lat: endPoint.lat, lng: endPoint.lng },
            stops: namedStops,
          },
          { upsert: true, new: true, runValidators: true }
        );
      }

      res.status(200).json({ success: true, route });
    } catch (error) {
      next(error);
    }
  }

  async deleteRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const route = await RouteModel.findById(id);
      if (!route) {
        res.status(404).json({ success: false, message: "Route not found." });
        return;
      }
      
      const busIds = (route.assignedBuses || (route.assignedBus ? [route.assignedBus] : [])).map((bus) =>
        typeof bus === "string" ? bus : (bus as any)._id
      );

      if (busIds.length > 0) {
        await BusModel.updateMany(
          { _id: { $in: busIds } },
          {
            assignedRoute: null,
            routeAssigned: false,
            routeId: "",
            routeName: "",
          }
        );
      }

      await route.deleteOne();
      await StopModel.findOneAndDelete({ routeId: id } as any);
      await ScheduleModel.deleteMany({ route: id } as any);
      res.status(200).json({ success: true, message: "Route deleted successfully." });
    } catch (error) {
      next(error);
    }
  }

  async assignBus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { busId } = req.body;
      const routeId = req.params.id;

      const route = await RouteModel.findById(routeId);
      if (!route) { res.status(404).json({ success: false, message: "Route not found" }); return; }

      const bus = await BusModel.findById(busId);
      if (!bus) { res.status(404).json({ success: false, message: "Bus not found" }); return; }

      if (bus.assignedRoute && bus.assignedRoute.toString() !== route._id.toString()) {
        res.status(400).json({ success: false, message: "Bus is already assigned to another route." });
        return;
      }

      if (!route.assignedBuses?.some((id) => id.toString() === bus._id.toString())) {
        route.assignedBuses = [...(route.assignedBuses || []), bus._id as any];
      }
      route.assignedBus = route.assignedBuses[0] || null;
      route.busAssigned = route.assignedBuses.length > 0;

      bus.assignedRoute = route._id;
      bus.routeAssigned = true;
      bus.routeId = route._id.toString();
      bus.routeName = `${route.from} - ${route.to}`;

      await bus.save();
      await route.save();

      await this.syncRouteSchedules(route._id.toString(), route.assignedBuses.map((id) => id.toString()), route.frequency);

      res.status(200).json({ success: true, message: "Bus assigned successfully" });
    } catch (error) {
      next(error);
    }
  }

  async removeBus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const route = await RouteModel.findById(req.params.id);
      if (!route) { res.status(404).json({ success: false, message: "Route not found" }); return; }

      const { busId } = req.body;
      const unassignedBuses = (route.assignedBuses || []).filter((id) => id.toString() !== busId);

      route.assignedBuses = unassignedBuses as any;
      route.assignedBus = unassignedBuses[0] || null;
      route.busAssigned = unassignedBuses.length > 0;
      await route.save();

      await BusModel.findByIdAndUpdate(busId, {
        assignedRoute: null,
        routeAssigned: false,
        routeId: "",
        routeName: "",
      });

      await this.syncRouteSchedules(route._id.toString(), route.assignedBuses.map((id) => id.toString()), route.frequency);

      res.status(200).json({ success: true, message: "Bus removed from route" });
    } catch (error) {
      next(error);
    }
  }
}

export default RouteController;
