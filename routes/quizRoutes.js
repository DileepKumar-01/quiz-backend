import express from "express";
import Quiz from "../models/Quiz.js";
import Result from "../models/Result.js";

const router = express.Router();

// ================= CREATE QUIZ (FIXED TIMEZONE) =================
router.post("/create-quiz", async (req, res) => {
  try {
    const { title, description, createdBy, startTime, endTime, questions, duration } = req.body;

    // Validate required fields
    if (!title || !createdBy || !startTime || !endTime || !questions || questions.length === 0) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ FIX: Convert to proper Date objects (handles timezone correctly)
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // Validate dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format. Please provide valid dates." });
    }

    // Validate start time is before end time
    if (startDate >= endDate) {
      return res.status(400).json({ message: "Start time must be before end time" });
    }

    // Validate duration is within limits
    const quizDuration = duration || 30;
    if (quizDuration < 10 || quizDuration > 60) {
      return res.status(400).json({ message: "Duration must be between 10 and 60 minutes" });
    }

    const newQuiz = new Quiz({
      title,
      description,
      createdBy,
      startTime: startDate,
      endTime: endDate,
      duration: quizDuration,
      questions
    });

    await newQuiz.save();

    console.log(`✅ Quiz created: ${newQuiz.title} (Code: ${newQuiz.quizCode})`);

    res.status(201).json({
      message: "Quiz created successfully",
      quiz: newQuiz,
      quizCode: newQuiz.quizCode
    });

  } catch (error) {
    console.error("CREATE QUIZ ERROR:", error);
    res.status(500).json({ message: "Server error while creating quiz" });
  }
});

// ================= GET ALL QUIZZES =================
router.get("/quizzes", async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    res.status(200).json(quizzes);
  } catch (error) {
    console.error("FETCH QUIZZES ERROR:", error);
    res.status(500).json({ message: "Server error fetching quizzes" });
  }
});

// ================= GET QUIZ BY CODE (IMPROVED TIME HANDLING) =================
router.get("/quiz-by-code/:code", async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ quizCode: req.params.code });
    
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found. Please check the code and try again." });
    }

    // Get current time
    const currentTime = new Date();
    const quizStart = new Date(quiz.startTime);
    const quizEnd = new Date(quiz.endTime);

    // Debug logging (helpful for troubleshooting)
    console.log(`📅 Quiz Check - Code: ${quiz.quizCode}`);
    console.log(`   Current: ${currentTime.toISOString()}`);
    console.log(`   Start:   ${quizStart.toISOString()}`);
    console.log(`   End:     ${quizEnd.toISOString()}`);

    // Check if quiz hasn't started yet
    if (currentTime < quizStart) {
      // Format the start time in a student-friendly way
      const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      };
      const readableStart = quizStart.toLocaleString(undefined, options);
      
      return res.status(403).json({ 
        message: `⏰ This quiz is scheduled to start on ${readableStart}`,
        startTime: quizStart.toISOString(),
        currentTime: currentTime.toISOString()
      });
    }

    // Check if quiz has already ended
    if (currentTime > quizEnd) {
      return res.status(403).json({ 
        message: "❌ This quiz session has expired. You cannot take it anymore.",
        endTime: quizEnd.toISOString()
      });
    }

    // Quiz is active - prepare response WITHOUT correct answers for security
    const quizForStudent = {
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      quizCode: quiz.quizCode,
      duration: quiz.duration,
      startTime: quiz.startTime,
      endTime: quiz.endTime,
      questions: quiz.questions.map(q => ({
        _id: q._id,
        question: q.question,
        options: q.options
        // ✅ IMPORTANT: correctAnswer is NOT sent to students
      }))
    };

    console.log(`✅ Quiz active: ${quiz.title} - Sending to student`);
    res.status(200).json(quizForStudent);

  } catch (error) {
    console.error("QUIZ FETCH ERROR:", error);
    res.status(500).json({ message: "Server error loading quiz. Please try again." });
  }
});

// ================= SUBMIT QUIZ (WITH VALIDATION) =================
router.post("/submit-quiz", async (req, res) => {
  try {
    const { quizId, studentId, studentName, answers } = req.body;

    // Validate required fields
    if (!quizId || !studentId || !studentName || !answers) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Fetch the quiz with correct answers for grading
    const quiz = await Quiz.findById(quizId);
    
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Check if quiz is still active (not expired)
    const currentTime = new Date();
    const quizEnd = new Date(quiz.endTime);
    
    if (currentTime > quizEnd) {
      return res.status(403).json({ message: "Quiz has expired. Submission not allowed." });
    }

    // Check if student has already taken this quiz
    const existingResult = await Result.findOne({ quizId, studentId });
    if (existingResult) {
      return res.status(400).json({ message: "You have already taken this quiz!" });
    }

    // Calculate score
    let score = 0;
    const totalQuestions = quiz.questions.length;
    
    quiz.questions.forEach((question, index) => {
      if (answers[index] && answers[index] === question.correctAnswer) {
        score++;
      }
    });

    // Calculate percentage
    const percentage = (score / totalQuestions) * 100;
    const passed = percentage >= 50;

    // Save result
    const result = new Result({
      quizId,
      studentId,
      studentName,
      score,
      totalMarks: totalQuestions,
      percentage: percentage,
      passed: passed
    });

    await result.save();

    console.log(`📊 Quiz submitted - Student: ${studentName}, Score: ${score}/${totalQuestions}`);

    res.status(200).json({
      message: "Quiz submitted successfully!",
      score,
      totalMarks: totalQuestions,
      percentage: percentage,
      passed: passed
    });

  } catch (error) {
    console.error("SUBMIT ERROR:", error);
    res.status(500).json({ message: "Server error during submission. Please try again." });
  }
});

// ================= TEACHER ANALYTICS (FIXED) =================
router.get("/teacher-stats/:teacherId", async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    
    // Get all quizzes created by this teacher
    const quizzes = await Quiz.find({ createdBy: teacherId }).sort({ createdAt: -1 });
    const quizIds = quizzes.map(q => q._id);
    
    // Create title mapping
    const titleMap = {};
    quizzes.forEach(q => {
      titleMap[q._id.toString()] = q.title;
    });

    // Get all results for these quizzes
    const results = await Result.find({ quizId: { $in: quizIds } }).sort({ createdAt: -1 });

    // Enhance results with quiz titles
    const submissionsWithTitles = results.map(r => ({
      ...r.toObject(),
      quizTitle: titleMap[r.quizId.toString()] || "Deleted Quiz"
    }));

    res.status(200).json({
      submissions: submissionsWithTitles,
      quizCount: quizzes.length,
      quizzes: quizzes.map(q => ({
        id: q._id,
        title: q.title,
        quizCode: q.quizCode,
        startTime: q.startTime,
        endTime: q.endTime,
        questionCount: q.questions.length
      }))
    });

  } catch (error) {
    console.error("ANALYTICS ERROR:", error);
    res.status(500).json({ message: "Server error fetching analytics" });
  }
});

// ================= GET RESULTS BY QUIZ =================
router.get("/quiz-results/:quizId", async (req, res) => {
  try {
    const { quizId } = req.params;
    
    // Verify quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Get all results for this quiz
    const results = await Result.find({ quizId }).sort({ score: -1 });
    
    // Calculate statistics
    const totalSubmissions = results.length;
    const averageScore = results.length > 0 
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length 
      : 0;
    const highestScore = results.length > 0 
      ? Math.max(...results.map(r => r.score)) 
      : 0;

    res.status(200).json({
      quizTitle: quiz.title,
      totalSubmissions,
      averageScore,
      highestScore,
      results: results
    });

  } catch (error) {
    console.error("QUERY RESULTS ERROR:", error);
    res.status(500).json({ message: "Server error fetching results" });
  }
});

// ================= ADDITIONAL: GET ACTIVE QUIZZES FOR STUDENT =================
router.get("/active-quizzes", async (req, res) => {
  try {
    const currentTime = new Date();
    
    const activeQuizzes = await Quiz.find({
      startTime: { $lte: currentTime },
      endTime: { $gte: currentTime }
    }).sort({ startTime: 1 });

    const formattedQuizzes = activeQuizzes.map(quiz => ({
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      quizCode: quiz.quizCode,
      duration: quiz.duration,
      endTime: quiz.endTime
    }));

    res.status(200).json(formattedQuizzes);
  } catch (error) {
    console.error("ACTIVE QUIZZES ERROR:", error);
    res.status(500).json({ message: "Server error fetching active quizzes" });
  }
});

// ================= ADDITIONAL: GET STUDENT'S QUIZ ATTEMPTS =================
router.get("/student-attempts/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const attempts = await Result.find({ studentId })
      .populate('quizId', 'title quizCode')
      .sort({ createdAt: -1 });

    res.status(200).json(attempts);
  } catch (error) {
    console.error("STUDENT ATTEMPTS ERROR:", error);
    res.status(500).json({ message: "Server error fetching attempts" });
  }
});

export default router;