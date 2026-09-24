import mongoose from 'mongoose';

const matchParticipantSchema = new mongoose.Schema({
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  status: {
    type: String,
    enum: ['REGISTERED', 'PRESENT', 'ABSENT', 'DISQUALIFIED'],
    default: 'REGISTERED',
  },
  checkInTime: { type: Date },
}, { timestamps: true });

matchParticipantSchema.index({ matchId: 1, teamId: 1 }, { unique: true });

export default mongoose.model('MatchParticipant', matchParticipantSchema);
