import Team from '../models/Team.js';
import Player from '../models/Player.js';

export const registerTeam = async (req, res) => {
  try {
    const { teamName, teamType, email, logo, players } = req.body;
    
    // Validations
    if (!teamName || !teamType || !email || !players || players.length === 0) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (teamType === 'SOLO' && players.length !== 1) {
      return res.status(400).json({ success: false, message: 'SOLO requires exactly 1 player' });
    }
    if (teamType === 'DUO' && players.length !== 2) {
      return res.status(400).json({ success: false, message: 'DUO requires exactly 2 players' });
    }
    if (teamType === 'SQUAD' && players.length !== 4) {
      return res.status(400).json({ success: false, message: 'SQUAD requires exactly 4 players' });
    }

    // Check existing team
    const teamExists = await Team.findOne({ $or: [{ email }, { teamName }] });
    if (teamExists) {
      return res.status(400).json({ success: false, message: 'Team with this email or name already exists' });
    }

    // Check BGMI IDs
    const bgmiIds = players.map(p => p.bgmiId);
    const existingPlayers = await Player.find({ bgmiId: { $in: bgmiIds } });
    if (existingPlayers.length > 0) {
      return res.status(400).json({ success: false, message: 'One or more BGMI IDs are already registered' });
    }

    // Create team
    const newTeam = await Team.create({
      teamName,
      teamType,
      email,
      logo,
      status: 'PENDING'
    });

    // Create players
    const playerDocs = players.map(p => ({
      teamId: newTeam._id,
      playerName: p.playerName,
      inGameName: p.inGameName,
      bgmiId: p.bgmiId,
      role: teamType === 'SQUAD' ? p.role : null,
    }));
    await Player.insertMany(playerDocs);

    res.status(201).json({
      success: true,
      message: 'Team registered successfully. Pending admin approval.',
      data: newTeam
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyTeam = async (req, res) => {
  try {
    const team = await Team.findOne({ userId: req.user._id });
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    const players = await Player.find({ teamId: team._id });
    res.json({
      success: true,
      data: { team, players }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
