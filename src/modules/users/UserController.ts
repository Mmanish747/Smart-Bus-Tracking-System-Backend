import { Request, Response, NextFunction } from "express";
import UserModel from "./UserModel.js";

export class UserController {
  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        UserModel.find({}).select("-password").skip(skip).limit(limit),
        UserModel.countDocuments({}),
      ]);
      res.status(200).json({ success: true, users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await UserModel.findByIdAndDelete(id);
      if (!user) {
        res.status(404).json({ success: false, message: "User not found." });
        return;
      }
      res.status(200).json({ success: true, message: "User deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
}
export default UserController;
