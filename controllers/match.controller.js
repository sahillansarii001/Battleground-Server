import Match from '../models/Match.js';
import Score from '../models/Score.js';
import MatchParticipant from '../models/MatchParticipant.js';

export const createMatch = async (req, res) => {
  try {
    const match = new Match({
      ...req.body,
      createdBy: req.user._id || req.user.id
    });
    await match.save();
    res.status(201).json({ success: true, data: match });
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
    const { status } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    
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
      .sort({ totalPoints: -1 });
    res.json({ success: true, data: scores });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
