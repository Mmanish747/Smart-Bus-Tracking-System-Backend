import { Schema, model } from "mongoose";

const namedStopSchema = new Schema(
  {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    type: {
      type: String,
      enum: ["start", "stop", "end"],
      default: "stop",
    },
  },
  { _id: false }
);

const gpsPointSchema = new Schema(
  {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const routeStopSchema = new Schema(
  {
    routeId: {
      type: Schema.Types.ObjectId,
      ref: "Route",
      required: true,
      unique: true,
    },
    startPoint: { type: gpsPointSchema, required: true },
    endPoint: { type: gpsPointSchema, required: true },
    stops: [namedStopSchema],
  },
  { timestamps: true }
);

export const StopModel = model("Stop", routeStopSchema);
export default StopModel;
