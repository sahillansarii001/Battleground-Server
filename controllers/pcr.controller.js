import PlayerChangeRequest from '../models/PlayerChangeRequest.js';
import Team from '../models/Team.js';
import Player from '../models/Player.js';

export const requestPlayerChange = async (req, res) => {
  try {
    const { playerId, requestedChanges, reason } = req.body;
    
    // Make sure team owns player
    const team = await Team.findOne({ userId: req.user._id || req.user.id });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const player = await Player.findOne({ _id: playerId, teamId: team._id });
    if (!player) return res.status(404).json({ success: false, message: 'Player not found in your team' });

    const pcr = new PlayerChangeRequest({
      teamId: team._id,
      playerId,
      requestedChanges,
      reason
    });

    await pcr.save();

    res.status(201).json({ success: true, message: 'Player change request submitted', data: pcr });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
