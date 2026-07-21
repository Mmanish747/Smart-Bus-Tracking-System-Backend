import { Request, Response, NextFunction } from "express";
import TeamModel from "./TeamModel.js";

export class TeamController {
  async getAllMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;
      const [members, total] = await Promise.all([
        TeamModel.find({}).sort({ order: 1 }).skip(skip).limit(limit),
        TeamModel.countDocuments({}),
      ]);
      res.status(200).json({ success: true, members, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
      next(error);
    }
  }

  async createMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, role, description, image, linkedin, order } = req.body;
      const newMember = await TeamModel.create({ name, role, description, image, linkedin, order });
      res.status(201).json({ success: true, member: newMember });
    } catch (error) {
      next(error);
    }
  }

  async updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, role, description, image, linkedin, order } = req.body;
      const member = await TeamModel.findByIdAndUpdate(id, { name, role, description, image, linkedin, order }, { new: true, runValidators: true });
      if (!member) {
        res.status(404).json({ success: false, message: "Team member not found." });
        return;
      }
      res.status(200).json({ success: true, member });
    } catch (error) {
      next(error);
    }
  }

  async deleteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const member = await TeamModel.findByIdAndDelete(id);
      if (!member) {
        res.status(404).json({ success: false, message: "Team member not found." });
        return;
      }
      res.status(200).json({ success: true, message: "Team member deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
}
export default TeamController;
