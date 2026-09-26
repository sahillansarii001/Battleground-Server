import mongoose from 'mongoose';
import User from './models/User.js';
import Team from './models/Team.js';
import 'dotenv/config';

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bgmi_portal').then(async () => {
  const users = await User.find({});
  console.log("Users:", users.map(u => ({ email: u.email, id: u._id })));
  const teams = await Team.find({});
  console.log("Teams:", teams.map(t => ({ name: t.teamName, email: t.email, userId: t.userId })));
  process.exit(0);
});
