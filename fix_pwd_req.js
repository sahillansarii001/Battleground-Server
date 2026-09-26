import mongoose from 'mongoose';
import User from './models/User.js';
import 'dotenv/config';

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bgmi_portal').then(async () => {
  await User.updateMany({ email: 'tahachoudhary54@gmail.com' }, { $set: { mustChangePassword: false } });
  console.log("mustChangePassword set to false");
  process.exit(0);
});
