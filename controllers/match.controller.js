import Match from '../models/Match.js';
import Score from '../models/Score.js';
import MatchParticipant from '../models/MatchParticipant.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import { sendMatchRoomDetailsEmail, sendMatchScheduleEmail } from '../services/email.service.js';

export const createMatch = async (req, res) => {
  try {
    const { matchNumber, matchName, date } = req.body;
    
    // Check if match number or name already exists on the same date
    const matchDate = new Date(date);
    // Since dates might have time differences if not set at exactly midnight,
    // we should match the same day. Or if the frontend always sends YYYY-MM-DD,
    // new Date(date) will be midnight UTC.
    const startOfDay = new Date(matchDate.setUTCHours(0,0,0,0));
    const endOfDay = new Date(matchDate.setUTCHours(23,59,59,999));

    const existingMatch = await Match.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      $or: [{ matchNumber }, { matchName }]
    });
    
    if (existingMatch) {
      if (existingMatch.matchNumber === Number(matchNumber)) {
        return res.status(400).json({ success: false, message: 'A match with this Match Number already exists on this date' });
      }
      if (existingMatch.matchName === matchName) {
        return res.status(400).json({ success: false, message: 'A match with this Match Name already exists on this date' });
      }
    }

    const match = new Match({
      ...req.body,
      createdBy: req.user._id || req.user.id
    });
    await match.save();
    
    // Email all users about the new match
    const allUsers = await User.find({});
    for (const user of allUsers) {
      if (user.email) {
        await sendMatchScheduleEmail(
          user.email,
          match.matchName,
          match.date,
          match.startTime,
          match.map,
          match.mode,
          false
        );
      }
    }
    
    res.status(201).json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMatch = async (req, res) => {
  try {
    const { matchNumber, matchName, date } = req.body;
    
    // Check if match number or name already exists (excluding current match) on the same date
    const matchDate = new Date(date);
    const startOfDay = new Date(matchDate.setUTCHours(0,0,0,0));
    const endOfDay = new Date(matchDate.setUTCHours(23,59,59,999));

    const existingMatch = await Match.findOne({
      _id: { $ne: req.params.id },
      date: { $gte: startOfDay, $lte: endOfDay },
      $or: [{ matchNumber }, { matchName }]
    });
    
    if (existingMatch) {
      if (existingMatch.matchNumber === Number(matchNumber)) {
        return res.status(400).json({ success: false, message: 'A match with this Match Number already exists on this date' });
      }
      if (existingMatch.matchName === matchName) {
        return res.status(400).json({ success: false, message: 'A match with this Match Name already exists on this date' });
      }
    }

    const match = await Match.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    // Email all users about the updated match
    const allUsers = await User.find({});
    for (const user of allUsers) {
      if (user.email) {
        await sendMatchScheduleEmail(
          user.email,
          match.matchName,
          match.date,
          match.startTime,
          match.map,
          match.mode,
          true
        );
      }
    }

    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    
    await Match.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'Match deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMatches = async (req, res) => {
  try {
    const matches = await Match.find()
      .populate('winner', 'teamName logo')
      .populate('mvp', 'playerName inGameName')
      .sort({ date: -1 });
    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('winner', 'teamName logo')
      .populate('mvp', 'playerName inGameName');
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMatchStatus = async (req, res) => {
  try {
    const { status, roomId, roomPassword } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    
    // Only update room details if provided
    if (roomId) match.roomId = roomId;
    if (roomPassword) match.roomPassword = roomPassword;
    
    console.log(`[updateMatchStatus] status: ${status}, match.status: ${match.status}, roomId: ${roomId}`);
    
    // If we are setting status to LIVE and we have room details, email all users
    if (status === 'LIVE' && match.status !== 'LIVE' && roomId) {
      const allUsers = await User.find({});
      console.log(`[updateMatchStatus] Found ${allUsers.length} users`);
      for (const user of allUsers) {
        if (user.email) {
          console.log(`[updateMatchStatus] Sending email to ${user.email}`);
          sendMatchRoomDetailsEmail(user.email, match.matchName, match.startTime, roomId, roomPassword)
            .then(() => console.log(`[updateMatchStatus] Email sent to ${user.email}`))
            .catch(err => console.error(`[updateMatchStatus] Email error for ${user.email}:`, err));
        }
      }
    }

    match.status = status;
    await match.save();
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Also we need result handling logic: DRAFT -> VERIFIED -> PUBLISHED
export const submitMatchResults = async (req, res) => {
  try {
    const { scores, winnerId, mvpId } = req.body; // scores is array of { teamId, placement, kills, etc }
    const matchId = req.params.id;

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    // Update match winner and mvp
    if (winnerId) match.winner = winnerId;
    if (mvpId) match.mvp = mvpId;
    match.resultStatus = 'DRAFT';
    await match.save();

    // Clear old scores for this match
    await Score.deleteMany({ matchId });

    const scoreDocs = scores.map(s => ({
      ...s,
      matchId,
      status: 'DRAFT',
      enteredBy: req.user._id || req.user.id
    }));
    await Score.insertMany(scoreDocs);

    res.json({ success: true, message: 'Results saved as DRAFT' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyMatchResults = async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    match.resultStatus = 'VERIFIED';
    await match.save();

    await Score.updateMany({ matchId }, { 
      status: 'VERIFIED',
      verifiedBy: req.user._id || req.user.id
    });

    res.json({ success: true, message: 'Results VERIFIED' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const publishMatchResults = async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    match.resultStatus = 'PUBLISHED';
    await match.save();

    await Score.updateMany({ matchId }, { 
      status: 'PUBLISHED',
      publishedAt: new Date()
    });

    res.json({ success: true, message: 'Results PUBLISHED successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMatchScores = async (req, res) => {
  try {
    const scores = await Score.find({ matchId: req.params.id })
      .populate('teamId', 'teamName logo')
      .populate('playerScores.playerId', 'playerName inGameName bgmiId')
      .sort({ totalPoints: -1 });
    res.json({ success: true, data: scores });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
