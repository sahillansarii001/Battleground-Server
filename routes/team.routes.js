import express from 'express';
import rateLimit from 'express-rate-limit';
import { registerTeam, getMyTeam, updateTeam } from '../controllers/team.controller.js';
import { requestPlayerChange } from '../controllers/pcr.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = express.Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per windowMs
  message: { success: false, message: 'Too many registration attempts, please try again after 1 hour' }
});

router.post('/register', registerLimiter, upload.single('logo'), registerTeam);
router.get('/me', protect, getMyTeam);
router.put('/update', protect, upload.single('logo'), updateTeam);
router.post('/player-change', protect, requestPlayerChange);

export default router;
