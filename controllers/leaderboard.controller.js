import Score from '../models/Score.js';
import Team from '../models/Team.js';

import mongoose from 'mongoose';

export const getLeaderboard = async (req, res) => {
  try {
    const { matchId } = req.query;
    const matchFilter = { status: 'PUBLISHED' };
    
    if (matchId) {
      matchFilter.matchId = new mongoose.Types.ObjectId(matchId);
    }

    // Correct aggregation pipeline:
    const pipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: '$teamId',
          totalPoints: { $sum: '$totalPoints' },
          placementPoints: { $sum: '$placementPoints' },
          killPoints: { $sum: '$killPoints' },
          totalKills: { $sum: '$kills' },
          matchesPlayed: { $sum: 1 },
          wwcd: {
            $sum: { $cond: [{ $eq: ['$placement', 1] }, 1, 0] }
          },
          // Merge playerScores arrays from all matches
          allPlayerScores: { $push: '$playerScores' }
        }
      },
      {
        $addFields: {
          allPlayerScores: {
            $reduce: {
              input: '$allPlayerScores',
              initialValue: [],
              in: { $concatArrays: ['$$value', { $ifNull: ['$$this', []] }] }
            }
          }
        }
      },
      { $sort: { totalPoints: -1, totalKills: -1 } },
      {
        $lookup: {
          from: 'teams',
          localField: '_id',
          foreignField: '_id',
          as: 'teamDetails'
        }
      },
      { $unwind: '$teamDetails' },
      // Lookup players array from Team collection to get all team members names
      {
        $lookup: {
          from: 'players',
          localField: '_id',
          foreignField: 'teamId',
          as: 'teamMembers'
        }
      },
      {
        $project: {
          _id: 1,
          totalPoints: 1,
          placementPoints: 1,
          killPoints: 1,
          totalKills: 1,
          matchesPlayed: 1,
          wwcd: 1,
          teamName: '$teamDetails.teamName',
          logo: '$teamDetails.logo',
          allPlayerScores: 1,
          teamMembers: 1
        }
      }
    ];

    const leaderboardRaw = await Score.aggregate(pipeline);
    
    // Process player scores in JS
    const leaderboard = leaderboardRaw.map(team => {
      // aggregate kills per player
      const playerKillsMap = {};
      team.allPlayerScores.forEach(ps => {
        if (!ps.playerId) return;
        const pid = ps.playerId.toString();
        playerKillsMap[pid] = (playerKillsMap[pid] || 0) + (ps.kills || 0);
      });
      
      const players = team.teamMembers.map(member => ({
        _id: member._id,
        inGameName: member.inGameName,
        kills: playerKillsMap[member._id.toString()] || 0
      }));

      return {
        _id: team._id,
        totalPoints: team.totalPoints,
        placementPoints: team.placementPoints,
        killPoints: team.killPoints,
        totalKills: team.totalKills,
        matchesPlayed: team.matchesPlayed,
        wwcd: team.wwcd,
        teamName: team.teamName,
        logo: team.logo,
        players
      };
    });

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
