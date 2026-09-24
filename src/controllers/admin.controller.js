import Team from '../models/Team.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import Match from '../models/Match.js';
import { sendTeamApprovalEmail, sendTeamRejectionEmail } from '../services/email.service.js';
import crypto from 'crypto';

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

    await sendTeamApprovalEmail(team.email, temporaryPassword);

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

    await sendTeamRejectionEmail(team.email, reason);

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
