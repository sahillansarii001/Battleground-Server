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
        "1": 10, "2": 6, "3": 5, "4": 4, "5": 3, "6": 2, "7": 1, "8": 1, "9": 0, "10": 0,
        "11": 0, "12": 0, "13": 0, "14": 0, "15": 0, "16": 0
      }
    }
  }
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
