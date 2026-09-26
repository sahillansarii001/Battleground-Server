import jwt from 'jsonwebtoken';
import 'dotenv/config';

async function test() {
  try {
    const token = jwt.sign({ id: '652300000000000000000000', role: 'ADMIN' }, process.env.JWT_SECRET);
    
    // We can also fetch the real admin ID from the DB
    import('mongoose').then(async (mongoose) => {
      await mongoose.connect(process.env.MONGO_URI);
      const Admin = (await import('./models/Admin.js')).default;
      const admin = await Admin.findOne();
      
      const realToken = jwt.sign({ id: admin._id, role: 'ADMIN' }, process.env.JWT_SECRET);
      
      const res = await fetch('http://127.0.0.1:5000/api/rules', {
        headers: { Authorization: `Bearer ${realToken}` }
      });
      const data = await res.text();
      console.log("Rules response:", res.status, data);
      process.exit(0);
    });
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}
test();
