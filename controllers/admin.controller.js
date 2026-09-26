import Team from '../models/Team.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import AuditLog from '../models/AuditLog.js';
import Match from '../models/Match.js';
import Settings from '../models/Settings.js';
import Player from '../models/Player.js';
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
          name: admin.name,
          profilePhoto: admin.profilePhoto,
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

import { uploadImage, deleteImage } from '../services/cloudinary.service.js';

export const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user._id).select('-password');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.json({ success: true, data: admin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAdminProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const admin = await Admin.findById(req.user._id);

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (name) admin.name = name;
    if (email) admin.email = email.toLowerCase();

    if (req.file) {
      const newPhotoData = await uploadImage(req.file.buffer, 'bgmi-admin');
      admin.profilePhoto = newPhotoData.url;
    }

    await admin.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        name: admin.name,
        email: admin.email,
        profilePhoto: admin.profilePhoto
      }
    });
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


export const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find().sort({ createdAt: -1 }).lean();
    const players = await Player.find();
    
    const teamsWithPlayers = teams.map(team => ({
      ...team,
      players: players.filter(p => p.teamId.toString() === team._id.toString())
    }));
    
    res.json({ success: true, data: teamsWithPlayers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
    if (req.body.prizePool !== undefined) settings.prizePool = req.body.prizePool;
    if (req.body.pointsSystem !== undefined) settings.pointsSystem = req.body.pointsSystem;
    if (req.body.maps !== undefined) settings.maps = req.body.maps;
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

    const settings = await Settings.findOne();
    const communityLink = settings ? settings.communityLink : 'https://t.me/bgmi_tournament';

    await sendTeamApprovalEmail(team.email, temporaryPassword, team.teamName, communityLink);

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

export const updateTeamDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamName, email, teamType, players } = req.body;
    
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (teamName) team.teamName = teamName;
    if (email) team.email = email;
    if (teamType) team.teamType = teamType;
    
    if (players) {
      await Player.deleteMany({ teamId: id });
      const playersToInsert = players.map(p => ({
        ...p,
        teamId: id
      }));
      if (playersToInsert.length > 0) {
        await Player.insertMany(playersToInsert);
      }
    }

    await team.save();

    // If email is changed, also update the associated User email
    if (email && team.userId) {
      const user = await User.findById(team.userId);
      if (user) {
        user.email = email;
        await user.save();
      }
    }

    res.json({ success: true, message: 'Team updated successfully', data: team });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // If team has a user, delete the user too
    if (team.userId) {
      await User.findByIdAndDelete(team.userId);
    }

    await Team.findByIdAndDelete(id);

    res.json({ success: true, message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const forceChangeTeamPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (!team.userId) {
      return res.status(400).json({ success: false, message: 'Team is not approved yet (no user account)' });
    }

    const user = await User.findById(team.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

