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
        RouteModel.find({}).skip(skip).limit(limit),
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
      const route = await RouteModel.findById(id);
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
        namedStops, // [{ name, lat, lng, type }]
      } = req.body;

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
      });

      // Persist named stop record if provided
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
      const { routeNo, from, to, via, frequency, status, color, active, stops, pathCoordinates, namedStops } = req.body;
      const route = await RouteModel.findByIdAndUpdate(id, { routeNo, from, to, via, frequency, status, color, active, stops, pathCoordinates }, { new: true, runValidators: true });
      if (!route) {
        res.status(404).json({ success: false, message: "Route not found." });
        return;
      }

      // Replace named stop record if new stops are provided
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
      const route = await RouteModel.findByIdAndDelete(id);
      if (!route) {
        res.status(404).json({ success: false, message: "Route not found." });
        return;
      }
      // Cascade delete the stop record
      await StopModel.findOneAndDelete({ routeId: id });
      res.status(200).json({ success: true, message: "Route deleted successfully." });
    } catch (error) {
      next(error);
    }
  }

  async assignBus( req: Request, res: Response, next: NextFunction): Promise<void> {
  
    try {
      const { busId } = req.body;
      const routeId = req.params.id;

      const route = await RouteModel.findById(routeId);

      if (!route) {
        res.status(404).json({
          success: false,
          message: "Route not found",
        });
        return;
      }

      const bus = await BusModel.findById(busId);

      if (!bus) {
        res.status(404).json({
          success: false,
          message: "Bus not found",
        });
        return;
      }

      // Remove bus from previous route
      if (bus.assignedRoute) {

        const oldRoute = await RouteModel.findById(bus.assignedRoute);

        if (oldRoute) {
          oldRoute.assignedBuses =
            oldRoute.assignedBuses.filter(
              (id: any) => id.toString() !== bus._id.toString()
            );

          await oldRoute.save();
        }
      }

      bus.assignedRoute = route._id;

      if (
        !route.assignedBuses.some(
          (id: any) => id.toString() === bus._id.toString()
        )
      ) {
        route.assignedBuses.push(bus._id);
      }

      await bus.save();
      await route.save();

      res.status(200).json({
        success: true,
        message: "Bus assigned successfully",
      });

    } catch (error) {
      next(error);
    }
  }

  async removeBus( req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const route = await RouteModel.findById(req.params.id);

      if (!route) {
        res.status(404).json({
          success: false,
          message: "Route not found",
        });
        return;
      }

      const { busId } = req.body;

      route.assignedBuses = route.assignedBuses.filter(
        (id: any) => id.toString() !== busId
      );

      await route.save();

      await BusModel.findByIdAndUpdate(busId, {
        assignedRoute: null,
      });

      res.status(200).json({
        success: true,
        message: "Bus removed from route",
      });

    } catch (error) {
      next(error);
    }
  }
}
export default RouteController;
