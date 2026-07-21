import { Request, Response, NextFunction } from "express";
import CompanyModel from "./CompanyModel.js";

export class CompanyController {

  async create(req: Request, res: Response, next: NextFunction) {
    try {

      const company = await CompanyModel.create(req.body);

      res.status(201).json({
        success: true,
        message: "Company created successfully",
        data: company,
      });

    } catch (err) {
      next(err);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {

      const companies = await CompanyModel.find().sort({ createdAt: -1 });

      res.json({
        success: true,
        data: companies,
      });

    } catch (err) {
      next(err);
    }
  }

}