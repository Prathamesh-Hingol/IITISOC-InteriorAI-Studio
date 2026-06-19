import app from "./app";
import { prisma } from "./config/db";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify Database Connection
    await prisma.$connect();
    console.log("Database connected successfully.");

    app.listen(PORT, () => {
      console.log(`Server is running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server error", error);
  }
}

startServer();
