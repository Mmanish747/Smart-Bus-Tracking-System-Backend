import { Router } from "express";
import { BannerController } from "./BannerController.js";
import { validateBody } from "../../middleware/ValidatorMiddleware.js";
import { authenticate, authorize } from "../../middleware/AuthMiddleware.js";

const bannersRouter = Router();
const bannerCtrl = new BannerController();

bannersRouter.get("/", bannerCtrl.getAllBanners.bind(bannerCtrl));
bannersRouter.post("/", authenticate, authorize(["admin"]), validateBody(["title"]), bannerCtrl.createBanner.bind(bannerCtrl));
bannersRouter.put("/:id", authenticate, authorize(["admin"]), bannerCtrl.updateBanner.bind(bannerCtrl));
bannersRouter.delete("/:id", authenticate, authorize(["admin"]), bannerCtrl.deleteBanner.bind(bannerCtrl));

export default bannersRouter;
