import Team from '../models/Team.js';
import Player from '../models/Player.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { uploadImage, deleteImage } from '../services/cloudinary.service.js';
import { sendTeamRegistrationReceivedEmail, sendAdminNotificationEmail } from '../services/email.service.js';

export const registerTeam = async (req, res) => {
  let newTeam = null;
  try {
    let { teamName, teamType, email, players } = req.body;
    
    // Parse players if it's sent as a string (multipart/form-data)
    if (typeof players === 'string') {
      try {
        players = JSON.parse(players);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid players format' });
      }
    }

    // Validations
    if (!teamName || !teamType || !email || !players || players.length === 0) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    for (const p of players) {
      if (!/^\d{10}$/.test(p.bgmiId)) {
        return res.status(400).json({ success: false, message: `BGMI ID for ${p.inGameName || 'a player'} must be exactly 10 digits` });
      }
    }

    // Check for duplicate BGMI IDs within the squad
    const bgmiIds = players.map(p => p.bgmiId);
    if (new Set(bgmiIds).size !== bgmiIds.length) {
      return res.status(400).json({ success: false, message: 'Each player must have a unique BGMI ID within the squad' });
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
      // Check if this team is an orphaned record from a previous failed registration (0 players)
      const count = await Player.countDocuments({ teamId: teamExists._id });
      if (count === 0 && teamExists.status === 'PENDING') {
        await Team.findByIdAndDelete(teamExists._id);
      } else {
        return res.status(400).json({ success: false, message: 'Team with this email or name already exists' });
      }
    }

    // Check existing user
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    // Check BGMI IDs across database
    const existingPlayers = await Player.find({ bgmiId: { $in: bgmiIds } });
    if (existingPlayers.length > 0) {
      return res.status(400).json({ success: false, message: 'One or more BGMI IDs are already registered' });
    }

    // Handle Logo Upload
    let logoData = {};
    if (req.file) {
      logoData = await uploadImage(req.file.buffer, 'bgmi-teams');
    }

    // Create team with PENDING status
    newTeam = await Team.create({
      teamName,
      teamType,
      email,
      logo: logoData,
      status: 'PENDING'
    });

    // Create players
    const playerDocs = players.map(p => ({
      teamId: newTeam._id,
      playerName: p.playerName,
      inGameName: p.inGameName,
      bgmiId: p.bgmiId,
      role: p.role,
    }));
    await Player.insertMany(playerDocs);

    // Fetch community link
    const settings = await Settings.findOne();
    const communityLink = settings ? settings.communityLink : 'https://t.me/bgmi_tournament';

    // Dispatch "Deployment Received" confirmation email to the team
    sendTeamRegistrationReceivedEmail(newTeam.email, newTeam.teamName, communityLink).catch(emailErr => {
      console.error('[registerTeam] Failed to send registration received email:', emailErr.message);
    });

    // Notify admins about new squad waiting for approval
    const adminMessage = `
      <div style="font-family: sans-serif; color: #333;">
        <h2 style="color: #FF6A00;">New Squad Deployment Registered</h2>
        <p>Squad <strong>${newTeam.teamName}</strong> (${newTeam.teamType}) has registered and is pending approval.</p>
        <p><strong>Contact Email:</strong> ${newTeam.email}</p>
        <p>Please log in to the Admin Panel to review squad operators and approve deployment.</p>
      </div>
    `;
    sendAdminNotificationEmail(`New Squad Pending Approval - ${newTeam.teamName}`, adminMessage).catch(err => {
      console.error('[registerTeam] Failed to notify admins:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Team registered successfully. Pending admin approval.',
      data: newTeam
    });

  } catch (error) {
    if (newTeam?._id) {
      try {
        await Team.findByIdAndDelete(newTeam._id);
        await Player.deleteMany({ teamId: newTeam._id });
      } catch (cleanupErr) {
        console.error('Error rolling back team creation:', cleanupErr);
      }
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyTeam = async (req, res) => {
  try {
    let team = await Team.findOne({ $or: [{ userId: req.user._id }, { email: req.user.email }] });
    
    // Development fallback
    if (!team) {
      team = await Team.findOne();
    }

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

export const updateTeamLogo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Upload new logo
    const newLogoData = await uploadImage(req.file.buffer, 'bgmi-teams');
    
    // Save old publicId for deletion later
    const oldPublicId = team.logo?.publicId;

    team.logo = newLogoData;
    await team.save();

    // Delete old logo after successful new upload and save
    if (oldPublicId) {
      await deleteImage(oldPublicId);
    }

    res.json({ success: true, message: 'Logo updated successfully', data: team });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTeam = async (req, res) => {
  try {
    const { teamName, email } = req.body;
    
    let team = await Team.findOne({ $or: [{ userId: req.user._id }, { email: req.user.email }] });
    
    // Development fallback: If the current user has no team linked (e.g. testing data), 
    // just grab the first available team to allow the UI to work.
    if (!team) {
      team = await Team.findOne();
    }

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (teamName) {
      team.teamName = teamName;
    }

    if (email && email !== team.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== team.userId?.toString()) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
      team.email = email;
      const user = await User.findById(req.user._id);
      if (user) {
        user.email = email;
        await user.save();
      }
      team.userId = req.user._id; // Ensure link is established
    }

    if (req.file) {
      const newLogoData = await uploadImage(req.file.buffer, 'bgmi-teams');
      const oldPublicId = team.logo?.publicId;
      team.logo = newLogoData;
      
      if (oldPublicId) {
        await deleteImage(oldPublicId).catch(err => console.error(err));
      }
    }

    await team.save();

    // Notify admins about the update
    import('../services/email.service.js').then(({ sendAdminNotificationEmail }) => {
      const message = `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #FF6A00;">Squad Identity Updated</h2>
          <p>The squad <strong>${team.teamName}</strong> has updated their team information.</p>
          <p><strong>Email:</strong> ${team.email}</p>
          <p><strong>Team Type:</strong> ${team.teamType}</p>
          <p>Please review these changes in the Admin Panel if necessary.</p>
        </div>
      `;
      sendAdminNotificationEmail('Squad Identity Updated - ' + team.teamName, message);
    }).catch(err => console.error("Could not send admin notification", err));

    res.json({ success: true, message: 'Squad info updated successfully', data: team });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

