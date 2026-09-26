import mongoose from 'mongoose';
import Team from './models/Team.js';
import 'dotenv/config';

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bgmi_portal').then(async () => {
  const team = await Team.findOne({ teamName: 'X factors' });
  if (team) {
    console.log(`Team: ${team.teamName}, Type: ${team.teamType}, Players Count: ${team.players ? team.players.length : 0}`);
  } else {
    console.log("Team not found");
  }
  process.exit(0);
});
