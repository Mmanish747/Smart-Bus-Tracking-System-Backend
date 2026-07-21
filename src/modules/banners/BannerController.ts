import { Request, Response, NextFunction } from "express";
import BannerModel from "./BannerModel.js";

export class BannerController {
  async getAllBanners(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;
      const [banners, total] = await Promise.all([
        BannerModel.find({}).sort({ order: 1 }).skip(skip).limit(limit),
        BannerModel.countDocuments({}),
      ]);
      res.status(200).json({ success: true, banners, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
      next(error);
    }
  }

  async createBanner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, subtitle, image, link, active, order } = req.body;
      const newBanner = await BannerModel.create({ title, subtitle, image, link, active, order });
      res.status(201).json({ success: true, banner: newBanner });
    } catch (error) {
      next(error);
    }
  }

  async updateBanner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { title, subtitle, image, link, active, order } = req.body;
      const banner = await BannerModel.findByIdAndUpdate(id, { title, subtitle, image, link, active, order }, { new: true, runValidators: true });
      if (!banner) {
        res.status(404).json({ success: false, message: "Banner not found." });
        return;
      }
      res.status(200).json({ success: true, banner });
    } catch (error) {
      next(error);
    }
  }

  async deleteBanner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const banner = await BannerModel.findByIdAndDelete(id);
      if (!banner) {
        res.status(404).json({ success: false, message: "Banner not found." });
        return;
      }
      res.status(200).json({ success: true, message: "Banner deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
}
export default BannerController;
