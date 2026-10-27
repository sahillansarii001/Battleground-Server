import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Team from '../models/Team.js';
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
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    // Check Admin collection first to ensure proper Admin model binding
    let user = await Admin.findOne({ email: cleanEmail });
    let isAdmin = false;

    if (user) {
      isAdmin = true;
    } else {
      user = await User.findOne({ email: cleanEmail });
      if (user && user.role === 'ADMIN') {
        isAdmin = true;
      }
    }

    if (user && (await user.matchPassword(password))) {
      if (isAdmin && user.lastLogin !== undefined) {
        user.lastLogin = Date.now();
        await user.save();
      }
      res.json({
        success: true,
        data: {
          _id: user._id,
          email: user.email,
          name: user.name || (isAdmin ? 'Admin' : user.email.split('@')[0]),
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

    // Send OTP email in background to prevent hanging the API response
    sendOtpEmail(email, otp).catch(err => {
      console.error('[forgotPassword] Background OTP email error:', err.message);
    });

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

    let team = await Team.findOne({ email });
    if (team) {
      return res.status(400).json({ success: false, message: 'Team already registered with this email' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    await Otp.deleteMany({ email }); // clear old OTPs
    await Otp.create({ email, otp });

    // Send OTP email in background so frontend immediately switches to OTP input
    sendOtpEmail(email, otp, 'Registration OTP - BGMI Tournament').catch(err => {
      console.error('[sendRegistrationOtp] Background OTP email error:', err.message);
    });

    res.json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    console.error('Registration OTP failed:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to send OTP email' });
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
    const { currentPassword, newPassword, password } = req.body;
    const targetPassword = newPassword || password;

    let user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      user = await Admin.findById(req.user._id || req.user.id);
    }
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // If not first-time forced change, verify current password if provided
    if (currentPassword) {
      if (!(await user.matchPassword(currentPassword))) {
        return res.status(400).json({ success: false, message: 'CURRENT ACCESS CODE IS INCORRECT.' });
      }
    } else if (!user.mustChangePassword) {
      return res.status(400).json({ success: false, message: 'CURRENT ACCESS CODE IS REQUIRED.' });
    }

    if (!targetPassword) {
      return res.status(400).json({ success: false, message: 'NEW PASSWORD IS REQUIRED.' });
    }

    user.password = targetPassword;
    user.mustChangePassword = false;
    await user.save();
    res.json({ success: true, message: 'ACCESS CODE UPDATED SUCCESSFULLY.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
