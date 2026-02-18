import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true
  },
  studentId: {
    type: String, // regNo
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true
  }
}, { timestamps: true });

export default mongoose.model("Result", resultSchema);
