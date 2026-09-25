import express from 'express';
import { registerTeam, getMyTeam, updateTeam } from '../controllers/team.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = express.Router();

router.post('/register', upload.single('logo'), registerTeam);
router.get('/me', protect, getMyTeam);
router.put('/update', protect, upload.single('logo'), updateTeam);

export default router;
