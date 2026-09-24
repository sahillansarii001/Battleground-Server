import express from 'express';
import { registerTeam, getMyTeam } from '../controllers/team.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = express.Router();

router.post('/register', upload.single('logo'), registerTeam);
router.get('/me', protect, getMyTeam);

export default router;
