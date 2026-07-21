import dns from "node:dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import UserModel from "../modules/users/UserModel.js";

dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL!;
const MONGODB_NAME = process.env.MONGODB_NAME!;

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URL, { dbName: MONGODB_NAME });
    console.log("Connected to MongoDB...");

    const existingAdmin = await UserModel.findOne({ email: "admin@smartbus.com" });
    if (existingAdmin) {
      console.log("Admin user already exists:");
      console.log("  Email:    admin@smartbus.com");
      console.log("  Password: admin123");
      console.log("  Role:    ", existingAdmin.role);
      if (existingAdmin.role !== "admin") {
        await UserModel.updateOne({ _id: existingAdmin._id }, { $set: { role: "admin" } });
        console.log("  → Updated role to admin");
      }
      await mongoose.disconnect();
      return;
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);
    await UserModel.create({
      name: "Admin",
      email: "admin@smartbus.com",
      password: hashedPassword,
      role: "admin",
    });

    console.log("Admin user created successfully!");
    console.log("  Email:    admin@smartbus.com");
    console.log("  Password: admin123");
    console.log("  Role:     admin");

    await mongoose.disconnect();
  } catch (error) {
    console.error("Failed to seed admin user:", error);
    process.exit(1);
  }
}

seedAdmin();
