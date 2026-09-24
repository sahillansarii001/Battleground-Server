import express from 'express';
import { registerTeam, getMyTeam } from '../controllers/team.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', registerTeam);
router.get('/me', protect, getMyTeam);

export default router;
