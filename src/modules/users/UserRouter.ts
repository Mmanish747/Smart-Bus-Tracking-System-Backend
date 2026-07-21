import { Router } from "express";
import { UserController } from "./UserController.js";
import { authenticate, authorize } from "../../middleware/AuthMiddleware.js";

const usersRouter = Router();
const userCtrl = new UserController();

usersRouter.get("/", userCtrl.getAllUsers.bind(userCtrl));
usersRouter.delete("/:id", authenticate, authorize(["admin"]), userCtrl.deleteUser.bind(userCtrl));

export default usersRouter;
