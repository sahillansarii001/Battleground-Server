import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  playerName: {
    type: String,
    required: true,
  },
  inGameName: {
    type: String,
    required: true,
  },
  bgmiId: {
    type: String,
    required: true,
    unique: true,
  },
  role: {
    type: String,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE',
  }
}, { timestamps: true });

export default mongoose.model('Player', playerSchema);
