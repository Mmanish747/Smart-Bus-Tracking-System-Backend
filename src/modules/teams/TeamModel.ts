import { Schema, model } from "mongoose";

const teamSchema = new Schema(
  {
    name: { type: String, required: true },
    role: { type: String, required: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const TeamModel = model("Team", teamSchema);
export default TeamModel;
