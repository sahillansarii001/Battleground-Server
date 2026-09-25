import Team from '../models/Team.js';
import Match from '../models/Match.js';
import Settings from '../models/Settings.js';

export const getPublicStats = async (req, res) => {
  try {
    const totalSquads = await Team.countDocuments({ status: 'APPROVED' });
    
    // Calculate total players in approved squads
    const squads = await Team.find({ status: 'APPROVED' });
    let activePlayers = 0;
    squads.forEach(squad => {
      activePlayers += (squad.players ? squad.players.length : 0);
    });

    const totalMatches = await Match.countDocuments();
    
    res.json({
      success: true,
      data: {
        totalSquads,
        activePlayers,
        totalMatches,
        prizePool: '50K' // Currently static, can be moved to settings later if required
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
