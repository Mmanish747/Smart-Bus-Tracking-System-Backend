import { Schema, model } from "mongoose";
import { UserRole } from "../../types/UserRole.js";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true, minlength: [6, "Password must be at least 6 characters"] },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.PASSENGER,
      required: true,
    },
    company: {
    type: Schema.Types.ObjectId,
    ref: "Company",
    default: null
    },

    phone: String,

    isVerified: {
        type: Boolean,
        default: false
    },

    status: {
        type: String,
        enum: ["active","inactive","blocked"],
        default:"active"
    },
  },
  { timestamps: true }
);

export const UserModel = model("User", userSchema);
export default UserModel;
