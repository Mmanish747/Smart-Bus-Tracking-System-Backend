import { Request, Response, NextFunction } from "express";
import TripModel from "./TripModel.js";
import BusModel from "../buses/BusModel.js";
import DriverModel from "../drivers/DriverModel.js";

export class TripController {
  // Start a trip
  async startTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { busId, driverId, routeId } = req.body;

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

      // Check if bus already has an ongoing trip
      const existingTrip = await TripModel.findOne({
        bus: busId,
        status: "ongoing",
      });

      if (existingTrip) {
        res.status(400).json({
          success: false,
          message: "This bus already has an ongoing trip",
        });
        return;
      }

      const trip = await TripModel.create({
        bus: busId,
        driver: driverId,
        route: routeId,
      });

      bus.status = "active";
      driver.status = "on_trip";

      await bus.save();
      await driver.save();

      res.status(201).json({
        success: true,
        message: "Trip started successfully",
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  // End a trip
  async endTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const trip = await TripModel.findById(req.params.id);

      if (!trip) {
        res.status(404).json({ success: false, message: "Trip not found" });
        return;
      }

      if (trip.status !== "ongoing") {
        res.status(400).json({
          success: false,
          message: "Trip is already completed or cancelled",
        });
        return;
      }

      trip.status = "completed";
      trip.endTime = new Date();

      // Calculate duration in minutes
      trip.duration = Math.floor(
        (trip.endTime.getTime() - trip.startTime.getTime()) / 60000
      );

      await trip.save();

      // Update bus and driver status
      await BusModel.findByIdAndUpdate(trip.bus, { status: "inactive" });
      await DriverModel.findByIdAndUpdate(trip.driver, { status: "available" });

      res.status(200).json({
        success: true,
        message: "Trip ended successfully",
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all trips
  async getAllTrips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const trips = await TripModel.find()
        .populate("bus")
        .populate({
          path: "driver",
          populate: {
            path: "user",
            select: "name email phone",
          },
        })
        .populate("route")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: trips.length,
        data: trips,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get active trips
  async getActiveTrips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const trips = await TripModel.find({ status: "ongoing" })
        .populate("bus")
        .populate({
          path: "driver",
          populate: {
            path: "user",
            select: "name email phone",
          },
        })
        .populate("route")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: trips.length,
        data: trips,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default TripController;