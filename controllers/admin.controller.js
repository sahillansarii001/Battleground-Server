import Team from '../models/Team.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import AuditLog from '../models/AuditLog.js';
import Match from '../models/Match.js';
import { sendTeamApprovalEmail, sendTeamRejectionEmail, sendPasswordResetEmail } from '../services/email.service.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (admin && (await admin.matchPassword(password))) {
      admin.lastLogin = Date.now();
      await admin.save();
      
      res.json({
        success: true,
        data: {
          _id: admin._id,
          email: admin.email,
          role: admin.role,
          mustChangePassword: admin.mustChangePassword,
          token: generateToken(admin._id, admin.role),
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match' });
    }

    const admin = await Admin.findById(req.user._id);

    if (!(await admin.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Incorrect current password' });
    }

    admin.password = newPassword;
    admin.mustChangePassword = false;
    await admin.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      // Return success anyway to not leak existence of email
      return res.json({ success: true, message: 'If the email exists, a reset link will be sent.' });
    }

    const resetToken = admin.getResetPasswordToken();
    await admin.save();

    await sendPasswordResetEmail(admin.email, resetToken);

    res.json({ success: true, message: 'If the email exists, a reset link will be sent.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const admin = await Admin.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    admin.password = newPassword;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;
    await admin.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const registeredTeams = await Team.countDocuments();
    const pendingApprovals = await Team.countDocuments({ status: 'PENDING' });
    const upcomingMatches = await Match.countDocuments({ status: 'UPCOMING' });
    const liveMatches = await Match.countDocuments({ status: 'LIVE' });
    const completedMatches = await Match.countDocuments({ status: 'COMPLETED' });

    res.json({
      success: true,
      data: {
        registeredTeams,
        pendingApprovals,
        upcomingMatches,
        liveMatches,
        completedMatches
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

import Settings from '../models/Settings.js';

// Inside admin.controller.js, just before approveTeam:
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();
    if (req.body.communityLink !== undefined) settings.communityLink = req.body.communityLink;
    await settings.save();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (team.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Team is not pending approval' });
    }

    const temporaryPassword = crypto.randomBytes(6).toString('hex');

    // Create user
    const newUser = await User.create({
      email: team.email,
      password: temporaryPassword,
      role: 'TEAM_USER',
      mustChangePassword: true,
    });

    team.status = 'APPROVED';
    team.userId = newUser._id;
    await team.save();

    await AuditLog.create({
      action: 'TEAM_APPROVED',
      adminId: req.user._id,
      targetType: 'Team',
      targetId: team._id,
    });

    await sendTeamApprovalEmail(team.email, temporaryPassword, team.teamName);

    res.json({ success: true, message: 'Team approved successfully', data: team });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    team.status = 'REJECTED';
    await team.save();

    await AuditLog.create({
      action: 'TEAM_REJECTED',
      adminId: req.user._id,
      targetType: 'Team',
      targetId: team._id,
    });

    await sendTeamRejectionEmail(team.email, reason, team.teamName);

    res.json({ success: true, message: 'Team rejected successfully', data: team });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkCreateMatches = async (req, res) => {
  try {
    const { matches } = req.body;
    
    if (!matches || !Array.isArray(matches) || matches.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid matches data' });
    }

    const matchesToInsert = matches.map(m => ({
      ...m,
      createdBy: req.user._id,
    }));

    const createdMatches = await Match.insertMany(matchesToInsert);

    await AuditLog.create({
      action: 'BULK_MATCH_CREATED',
      adminId: req.user._id,
      targetType: 'Match',
      targetId: createdMatches[0]._id, // using first match as target for log
      newData: { total: createdMatches.length },
    });

    res.status(201).json({ success: true, message: 'Matches created successfully', data: createdMatches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
