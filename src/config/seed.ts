import RouteModel from "../modules/routes/RouteModel.js";
import BusModel from "../modules/buses/BusModel.js";
import ScheduleModel from "../modules/schedules/ScheduleModel.js";
import TrackingModel from "../modules/tracking/TrackingModel.js";
import NotificationModel from "../modules/notifications/NotificationModel.js";
import UserModel from "../modules/users/UserModel.js";
import bcrypt from "bcryptjs";

export const seedDatabase = async (): Promise<void> => {
  try {
    const routeCount = await RouteModel.countDocuments({});
    if (routeCount > 0) {
      console.log("Database already seeded. Skipping seeder.");
      return;
    }

    console.log("Seeding database with default routes, buses, and settings...");

    // 1. Seed Admin User
    const hashedAdminPassword = await bcrypt.hash("admin123", 10);
    await UserModel.create({
      name: "Admin",
      email: "admin@smartbus.com",
      password: hashedAdminPassword,
      role: "admin",
    });

    // 1b. Seed Driver User
    const hashedDriverPassword = await bcrypt.hash("driver123", 10);
    const driver = await UserModel.create({
      name: "Ram Bahadur",
      email: "ram@busdriver.com",
      password: hashedDriverPassword,
      role: "driver",
    });

    // 2. Seed Routes with Kathmandu coordinates
    const route12A = await RouteModel.create({
      routeNo: "12A",
      from: "City Center",
      to: "Airport",
      via: "Green Street",
      frequency: "10 min",
      status: "On Time",
      color: "bg-green-600 text-white",
      active: true,
      stops: [
        { name: "City Center", timeOffset: 0, type: "start" },
        { name: "Green Street", timeOffset: 5, type: "stop" },
        { name: "River View", timeOffset: 12, type: "stop" },
        { name: "Airport", timeOffset: 25, type: "end" },
      ],
      pathCoordinates: [
        [27.7172, 85.324],
        [27.7185, 85.326],
        [27.7205, 85.329],
        [27.722, 85.331],
        [27.724, 85.334],
        [27.7255, 85.337],
        [27.727, 85.341],
      ],
    });

    const route7B = await RouteModel.create({
      routeNo: "7B",
      from: "Central Park",
      to: "Tech Hub",
      via: "River View",
      frequency: "12 min",
      status: "On Time",
      color: "bg-blue-100 text-blue-600",
      active: true,
      stops: [
        { name: "Central Park", timeOffset: 0, type: "start" },
        { name: "River View", timeOffset: 8, type: "stop" },
        { name: "Tech Hub", timeOffset: 20, type: "end" },
      ],
      pathCoordinates: [
        [27.710, 85.315],
        [27.715, 85.320],
        [27.720, 85.328],
        [27.724, 85.334],
        [27.728, 85.342],
        [27.730, 85.350],
      ],
    });

    const route9C = await RouteModel.create({
      routeNo: "9C",
      from: "Railway Station",
      to: "City Center",
      via: "Lake Park",
      frequency: "15 min",
      status: "Delays",
      color: "bg-purple-100 text-purple-600",
      active: true,
      stops: [
        { name: "Railway Station", timeOffset: 0, type: "start" },
        { name: "Lake Park", timeOffset: 7, type: "stop" },
        { name: "City Center", timeOffset: 15, type: "end" },
      ],
      pathCoordinates: [
        [27.700, 85.300],
        [27.705, 85.305],
        [27.710, 85.310],
        [27.715, 85.318],
        [27.7172, 85.324],
      ],
    });

    const route4D = await RouteModel.create({
      routeNo: "4D",
      from: "University",
      to: "Market Street",
      via: "Airport Road",
      frequency: "15 min",
      status: "On Time",
      color: "bg-orange-100 text-orange-600",
      active: true,
      stops: [
        { name: "University", timeOffset: 0, type: "start" },
        { name: "Airport Road", timeOffset: 10, type: "stop" },
        { name: "Market Street", timeOffset: 20, type: "end" },
      ],
      pathCoordinates: [
        [27.680, 85.320],
        [27.690, 85.325],
        [27.700, 85.330],
        [27.710, 85.325],
        [27.720, 85.320],
      ],
    });

    // 3. Seed Buses
    const bus1 = await BusModel.create({
      busNumber: "BA 01 PA 1234",
      modelName: "Tata Starbus",
      capacity: 40,
      status: "Active",
      driver: driver._id,
    });

    const bus2 = await BusModel.create({
      busNumber: "BA 01 PA 2345",
      modelName: "Swaraj Mazda",
      capacity: 32,
      status: "Active",
      driver: driver._id,
    });

    const bus3 = await BusModel.create({
      busNumber: "BA 01 PA 3456",
      modelName: "Eicher Starline",
      capacity: 36,
      status: "Active",
      driver: driver._id,
    });

    const bus4 = await BusModel.create({
      busNumber: "BA 01 PA 4567",
      modelName: "Tata Winger",
      capacity: 14,
      status: "Active",
      driver: driver._id,
    });

    // 4. Seed Schedules
    await ScheduleModel.create([
      {
        route: route12A._id,
        bus: bus1._id,
        firstBus: "05:30 AM",
        lastBus: "10:30 PM",
        frequency: "10 min",
        status: "On Time",
        active: true,
      },
      {
        route: route7B._id,
        bus: bus2._id,
        firstBus: "05:45 AM",
        lastBus: "10:15 PM",
        frequency: "12 min",
        status: "On Time",
        active: false,
      },
      {
        route: route9C._id,
        bus: bus3._id,
        firstBus: "06:00 AM",
        lastBus: "10:45 PM",
        frequency: "15 min",
        status: "Delays",
        active: false,
      },
      {
        route: route4D._id,
        bus: bus4._id,
        firstBus: "06:10 AM",
        lastBus: "10:10 PM",
        frequency: "15 min",
        status: "On Time",
        active: false,
      },
    ]);

    // 5. Seed Tracking Telemetry
    await TrackingModel.create([
      {
        bus: bus1._id,
        route: route12A._id,
        latitude: route12A.pathCoordinates![0]![0] as number,
        longitude: route12A.pathCoordinates![0]![1] as number,
        speed: 32,
        nextStop: "Green Street",
        eta: "2 min away",
        status: "Live",
        currentIndex: 0,
      },
      {
        bus: bus2._id,
        route: route7B._id,
        latitude: route7B.pathCoordinates![0]![0] as number,
        longitude: route7B.pathCoordinates![0]![1] as number,
        speed: 28,
        nextStop: "River View",
        eta: "5 min away",
        status: "Live",
        currentIndex: 0,
      },
      {
        bus: bus3._id,
        route: route9C._id,
        latitude: route9C.pathCoordinates![0]![0] as number,
        longitude: route9C.pathCoordinates![0]![1] as number,
        speed: 0,
        nextStop: "Lake Park",
        eta: "Delayed by 15 min due to heavy traffic",
        status: "Live",
        currentIndex: 0,
      },
      {
        bus: bus4._id,
        route: route4D._id,
        latitude: route4D.pathCoordinates![0]![0] as number,
        longitude: route4D.pathCoordinates![0]![1] as number,
        speed: 35,
        nextStop: "Airport Road",
        eta: "4 min away",
        status: "Live",
        currentIndex: 0,
      },
    ] as any);

    // 6. Seed Notifications
    await NotificationModel.create([
      {
        title: "Delay on Route 9C",
        description: "Bus on Route 9C (Railway Station → City Center) is delayed by 15 minutes due to heavy traffic.",
        badge: "Alert",
        icon: "TriangleAlert",
        iconBg: "bg-red-100",
        iconColor: "text-red-500",
        badgeBg: "bg-red-100",
        badgeColor: "text-red-600",
      },
      {
        title: "Bus Arriving Soon",
        description: "Bus 12A will arrive at Green Street stop in 2 mins.",
        badge: "Service Update",
        icon: "BusFront",
        iconBg: "bg-blue-100",
        iconColor: "text-blue-500",
        badgeBg: "bg-green-100",
        badgeColor: "text-green-600",
      },
      {
        title: "Road Closure on Airport Road",
        description: "Airport Road is closed for maintenance from Jun 2 - Jun 4. Buses may take alternative routes.",
        badge: "Alert",
        icon: "CircleX",
        iconBg: "bg-red-100",
        iconColor: "text-red-500",
        badgeBg: "bg-red-100",
        badgeColor: "text-red-600",
      },
      {
        title: "New Schedule Released",
        description: "New weekend schedule for Route 7B (Central Park to Tech Hub) is now available.",
        badge: "Service Update",
        icon: "Megaphone",
        iconBg: "bg-purple-100",
        iconColor: "text-purple-500",
        badgeBg: "bg-blue-100",
        badgeColor: "text-blue-600",
      },
      {
        title: "Student Discount Offer",
        description: "Get 20% off on monthly passes for students. Offer valid till Jun 30, 2025.",
        badge: "Promotion",
        icon: "Gift",
        iconBg: "bg-green-100",
        iconColor: "text-green-500",
        badgeBg: "bg-purple-100",
        badgeColor: "text-purple-500",
      },
      {
        title: "System Maintenance",
        description: "Our system will be under maintenance on Jun 5 from 01:00 to 03:00 AM.",
        badge: "General",
        icon: "Construction",
        iconBg: "bg-yellow-100",
        iconColor: "text-yellow-500",
        badgeBg: "bg-gray-100",
        badgeColor: "text-gray-500",
      },
    ]);

    console.log("Database seeded successfully!");
  } catch (error: any) {
    console.error("Database seeding failed:", error.message);
  }
};
