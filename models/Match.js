import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  matchNumber: { type: Number, required: true },
  matchName: { type: String, required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  map: { type: String, required: true },
  mode: { type: String, enum: ['SOLO', 'DUO', 'TRIO', 'SQUAD'], required: true },
  roomId: { type: String },
  roomPassword: { type: String },
  status: {
    type: String,
    enum: ['UPCOMING', 'LIVE', 'RESULT_PROCESSING', 'COMPLETED', 'CANCELLED'],
    default: 'UPCOMING',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resultStatus: {
    type: String,
    enum: ['PENDING', 'DRAFT', 'VERIFIED', 'PUBLISHED'],
    default: 'PENDING',
  },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  mvp: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }
}, { timestamps: true });

export default mongoose.model('Match', matchSchema);
