import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OAuth2 = google.auth.OAuth2;

const createTransporter = async () => {
  try {
    const oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const accessToken = await new Promise((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) {
          console.error('Failed to create access token', err);
          reject(err);
        }
        resolve(token);
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

    return transporter;
  } catch (error) {
    console.error('Error in creating email transporter', error);
    return null;
  }
};

const sendEmail = async (options) => {
  try {
    const emailTransporter = await createTransporter();
    if (!emailTransporter) {
      throw new Error('Could not create transporter');
    }

    const mailOptions = {
      from: `BGMI Tournament <${process.env.GOOGLE_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
    };
    await emailTransporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email sending failed:', error);
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

export const sendOtpEmail = async (email, otp) => {
  const html = getTemplate('otp-email', { otp });
  await sendEmail({ email, subject: 'Password Reset OTP - BGMI Tournament', html });
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

export const sendMatchScheduleEmail = async (email, matchTitle, scheduledTime, groupName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #111518; color: #ffffff; padding: 20px;">
      <h2 style="color: #FF6A00; text-transform: uppercase;">Match Scheduled</h2>
      <p>A new match <strong>${matchTitle}</strong> has been scheduled for your squad in Group ${groupName}.</p>
      <p><strong>Scheduled Time:</strong> ${new Date(scheduledTime).toLocaleString()}</p>
      <p>Please be online 15 minutes before the start time to receive the Room ID and Password.</p>
    </div>
  `;
  await sendEmail({ email, subject: `Match Scheduled: ${matchTitle}`, html });
};
