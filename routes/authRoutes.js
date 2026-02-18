import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

// ================= REGISTER API =================
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, gender, password, role, id } = req.body; 
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Checking if the ID/RegNo is already in use
    const existingID = await User.findOne({ regNo: id });
    if (existingID) {
      return res.status(400).json({ message: "Registration Number/ID already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      phone,
      gender,
      password: hashedPassword,
      role,
      regNo: id // This ensures the 'id' from your form becomes 'regNo' in MongoDB
    });

    await newUser.save();
    console.log(`New user registered: ${id}`);
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// ================= LOGIN API =================
router.post("/login", async (req, res) => {
  try {
    const { regNo, password, role } = req.body;
    console.log(`Attempting login for RegNo: ${regNo}, Role: ${role}`);

    const user = await User.findOne({ regNo });

    if (!user) {
      return res.status(404).json({ message: "User not found. Please register first." });
    }

    if (user.role !== role) {
      return res.status(403).json({ message: "Invalid role selected for this account" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        regNo: user.regNo,
        role: user.role,
        photo: user.photo,
        qualification: user.qualification
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ================= UPDATE PROFILE =================
router.put("/update-profile/:id", async (req, res) => {
  try {
    const { name, email, phone, qualification, photo, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password required" });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password incorrect" });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.qualification = qualification || user.qualification;
    user.photo = photo || user.photo; 

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        qualification: user.qualification,
        photo: user.photo,
        regNo: user.regNo,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Server error during profile update" });
  }
});

export default router;