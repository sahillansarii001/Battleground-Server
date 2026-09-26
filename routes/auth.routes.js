import express from 'express';
import { login, logout, forgotPassword, verifyOtp, resetPassword, changePassword, sendRegistrationOtp } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.post('/send-registration-otp', sendRegistrationOtp);
router.put('/change-password', protect, changePassword);

export default router;
