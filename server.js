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
// Enhanced CORS: Allows your local machine and future Vercel site to talk to Render
app.use(cors({
  origin: "*", // Allows all origins for testing; you can change this to your Vercel URL later
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Required for sending JWT tokens in headers
  optionsSuccessStatus: 200 
}));

// INCREASED LIMIT: Essential for Base64 Profile Photos & Large Quiz Payloads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ================= ROUTES =================
// These match your frontend calling: /api/auth/register
app.use("/api/auth", authRoutes); 
app.use("/api/quiz", quizRoutes);
app.use("/api/result", resultRoutes);

// Health Check Route - Important for Render to verify service health
app.get("/", (req, res) => {
  res.status(200).send("QuizPro Backend Server Running - v2026.1");
});

// ================= DATABASE CONNECTION =================
const connectDB = async () => {
  try {
    // Ensure process.env.MONGO_URI is set in Render Environment Variables
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected Successfully");
  } catch (err) {
    console.error("MongoDB Connection Error:");
    console.error(err.message);
    // Exit after a delay to allow logging
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
// Use Render's PORT variable or default to 10000
const PORT = process.env.PORT || 10000; 

// Bind to 0.0.0.0 for public internet access
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections gracefully
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
  // Safely close the server before exiting
  server.close(() => process.exit(1));
});