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
  updateSettings,
  getAllTeams,
  updateTeamDetails,
  deleteTeam,
  forceChangeTeamPassword,
  getAdminProfile,
  updateAdminProfile
} from '../controllers/admin.controller.js';
import { updateTeamLogo } from '../controllers/team.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = express.Router();

router.post('/login', adminLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected Admin Routes
router.get('/profile', protect, admin, getAdminProfile);
router.put('/profile', protect, admin, upload.single('profilePhoto'), updateAdminProfile);

router.put('/settings/password', protect, admin, changePassword);
router.get('/settings', protect, admin, getSettings);
router.put('/settings', protect, admin, updateSettings);
router.get('/dashboard', protect, admin, getDashboardStats);
router.get('/teams', protect, admin, getAllTeams);
router.patch('/teams/:id/approve', protect, admin, approveTeam);
router.patch('/teams/:id/reject', protect, admin, rejectTeam);
router.patch('/teams/:id/logo', protect, admin, upload.single('logo'), updateTeamLogo);
router.put('/teams/:id', protect, admin, updateTeamDetails);
router.delete('/teams/:id', protect, admin, deleteTeam);
router.put('/teams/:id/password', protect, admin, forceChangeTeamPassword);
router.post('/matches/bulk', protect, admin, bulkCreateMatches);

export default router;
