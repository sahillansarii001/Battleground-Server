import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './models/User.js';
import 'dotenv/config';

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bgmi_portal').then(async () => {
  const user = await User.findOne({ email: 'tahachoudhary54@gmail.com' });
  if (user) {
    user.password = 'password123';
    await user.save();
    console.log("Password reset successfully to 'password123'");
  } else {
    console.log("User not found");
  }
  process.exit(0);
});
