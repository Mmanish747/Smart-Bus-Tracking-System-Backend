import { Schema, model } from "mongoose";

const driverSchema = new Schema(
  {
    driverId: {
    type: String,
    unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    age: {
      type: Number,
      required: true,
      min: [18, "Driver must be at least 18 years old"],
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    experienceYears: {
      type: Number,
      required: true,
      min: [0, "Experience years cannot be negative"],
      default: 0,
    },

    assignedBuses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Bus",
      },
    ],

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
// driverSchema.pre("save", async function (next) {
//   if (this.driverId) return next();

//   const Driver = this.constructor as typeof model;

//   const count = await Driver.countDocuments();

//   this.driverId = `DRV-${String(count + 1).padStart(4, "0")}`;

//   next();
// });

export const DriverModel = model("Driver", driverSchema);
export default DriverModel;