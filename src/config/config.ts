import {config} from 'dotenv';
config();
if (!process.env.MONGODB_URL) {
  throw new Error("MONGODB_URL is required");
}

if (!process.env.MONGODB_NAME) {
  throw new Error("MONGODB_NAME is required");
}
 export const mongodbConfig ={
    url: process.env.MONGODB_URL,
     name: process.env.MONGODB_NAME,
 }