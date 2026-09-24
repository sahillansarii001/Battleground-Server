import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema({
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  placement: { type: Number, required: true },
  kills: { type: Number, default: 0 },
  placementPoints: { type: Number, default: 0 },
  killPoints: { type: Number, default: 0 },
  bonusPoints: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['DRAFT', 'VERIFIED', 'PUBLISHED'],
    default: 'DRAFT',
  },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedAt: { type: Date },
}, { timestamps: true });

scoreSchema.index({ matchId: 1, teamId: 1 }, { unique: true });

export default mongoose.model('Score', scoreSchema);
