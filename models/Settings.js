import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  communityLink: {
    type: String,
    default: 'https://discord.gg/example',
  },
  prizePool: {
    type: String,
    default: '50K',
  },
  pointsSystem: {
    perKill: { type: Number, default: 1 },
    placementPoints: {
      type: Map,
      of: Number,
      default: {
        "1": 10, "2": 6, "3": 5, "4": 4
      }
    }
  },
  maps: {
    type: [String],
    default: ['ERANGEL', 'MIRAMAR', 'SANHOK', 'VIKENDI']
  }
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
