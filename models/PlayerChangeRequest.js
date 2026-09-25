import mongoose from 'mongoose';

const pcrSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  requestedChanges: {
    type: Object,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  reason: {
    type: String
  }
}, { timestamps: true });

export default mongoose.model('PlayerChangeRequest', pcrSchema);
