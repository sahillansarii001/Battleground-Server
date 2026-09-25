import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true,
    unique: true,
  },
  teamType: {
    type: String,
    enum: ['SOLO', 'DUO', 'TRIO', 'SQUAD'],
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  logo: {
    url: String,
    publicId: String
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'DISQUALIFIED'],
    default: 'PENDING',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, { timestamps: true });

export default mongoose.model('Team', teamSchema);
