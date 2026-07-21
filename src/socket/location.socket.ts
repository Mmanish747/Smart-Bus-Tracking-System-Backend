import { Server, Socket } from "socket.io";
import { BusModel } from "../modules/buses/BusModel.js";


export const registerLocationSocket = (
  io: Server,
  socket: Socket
) => {
  socket.on("driver:location:update", async (data) => {
    const { busId, lat, lng } = data;

    await BusModel.findByIdAndUpdate(busId, {
      location: {
        lat,
        lng,
        updatedAt: new Date(),
      },
    });

    io.emit("bus:location:updated", data);
  });
};