import rateLimit from 'express-rate-limit';

/**
 * Extracts and normalizes the client IP address from request headers or socket.
 */
export const getClientIp = (req) => {
  let ip = '';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const list = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    ip = list.split(',')[0].trim();
  } else {
    ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
  }
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  return ip || '127.0.0.1';
};

/**
 * Login Rate Limiter:
 * Blocks IP for 15 minutes when wrong password is entered more than 5 times.
 * Only failed requests (status >= 400) count towards the limit.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Up to 5 failed attempts allowed; 6th is blocked
  skipSuccessfulRequests: true, // Successful logins (status < 400) do NOT consume attempts
  validate: { xForwardedForHeader: false, default: true },
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetTime = req.rateLimit?.resetTime;
    const minutesLeft = resetTime
      ? Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 60000))
      : 15;
    return res.status(429).json({
      success: false,
      message: `Too many failed login attempts. Your IP has been temporarily blocked for ${minutesLeft} minute(s). Please try again later.`
    });
  }
});

/**
 * OTP Verification Rate Limiter:
 * Blocks IP for 15 minutes when wrong OTP is entered more than 5 times during registration or password reset.
 * Only failed requests (status >= 400) count towards the limit.
 */
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Up to 5 failed attempts allowed; 6th is blocked
  skipSuccessfulRequests: true, // Successful OTP checks (status < 400) do NOT consume attempts
  validate: { xForwardedForHeader: false, default: true },
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetTime = req.rateLimit?.resetTime;
    const minutesLeft = resetTime
      ? Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 60000))
      : 15;
    return res.status(429).json({
      success: false,
      message: `Too many failed OTP attempts. Your IP has been temporarily blocked for ${minutesLeft} minute(s). Please try again later.`
    });
  }
});

/**
 * OTP Send Rate Limiter:
 * Limits sending OTP emails to 5 per 15 minutes to prevent email flooding.
 */
export const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  validate: { xForwardedForHeader: false, default: true },
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetTime = req.rateLimit?.resetTime;
    const minutesLeft = resetTime
      ? Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 60000))
      : 15;
    return res.status(429).json({
      success: false,
      message: `Too many OTP requests from this IP. Please try again after ${minutesLeft} minute(s).`
    });
  }
});
