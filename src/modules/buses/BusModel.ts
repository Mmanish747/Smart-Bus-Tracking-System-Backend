import { Schema, model } from "mongoose";

const busSchema = new Schema(
  {
    busNumber: { type: String, required: true, unique: true },
    modelName: { type: String },
    capacity: { type: Number },
    status: {
      type: String,
      enum: ["Active", "Maintenance", "Inactive", "active", "inactive", "maintenance", "offline"],
      default: "Active",
    },
    location: {
      lat: Number,
      lng: Number,
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
    // Bus ↔ Route bidirectional fields
    routeAssigned: {
      type: Boolean,
      default: false,
    },
    assignedRoute: {
      type: Schema.Types.ObjectId,
      ref: "Route",
      default: null,
    },
    routeId: {
      type: String,
      default: "",
    },
    routeName: {
      type: String,
      default: "",
    },
    // Bus ↔ Driver relationship
    activeDriver: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    assignedDrivers: [
      {
        type: Schema.Types.ObjectId,
        ref: "Driver",
      },
    ],
  },
  { timestamps: true }
);

export const BusModel = model("Bus", busSchema);
export default BusModel;
