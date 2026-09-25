import Score from '../models/Score.js';
import Team from '../models/Team.js';

export const getLeaderboard = async (req, res) => {
  try {
    // We only aggregate scores that have status 'PUBLISHED'
    const aggregatePipeline = [
      { $match: { status: 'PUBLISHED' } },
      {
        $group: {
          _id: '$teamId',
          totalPoints: { $sum: '$totalPoints' },
          placementPoints: { $sum: '$placementPoints' },
          killPoints: { $sum: '$killPoints' },
          totalKills: { $sum: '$kills' },
          matchesPlayed: { $sum: 1 },
          wwcd: {
            $sum: {
              $cond: [{ $eq: ['$placement', 1] }, 1, 0]
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
          logo: '$teamDetails.logo'
        }
      }
    ];

    const leaderboard = await Score.aggregate(aggregatePipeline);
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
