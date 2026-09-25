import User from '../models/User.js';
import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

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
