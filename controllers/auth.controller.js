import User from '../models/User.js';
import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import Otp from '../models/Otp.js';
import { sendOtpEmail } from '../services/email.service.js';

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    let isAdmin = false;

    if (!user) {
      user = await Admin.findOne({ email: email.toLowerCase() });
      if (user) {
        isAdmin = true;
      }
    }

    if (user && (await user.matchPassword(password))) {
      if (isAdmin) {
        user.lastLogin = Date.now();
        await user.save();
      }
      res.json({
        success: true,
        data: {
          _id: user._id,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          token: generateToken(user._id, user.role),
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      user = await Admin.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    await Otp.deleteMany({ email }); // clear old OTPs
    await Otp.create({ email, otp });

    await sendOtpEmail(email, otp);

    res.json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendRegistrationOtp = async (req, res) => {
  try {
    const { email } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    await Otp.deleteMany({ email }); // clear old OTPs
    await Otp.create({ email, otp });

    // Assuming we can reuse sendOtpEmail or create a new one. Using the same for now, 
    // it says "Password Reset OTP" in the subject inside sendOtpEmail, we can update it to be generic if needed.
    await sendOtpEmail(email, otp, 'Registration OTP - BGMI Tournament');

    res.json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpRecord = await Otp.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const otpRecord = await Otp.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await Admin.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = password;
    user.mustChangePassword = false;
    await user.save();

    await Otp.deleteMany({ email }); // Clear used OTP

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    let user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      user = await Admin.findById(req.user._id || req.user.id);
    }
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Verify current password
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'CURRENT ACCESS CODE IS INCORRECT.' });
    }
    
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();
    res.json({ success: true, message: 'ACCESS CODE UPDATED SUCCESSFULLY.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
