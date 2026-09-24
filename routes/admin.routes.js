import express from 'express';
import { 
  getDashboardStats, 
  approveTeam, 
  rejectTeam, 
  bulkCreateMatches,
  adminLogin,
  changePassword,
  forgotPassword,
  resetPassword,
  getSettings,
  updateSettings
} from '../controllers/admin.controller.js';
import { updateTeamLogo } from '../controllers/team.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = express.Router();

router.post('/login', adminLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected Admin Routes
router.put('/settings/password', protect, admin, changePassword);
router.get('/settings', protect, admin, getSettings);
router.put('/settings', protect, admin, updateSettings);
router.get('/dashboard', protect, admin, getDashboardStats);
router.patch('/teams/:id/approve', protect, admin, approveTeam);
router.patch('/teams/:id/reject', protect, admin, rejectTeam);
router.patch('/teams/:id/logo', protect, admin, upload.single('logo'), updateTeamLogo);
router.post('/matches/bulk', protect, admin, bulkCreateMatches);

export default router;
