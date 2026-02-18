import express from "express";
import Result from "../models/Result.js";

const router = express.Router();

// ================= SAVE STUDENT RESULT =================
router.post("/submit-result", async (req, res) => {
  try {
    const { quizId, studentId, studentName, score, totalMarks } = req.body;

    const newResult = new Result({
      quizId,
      studentId,
      studentName,
      score,
      totalMarks
    });

    await newResult.save();

    res.status(201).json({
      message: "Result saved successfully",
      result: newResult
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= GET RESULTS BY TEACHER =================
router.get("/results/:teacherId", async (req, res) => {
  try {
    const results = await Result.find()
      .populate("quizId")
      .sort({ createdAt: -1 });

    res.status(200).json(results);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
