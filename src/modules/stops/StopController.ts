import { Request, Response, NextFunction } from "express";
import StopModel from "./StopModel.js";

export class StopController {
  /**
   * GET /api/stops/:routeId
   * Fetch the stop record for a specific route.
   */
  async getByRouteId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { routeId } = req.params;
      const record = await StopModel.findOne({ routeId } as any);
      if (!record) {
        res
          .status(404)
          .json({ success: false, message: "No stop record found for this route." });
        return;
      }
      res.status(200).json({ success: true, stops: record });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/stops
   * Create or replace the stop record for a route.
   * Body: { routeId, startPoint, endPoint, stops[] }
   */
  async createOrReplace(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { routeId, startPoint, endPoint, stops } = req.body;

      // Upsert — if a record for this route already exists, replace it
      const record = await StopModel.findOneAndUpdate(
        { routeId } as any,
        { routeId, startPoint, endPoint, stops },
        { new: true, upsert: true, runValidators: true }
      );

      res.status(200).json({ success: true, stops: record });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/stops/:routeId
   * Delete the stop record when a route is deleted.
   */
  async deleteByRouteId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { routeId } = req.params;
      await StopModel.findOneAndDelete({ routeId } as any);
      res
        .status(200)
        .json({ success: true, message: "Stop record deleted." });
    } catch (error) {
      next(error);
    }
  }
}

export default StopController;
