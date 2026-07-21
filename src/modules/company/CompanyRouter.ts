import { Router } from "express";
import { CompanyController } from "./CompanyController.js";
import { authenticate } from "../../middleware/AuthMiddleware.js";

const companyRouter = Router();
const companyCtrl = new CompanyController();

companyRouter.post(
  "/",
  authenticate,
  companyCtrl.create.bind(companyCtrl)
);

companyRouter.get(
  "/",
  authenticate,
  companyCtrl.getAll.bind(companyCtrl)
);

export default companyRouter;