import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { notFound, errorHandler } from './middleware/error.middleware.js';
import { connectDB } from './config/db.js';

import authRoutes from './routes/auth.routes.js';
import teamRoutes from './routes/team.routes.js';
import adminRoutes from './routes/admin.routes.js';
import matchRoutes from './routes/match.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import rulebookRoutes from './routes/rulebook.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import publicRoutes from './routes/public.routes.js';

const app = express();
app.set('trust proxy', 1);

app.use(express.json());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(morgan('dev'));

app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/rules', rulebookRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

app.get('/api/health', (req, res) => {
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasAppPassword = !!(process.env.EMAIL_PASS || process.env.GOOGLE_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD);
  const emailConfigured = hasResend || hasAppPassword;

  let authMethod = 'NOT CONFIGURED';
  if (hasResend) authMethod = 'Resend API';
  else if (hasAppPassword) authMethod = 'Gmail App Password';

  res.json({
    success: true,
    message: 'BGMI Tournament API is running',
    environment: process.env.NODE_ENV || 'development',
    emailService: {
      configured: emailConfigured,
      authMethod,
      sender: hasResend
        ? (process.env.RESEND_FROM || 'BGMI Tournament <no-reply@battleground.nexcoreinstitute.org>')
        : (process.env.GOOGLE_EMAIL || process.env.EMAIL_USER || 'Not set')
    }
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
