import { Request, Response, NextFunction } from "express";
import RouteModel from "./RouteModel.js";
import BusModel from "../buses/BusModel.js";
import StopModel from "../stops/StopModel.js";

export class RouteController {
  async getAllRoutes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;
      const [routes, total] = await Promise.all([
        RouteModel.find({}).populate("assignedBus").skip(skip).limit(limit),
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
      const route = await RouteModel.findById(id).populate("assignedBus");
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
        routeNo, from, to, via, frequency, status, color, active, stops, pathCoordinates, namedStops, assignedBus
      } = req.body;

      if (assignedBus) {
        const busDoc = await BusModel.findById(assignedBus);
        if (busDoc && busDoc.routeAssigned && busDoc.assignedRoute) {
          res.status(400).json({ success: false, message: "Selected bus is already assigned to another route." });
          return;
        }
      }

      const newRoute = await RouteModel.create({
        routeNo, from, to, via, frequency, status, color, active, stops, pathCoordinates,
        assignedBus: assignedBus || null,
        busAssigned: !!assignedBus
      });

      if (assignedBus) {
        await BusModel.findByIdAndUpdate(assignedBus, {
          assignedRoute: newRoute._id,
          routeAssigned: true,
          routeId: newRoute._id.toString(),
          routeName: `${newRoute.from} - ${newRoute.to}`
        });
      }

      if (namedStops && namedStops.length >= 2) {
        const startPoint = namedStops[0];
        const endPoint = namedStops[namedStops.length - 1];
        await StopModel.findOneAndUpdate(
          { routeId: newRoute._id },
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
      const { routeNo, from, to, via, frequency, status, color, active, stops, pathCoordinates, namedStops, assignedBus } = req.body;
      
      const route = await RouteModel.findById(id);
      if (!route) {
        res.status(404).json({ success: false, message: "Route not found." });
        return;
      }

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

      if (assignedBus !== undefined) {
        const oldAssignedBusId = route.assignedBus?.toString();

        if (assignedBus) {
          if (oldAssignedBusId && oldAssignedBusId !== assignedBus) {
            res.status(400).json({ success: false, message: "Route is already assigned to a bus. Please unassign first." });
            return;
          }
          
          const busDoc = await BusModel.findById(assignedBus);
          if (busDoc && busDoc.assignedRoute && busDoc.assignedRoute.toString() !== route._id.toString()) {
            res.status(400).json({ success: false, message: "Selected bus is already assigned to another route." });
            return;
          }

          route.assignedBus = assignedBus as any;
          route.busAssigned = true;

          await BusModel.findByIdAndUpdate(assignedBus, {
            assignedRoute: route._id,
            routeAssigned: true,
            routeId: route._id.toString(),
            routeName: `${route.from} - ${route.to}`
          });
        } else {
          route.assignedBus = null;
          route.busAssigned = false;

          if (oldAssignedBusId) {
            await BusModel.findByIdAndUpdate(oldAssignedBusId, {
              assignedRoute: null,
              routeAssigned: false,
              routeId: "",
              routeName: ""
            });
          }
        }
      }

      await route.save();

      if (namedStops && namedStops.length >= 2) {
        const startPoint = namedStops[0];
        const endPoint = namedStops[namedStops.length - 1];
        await StopModel.findOneAndUpdate(
          { routeId: id },
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
      
      if (route.assignedBus) {
        await BusModel.findByIdAndUpdate(route.assignedBus, {
          assignedRoute: null,
          routeAssigned: false,
          routeId: "",
          routeName: ""
        });
      }

      await route.deleteOne();
      await StopModel.findOneAndDelete({ routeId: id });
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

      if (bus.assignedRoute) {
        const oldRoute = await RouteModel.findById(bus.assignedRoute);
        if (oldRoute) {
          oldRoute.assignedBus = null as any;
          oldRoute.busAssigned = false;
          await oldRoute.save();
        }
      }

      bus.assignedRoute = route._id;
      bus.routeAssigned = true;
      bus.routeId = route._id.toString();
      bus.routeName = `${route.from} - ${route.to}`;

      route.assignedBus = bus._id as any;
      route.busAssigned = true;

      await bus.save();
      await route.save();

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

      route.assignedBus = null as any;
      route.busAssigned = false;
      await route.save();

      await BusModel.findByIdAndUpdate(busId, {
        assignedRoute: null,
        routeAssigned: false,
        routeId: "",
        routeName: ""
      });

      res.status(200).json({ success: true, message: "Bus removed from route" });
    } catch (error) {
      next(error);
    }
  }
}

export default RouteController;
