import mongoose from "mongoose";

const clientOptions: mongoose.ConnectOptions = {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
  dbName: "nextDemo",
};
const connection: { isConnected?: number } = {};
export async function dbConnect() {
  const mongoURI = process.env.MONGO_URI!;
  if (!mongoURI) {
    throw new Error(
      "Please define the MONGO_URI environment variable inside .env.local"
    );
  }
  try {
    if (connection.isConnected) {
      console.log("Database already connected");
      return;
    }
    const db = await mongoose.connect(mongoURI!, clientOptions);
    connection.isConnected = db.connections[0].readyState;
    console.log("Database connected");
  } catch (error) {
    console.error("Database connection failed:", error);
    // Graceful exit in case of a connection error
    process.exit(1);
  }
}
