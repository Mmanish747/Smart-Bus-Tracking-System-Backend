import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import DriverModel from "./DriverModel.js";
import BusModel from "../buses/BusModel.js";

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}


export class DriverController {
  // ── POST /api/drivers/login ───────────────────────────────────────────────
  // Driver Mobile Verification Login
  async loginDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { driverNo, name } = req.body;

      if (!driverNo || !name) {
        res.status(400).json({
          success: false,
          message: "Both Driver Number and Driver Name are required.",
        });
        return;
      }

      const queryDriverNo = String(driverNo).trim();
      const queryName = String(name).trim();

      // Flexible query: matches driverId or licenseNumber + name (case-insensitive regex)
      const driver = await DriverModel.findOne({
        $or: [
          { driverId: queryDriverNo },
          { licenseNumber: queryDriverNo },
          { _id: queryDriverNo.match(/^[0-9a-fA-F]{24}$/) ? queryDriverNo : null },
        ],
        name: { $regex: new RegExp(`^${queryName}$`, "i") },
      }).populate({
        path: "assignedBuses",
        populate: { path: "assignedRoute" },
      });

      if (!driver) {
        res.status(401).json({
          success: false,
          message: "Invalid driver credentials. Please check your Driver Number and Name.",
        });
        return;
      }

      if (!driver.active) {
        res.status(403).json({
          success: false,
          message: "Your driver account is currently inactive. Contact system administrator.",
        });
        return;
      }

          const token = jwt.sign(
      {
        id: driver._id,
        role: "driver",
        email: driver.email,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      success: true,
      message: "Driver verified successfully.",
      token,
      driver: {
        id: driver._id,
        driverId: driver.driverId,
        name: driver.name,
        phoneNumber: driver.phoneNumber,
        email: driver.email,
        licenseNumber: driver.licenseNumber,
        assignedBuses: driver.assignedBuses || [],
      },
    });
    } catch (error) {
      next(error);
    }
  }

  // ── GET /api/drivers/:driverId/buses ──────────────────────────────────────
  // Fetch buses assigned to a specific driver
  async getDriverBuses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { driverId } = req.params;

      const queryDriverId = String(driverId);
      const driver = await DriverModel.findOne({
        $or: [
          { _id: queryDriverId.match(/^[0-9a-fA-F]{24}$/) ? queryDriverId : null },
          { driverId: queryDriverId },
        ],
      } as any).populate({
        path: "assignedBuses",
        populate: { path: "assignedRoute" },
      });

      if (!driver) {
        res.status(404).json({ success: false, message: "Driver not found." });
        return;
      }

      res.status(200).json({
        success: true,
        buses: driver.assignedBuses || [],
      });
    } catch (error) {
      next(error);
    }
  }

  // ── GET /api/drivers ──────────────────────────────────────────────────────
  async getAllDrivers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const drivers = await DriverModel.find()
        .populate("assignedBuses")
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, drivers });
    } catch (error) {
      next(error);
    }
  }

  // ── GET /api/drivers/:id ──────────────────────────────────────────────────
  async getDriverById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await DriverModel.findById(req.params.id).populate("assignedBuses");

      if (!driver) {
        res.status(404).json({ success: false, message: "Driver not found" });
        return;
      }

      res.status(200).json({ success: true, driver });
    } catch (error) {
      next(error);
    }
  }

  // ── POST /api/drivers ─────────────────────────────────────────────────────
  async createDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, age, phoneNumber, email, licenseNumber, experienceYears, active } = req.body;

      const emailExists = await DriverModel.findOne({ email: email?.toLowerCase() });
      if (emailExists) {
        res.status(400).json({ success: false, message: "Email already registered" });
        return;
      }

      const licenseExists = await DriverModel.findOne({ licenseNumber });
      if (licenseExists) {
        res.status(400).json({ success: false, message: "License number already registered" });
        return;
      }

      // const count = await DriverModel.countDocuments();

      const lastDriver = await DriverModel.findOne({
        driverId: /^DRV-\d+$/
      }).sort({ driverId: -1 });

      let next = 1;

      if (lastDriver?.driverId) {
        next = parseInt(lastDriver.driverId.replace("DRV-", ""), 10) + 1;
      }

      const driverId = `DRV-${String(next).padStart(4, "0")}`;

      const driver = await DriverModel.create({
        driverId,
        name,
        age,
        phoneNumber,
        email,
        licenseNumber,
        experienceYears: experienceYears ?? 0,
        active: active ?? true,
      });

      const populated = await DriverModel.findById(driver._id).populate("assignedBuses");

      res.status(201).json({
        success: true,
        message: "Driver created successfully",
        driver: populated,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── PUT /api/drivers/:id ──────────────────────────────────────────────────
  async updateDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, age, phoneNumber, email, licenseNumber, experienceYears, active } = req.body;

      if (email) {
        const emailExists = await DriverModel.findOne({
          email: email.toLowerCase(),
          _id: { $ne: id },
        });
        if (emailExists) {
          res.status(400).json({ success: false, message: "Email already registered" });
          return;
        }
      }

      if (licenseNumber) {
        const licenseExists = await DriverModel.findOne({
          licenseNumber,
          _id: { $ne: id },
        });
        if (licenseExists) {
          res.status(400).json({ success: false, message: "License number already registered" });
          return;
        }
      }

      const driver = await DriverModel.findByIdAndUpdate(
        id,
        { name, age, phoneNumber, email, licenseNumber, experienceYears, active },
        { new: true, runValidators: true }
      ).populate("assignedBuses");

      if (!driver) {
        res.status(404).json({ success: false, message: "Driver not found" });
        return;
      }

      res.status(200).json({ success: true, driver });
    } catch (error) {
      next(error);
    }
  }

  // ── DELETE /api/drivers/:id ───────────────────────────────────────────────
  async deleteDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await DriverModel.findById(req.params.id);

      if (!driver) {
        res.status(404).json({ success: false, message: "Driver not found" });
        return;
      }

      if (driver.assignedBuses?.length) {
        await BusModel.updateMany(
          { _id: { $in: driver.assignedBuses } },
          { $pull: { assignedDrivers: driver._id } }
        );
      }

      await driver.deleteOne();

      res.status(200).json({ success: true, message: "Driver deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export default DriverController;