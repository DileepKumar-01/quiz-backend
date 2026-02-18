import express from "express";
import Quiz from "../models/Quiz.js";
import Result from "../models/Result.js";

const router = express.Router();

// ================= CREATE QUIZ =================
router.post("/create-quiz", async (req, res) => {
  try {
    const { title, description, createdBy, startTime, endTime, questions, duration } = req.body;

    if (!title || !createdBy || !startTime || !endTime || !questions || questions.length === 0) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newQuiz = new Quiz({
      title,
      description,
      createdBy,
      startTime,
      endTime,
      duration: duration || 30, // Fallback to 30
      questions
    });

    await newQuiz.save();

    res.status(201).json({
      message: "Quiz created successfully",
      quiz: newQuiz,
      quizCode: newQuiz.quizCode
    });

  } catch (error) {
    console.error("CREATE QUIZ ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= GET ALL QUIZZES =================
router.get("/quizzes", async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    res.status(200).json(quizzes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= GET QUIZ BY CODE (TIMEZONE FIXED) =================
router.get("/quiz-by-code/:code", async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ quizCode: req.params.code });
    
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // FIXED: Convert both to numeric timestamps to ignore server timezone shifts
    const currentTime = new Date().getTime();
    const quizStart = new Date(quiz.startTime).getTime();
    const quizEnd = new Date(quiz.endTime).getTime();

    if (currentTime < quizStart) {
      return res.status(403).json({ 
        message: `This quiz is scheduled to start at ${new Date(quiz.startTime).toLocaleString()}` 
      });
    }
    
    if (currentTime > quizEnd) {
      return res.status(403).json({ message: "This quiz session has already expired." });
    }

    res.status(200).json(quiz);
  } catch (error) {
    console.error("GET QUIZ ERROR:", error);
    res.status(500).json({ message: "Server error loading quiz" });
  }
});

// ================= SUBMIT QUIZ =================
router.post("/submit-quiz", async (req, res) => {
  try {
    const { quizId, studentId, studentName, answers } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    let score = 0;
    quiz.questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        score++;
      }
    });

    const result = new Result({
      quizId,
      studentId,
      studentName,
      score,
      totalMarks: quiz.questions.length
    });

    await result.save();

    res.status(200).json({
      message: "Quiz submitted successfully",
      score,
      totalMarks: quiz.questions.length
    });

  } catch (error) {
    console.error("SUBMIT ERROR:", error);
    res.status(500).json({ message: "Server error during submission" });
  }
});

// ================= TEACHER ANALYTICS =================
router.get("/teacher-stats/:teacherId", async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    const quizzes = await Quiz.find({ createdBy: teacherId });
    const quizIds = quizzes.map(q => q._id);
    
    const titleMap = {};
    quizzes.forEach(q => {
      titleMap[q._id] = q.title;
    });

    const results = await Result.find({ quizId: { $in: quizIds } }).lean();

    const submissionsWithTitles = results.map(r => ({
      ...r,
      quizTitle: titleMap[r.quizId] || "Deleted Quiz"
    }));

    res.status(200).json({
      submissions: submissionsWithTitles,
      quizCount: quizzes.length
    });

  } catch (error) {
    console.error("ANALYTICS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= GET RESULTS BY QUIZ =================
router.get("/quiz-results/:quizId", async (req, res) => {
  try {
    const results = await Result.find({ quizId: req.params.quizId });
    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;