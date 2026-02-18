import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  phone: {
    type: String,
  },

  gender: {
    type: String,
  },
  
qualification: {
  type: String,
},

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["student", "teacher"],
    default: "student",
  },

  regNo: {
    type: String,
  }

}, { timestamps: true });

export default mongoose.model("User", userSchema);
