import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OAuth2 = google.auth.OAuth2;

let cachedTransporter = null;

const createTransporter = async (forceNew = false) => {
  if (cachedTransporter && !forceNew) {
    return cachedTransporter;
  }

  // Option 1: Gmail App Password (recommended, stable, does not expire every 7 days)
  const appPassword = process.env.EMAIL_PASS || process.env.GOOGLE_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD;
  const emailUser = process.env.EMAIL_USER || process.env.GOOGLE_EMAIL;

  if (appPassword && emailUser) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: appPassword.replace(/\s+/g, '') // remove any spaces if copied from Google UI
      }
    });
    return cachedTransporter;
  }

  // Option 2: Generic SMTP provider (e.g. Brevo, SendGrid, Mailgun)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    return cachedTransporter;
  }

  // Option 3: Google OAuth2
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    try {
      const oauth2Client = new OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
      );

      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });

      const accessToken = await new Promise((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => {
          if (err) {
            reject(err);
          } else {
            resolve(token);
          }
        });
      });

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.GOOGLE_EMAIL,
          accessToken,
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: process.env.GOOGLE_REFRESH_TOKEN
        }
      });

      cachedTransporter = transporter;
      return transporter;
    } catch (error) {
      cachedTransporter = null;
      if (
        error?.message?.includes('invalid_grant') ||
        error?.response?.data?.error === 'invalid_grant' ||
        error?.code === 400
      ) {
        console.error(
          '\n============================================================\n' +
          '❌ [EMAIL ERROR]: Google OAuth2 refresh token is expired or invalid (invalid_grant).\n' +
          '   In Google Cloud Console ("Testing" mode), OAuth refresh tokens expire after 7 days.\n\n' +
          '   Recommended Solution (Gmail App Password):\n' +
          '   1. Go to https://myaccount.google.com/apppasswords\n' +
          '   2. Generate a 16-character App Password (requires 2-Step Verification enabled)\n' +
          '   3. Add `EMAIL_PASS=your_16_char_password` to Server/.env\n\n' +
          '   Alternative Solution (OAuth2):\n' +
          '   1. Go to https://developers.google.com/oauthplayground\n' +
          '   2. Exchange authorization code for a new refresh token and update GOOGLE_REFRESH_TOKEN in .env\n' +
          '============================================================\n'
        );
      } else {
        console.error('Error in creating Google OAuth2 email transporter:', error);
      }
      return null;
    }
  }

  console.error(
    '\n============================================================\n' +
    '❌ [EMAIL ERROR]: No valid email configuration found.\n' +
    '   Please configure EMAIL_PASS (Gmail App Password) or GOOGLE_REFRESH_TOKEN in Server/.env\n' +
    '============================================================\n'
  );
  return null;
};

const sendEmail = async (options) => {
  const emailTransporter = await createTransporter();
  if (!emailTransporter) {
    const errorMsg = 'Could not create email transporter. Check your email credentials in .env (invalid_grant or missing EMAIL_PASS).';
    console.error(`Email sending failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const senderEmail = process.env.GOOGLE_EMAIL || process.env.EMAIL_USER || 'no-reply@bgmitournament.com';
  const mailOptions = {
    from: `BGMI Tournament <${senderEmail}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`[Email Service] Email sent successfully to ${options.email} (Message ID: ${info?.messageId || 'OK'})`);
    return info;
  } catch (error) {
    cachedTransporter = null;
    console.error(`[Email Service] Failed sending email to ${options.email}:`, error.message);
    throw error;
  }
};

const getTemplate = (templateName, variables) => {
  try {
    const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);
    let template = fs.readFileSync(templatePath, 'utf8');
    for (const [key, value] of Object.entries(variables)) {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return template;
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    return '';
  }
};

export const sendTeamRegistrationReceivedEmail = async (email, teamName, communityLink) => {
  const html = getTemplate('team-received', { 
    teamName, 
    email,
    communityLink: communityLink || 'https://t.me/bgmi_tournament'
  });
  await sendEmail({ email, subject: 'Squad Deployment Received - BGMI Tournament', html });
};

export const sendTeamApprovalEmail = async (email, temporaryPassword, teamName, communityLink) => {
  const html = getTemplate('team-approved', { 
    teamName, 
    temporaryPassword, 
    loginUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    communityLink: communityLink || 'https://t.me/bgmi_tournament',
    email
  });
  await sendEmail({ email, subject: 'Squad Deployment Authorized - BGMI Tournament', html });
};

export const sendTeamRejectionEmail = async (email, reason, teamName) => {
  const html = getTemplate('team-rejected', { teamName, reason: reason || 'Not specified by admin' });
  await sendEmail({ email, subject: 'Registration Rejected - BGMI Tournament', html });
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.ADMIN_URL || 'http://localhost:3000/admin'}/reset-password?token=${resetToken}`;
  const html = getTemplate('password-reset', { resetUrl });
  await sendEmail({ email, subject: 'Admin Password Reset - BGMI Tournament', html });
};

export const sendTemporaryPasswordEmail = async (email, temporaryPassword) => {
  const html = getTemplate('temporary-password', { temporaryPassword, loginUrl: process.env.CLIENT_URL || 'http://localhost:3000' });
  await sendEmail({ email, subject: 'Your Temporary Password', html });
};

export const sendAnnouncementEmail = async (email, announcementText) => {
  const html = getTemplate('announcement', { announcementText });
  await sendEmail({ email, subject: 'Tournament Announcement', html });
};

export const sendPlayerChangeApprovalEmail = async (email, playerName) => {
  const html = getTemplate('player-change', { status: 'Approved', playerName });
  await sendEmail({ email, subject: 'Player Change Approved', html });
};

export const sendPlayerChangeRejectionEmail = async (email, playerName, reason) => {
  const html = getTemplate('player-change', { status: 'Rejected', playerName, reason: reason || 'Not specified' });
  await sendEmail({ email, subject: 'Player Change Rejected', html });
};

export const sendOtpEmail = async (email, otp, subject = 'Password Reset OTP - BGMI Tournament') => {
  const html = getTemplate('otp-email', { otp });
  await sendEmail({ email, subject, html });
};

export const sendAdminNotificationEmail = async (subject, htmlContent) => {
  try {
    const Admin = (await import('../models/Admin.js')).default;
    const admins = await Admin.find({ isActive: true });
    for (const admin of admins) {
      await sendEmail({ email: admin.email, subject, html: htmlContent });
    }
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
};

export const sendMatchRoomDetailsEmail = async (email, matchName, matchTime, roomId, roomPassword) => {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #111518; color: #ffffff; padding: 20px;">
      <h2 style="color: #FF6A00; text-transform: uppercase;">Match is LIVE!</h2>
      <p>Your upcoming match <strong>${matchName}</strong> at ${matchTime} is now LIVE.</p>
      <div style="background-color: #080a0c; padding: 15px; border-left: 4px solid #FF6A00; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Room ID:</strong> <span style="font-size: 1.2em; color: #FF6A00;">${roomId}</span></p>
        <p style="margin: 0;"><strong>Password:</strong> <span style="font-size: 1.2em; color: #FF6A00;">${roomPassword}</span></p>
      </div>
      <p>Please join the room immediately. Best of luck!</p>
    </div>
  `;
  await sendEmail({ email, subject: `Room Details: ${matchName}`, html });
};

export const sendMatchScheduleEmail = async (email, matchTitle, scheduledDate, scheduledTime, map, mode, isUpdate = false) => {
  const dateObj = new Date(scheduledDate);
  const formattedDate = dateObj.toLocaleDateString();
  const title = isUpdate ? 'Match Updated' : 'Match Scheduled';
  
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #111518; color: #ffffff; padding: 20px;">
      <h2 style="color: #FF6A00; text-transform: uppercase;">${title}</h2>
      <p>The match <strong>${matchTitle}</strong> has been ${isUpdate ? 'updated' : 'scheduled'} for your squad.</p>
      <div style="background-color: #080a0c; padding: 15px; border-left: 4px solid #FF6A00; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
        <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${scheduledTime}</p>
        <p style="margin: 0 0 10px 0;"><strong>Map:</strong> ${map}</p>
        <p style="margin: 0;"><strong>Mode:</strong> ${mode}</p>
      </div>
      <p>Please be online 15 minutes before the start time to receive the Room ID and Password.</p>
    </div>
  `;
  await sendEmail({ email, subject: `${title}: ${matchTitle}`, html });
};
