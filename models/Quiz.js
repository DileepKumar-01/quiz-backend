import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true }
});

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    quizCode: { type: String, unique: true },
    createdBy: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { 
      type: Number, 
      required: true, 
      min: 10, 
      max: 60, 
      default: 30 
    },
    questions: [questionSchema]
  },
  { timestamps: true }
);

function generateQuizCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "QZ";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

quizSchema.pre("save", function (next) {
  if (!this.quizCode) {
    this.quizCode = generateQuizCode();
  }
  next(); // Signals Mongoose to proceed with saving
});

export default mongoose.model("Quiz", quizSchema);