import { Router } from "express";
import { TeamController } from "./TeamController.js";
import { validateBody } from "../../middleware/ValidatorMiddleware.js";
import { authenticate, authorize } from "../../middleware/AuthMiddleware.js";

const teamsRouter = Router();
const teamCtrl = new TeamController();

teamsRouter.get("/", teamCtrl.getAllMembers.bind(teamCtrl));
teamsRouter.post("/", authenticate, authorize(["admin"]), validateBody(["name", "role"]), teamCtrl.createMember.bind(teamCtrl));
teamsRouter.put("/:id", authenticate, authorize(["admin"]), teamCtrl.updateMember.bind(teamCtrl));
teamsRouter.delete("/:id", authenticate, authorize(["admin"]), teamCtrl.deleteMember.bind(teamCtrl));

export default teamsRouter;
