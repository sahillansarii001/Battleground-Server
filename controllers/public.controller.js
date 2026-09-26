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

    const settings = await Settings.findOne();
    const prizePool = settings?.prizePool || '50K';

    res.json({
      success: true,
      data: {
        totalSquads,
        activePlayers,
        totalMatches,
        prizePool
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
