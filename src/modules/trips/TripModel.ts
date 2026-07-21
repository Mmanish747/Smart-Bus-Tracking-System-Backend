import { Schema, model } from "mongoose";

const tripSchema = new Schema(
  {
    bus: {
      type: Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },

    driver: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },

    route: {
      type: Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },

    startTime: {
      type: Date,
      default: Date.now,
    },

    endTime: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["ongoing", "completed", "cancelled"],
      default: "ongoing",
    },

    distance: {
      type: Number,
      default: 0,
    },

    duration: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default model("Trip", tripSchema);