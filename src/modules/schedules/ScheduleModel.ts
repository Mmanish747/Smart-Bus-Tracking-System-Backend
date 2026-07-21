import { Schema, model } from "mongoose";

const scheduleSchema = new Schema(
  {
    route: { type: Schema.Types.ObjectId, ref: "Route", required: true },
    bus: { type: Schema.Types.ObjectId, ref: "Bus", required: true },
    firstBus: { type: String, required: true },
    lastBus: { type: String, required: true },
    frequency: { type: String, required: true },
    status: { type: String, default: "On Time" },
    active: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ScheduleModel = model("Schedule", scheduleSchema);
export default ScheduleModel;
