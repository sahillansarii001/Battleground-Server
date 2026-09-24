import express from 'express';
import { getDashboardStats, approveTeam, rejectTeam, bulkCreateMatches } from '../controllers/admin.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/dashboard', protect, admin, getDashboardStats);
router.patch('/teams/:id/approve', protect, admin, approveTeam);
router.patch('/teams/:id/reject', protect, admin, rejectTeam);
router.post('/matches/bulk', protect, admin, bulkCreateMatches);

export default router;
