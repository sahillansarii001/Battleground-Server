import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { notFound, errorHandler } from './middleware/error.middleware.js';
import { connectDB } from './config/db.js';
import 'dotenv/config';

import authRoutes from './routes/auth.routes.js';
import teamRoutes from './routes/team.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'BGMI Tournament API is running'
  });
});

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  const port = process.env.PORT || 5000;
  const nodeEnv = process.env.NODE_ENV || 'development';
  app.listen(port, () => {
    console.log(`Server running in ${nodeEnv} mode on port ${port}`);
  });
};

startServer();
