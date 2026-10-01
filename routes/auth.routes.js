import express from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, forgotPassword, verifyOtp, resetPassword, changePassword, sendRegistrationOtp } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per windowMs
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs for emails
  message: { success: false, message: 'Too many OTP requests, please try again after 15 minutes' }
});

router.post('/login', loginLimiter, login);
router.post('/logout', protect, logout);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.post('/send-registration-otp', otpLimiter, sendRegistrationOtp);
router.put('/change-password', protect, changePassword);

export default router;
