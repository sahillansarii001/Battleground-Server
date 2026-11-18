import express from 'express';
import { login, logout, forgotPassword, verifyOtp, resetPassword, changePassword, sendRegistrationOtp } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { loginLimiter, otpVerifyLimiter, otpSendLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

router.post('/login', loginLimiter, login);
router.post('/logout', protect, logout);
router.post('/forgot-password', otpSendLimiter, forgotPassword);
router.post('/verify-otp', otpVerifyLimiter, verifyOtp);
router.post('/reset-password', otpVerifyLimiter, resetPassword);
router.post('/send-registration-otp', otpSendLimiter, sendRegistrationOtp);
router.put('/change-password', protect, changePassword);

export default router;
