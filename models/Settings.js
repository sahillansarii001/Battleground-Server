import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  communityLink: {
    type: String,
    default: 'https://discord.gg/example',
  }
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
