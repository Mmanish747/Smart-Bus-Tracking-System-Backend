import { Router } from "express";
import { AuthController } from "./AuthController.js";
import { validateBody } from "../../middleware/ValidatorMiddleware.js";
import { authenticate } from "../../middleware/AuthMiddleware.js";
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many attempts, please try again later." },
});

const authRouter = Router();
const authCtrl = new AuthController();

authRouter.post("/register", authLimiter, validateBody(["name", "email", "password"]), authCtrl.register.bind(authCtrl));
authRouter.post("/login", authLimiter, validateBody(["email", "password"]), authCtrl.login.bind(authCtrl));
authRouter.get("/me", authenticate, authCtrl.me.bind(authCtrl));

export default authRouter;