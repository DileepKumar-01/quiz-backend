import dns from 'node:dns';
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
  // ✅ FIXED: Added your local and potentially live frontend origins
  origin: [
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    // Replace the line below with your ACTUAL frontend URL from Render
    "https://your-actual-frontend-name.onrender.com" 
  ],
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
  res.status(200).send("Dileep Kumar's QuizPro Backend Server Running - v2026.1");
});

// ================= DATABASE CONNECTION =================
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env file");
    }

    // Connects to MongoDB using the URI provided in Render/Local environment
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected Successfully");

  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
  }
};

connectDB();

// ================= SERVER =================
const PORT = process.env.PORT || 10000;

// ✅ FIXED: Removed "0.0.0.0" to let Render handle the port binding automatically
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.log(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});