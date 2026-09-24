import mongoose from 'mongoose';
import readline from 'readline';
import Admin from '../src/models/Admin.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const createAdmin = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is not defined in .env file');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const email = await question('Admin Email: ');
    
    // Check if exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      console.log('Admin account with this email already exists.');
      process.exit(0);
    }

    // Hide password input is tricky with basic readline in Windows, but we'll use a basic prompt
    const password = await question('Admin Password: ');
    const confirmPassword = await question('Confirm Password: ');

    if (password !== confirmPassword) {
      console.error('Passwords do not match.');
      process.exit(1);
    }
    
    if (password.length < 6) {
      console.error('Password must be at least 6 characters.');
      process.exit(1);
    }

    await Admin.create({
      email,
      password,
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false
    });

    console.log('Admin account created successfully.');
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdmin();
