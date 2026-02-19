import dns from 'node:dns';
// This line fixes the ECONNREFUSED srv error by forcing IPv4 lookups first
dns.setDefaultResultOrder('ipv4first');

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";

dotenv.config();

const app = express();

// ================= MIDDLEWARE =================
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, 
  optionsSuccessStatus: 200 
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ================= ROUTES =================
app.use("/api/auth", authRoutes); 
app.use("/api/quiz", quizRoutes);
app.use("/api/result", resultRoutes);

app.get("/", (req, res) => {
  res.status(200).send("QuizPro Backend Server Running - v2026.1");
});

// ================= DATABASE CONNECTION =================
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env file");
    }

    // Adding recommended options for better connection stability
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    
    console.log(" MongoDB Connected Successfully");
  } catch (err) {
    console.error(" MongoDB Connection Error:");
    console.error(err.message);
    // Wait 5 seconds before exiting to see the logs
    setTimeout(() => process.exit(1), 5000);
  }
};

connectDB();

// ================= ERROR HANDLING =================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: "Something went wrong on the server!",
    error: process.env.NODE_ENV === 'development' ? err.message : {} 
  });
});

// ================= SERVER START =================
const PORT = process.env.PORT || 10000; 

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(` Server running on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.log(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});