import { Schema, model } from "mongoose";

const stopSchema = new Schema({
  name: { type: String, required: true },
  lat: { type: Number },
  lng: { type: Number },
  timeOffset: { type: Number },
  type: { type: String, enum: ["start", "stop", "end"], default: "stop" },
});

const routeSchema = new Schema(
  {
    routeNo: { type: String, required: true, unique: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    via: { type: String },
    frequency: { type: String, required: true },
    status: { type: String, default: "On Time" },
    color: { type: String, default: "bg-green-600 text-white" },
    active: { type: Boolean, default: true },
    stops: [stopSchema],
    pathCoordinates: {
      type: [[Number]],
      required: true,
    },
    busAssigned: {
      type: Boolean,
      default: false,
    },
    assignedBus: {
      type: Schema.Types.ObjectId,
      ref: "Bus",
      default: null,
    },
    assignedBuses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Bus",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const RouteModel = model("Route", routeSchema);
export default RouteModel;
