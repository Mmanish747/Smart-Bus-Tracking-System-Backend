import dns from "node:dns"; // Or use require('dns') for CommonJS
dns.setServers(["1.1.1.1", "8.8.8.8"]);

import mongoose from "mongoose";
import { mongodbConfig } from "./config.js";


(async () => {
  try {
    await mongoose.connect(mongodbConfig.url as string, {
      dbName: mongodbConfig.name,
      autoCreate: true,
      autoIndex: true,
      family: 4,
    });
    console.log("***** Mongodb server connected succesfully ****");
  } catch (exception) {
    console.error({ exception });
    console.log(" *****Error connectiong mongodb ***** ");
    process.exit(1);
  }
})();