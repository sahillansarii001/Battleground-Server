import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPassword,
  },
});

const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: config.emailFrom,
      to: options.email,
      subject: options.subject,
      html: options.html,
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

export const sendTeamApprovalEmail = async (email, temporaryPassword) => {
  const html = `
    <h2>Your Team Registration is Approved!</h2>
    <p>Congratulations, your team has been approved for the BGMI Tournament.</p>
    <p>Your temporary password is: <strong>${temporaryPassword}</strong></p>
    <p>Please login and change your password immediately.</p>
  `;
  await sendEmail({ email, subject: 'Team Approved - BGMI Tournament', html });
};

export const sendTeamRejectionEmail = async (email, reason) => {
  const html = `
    <h2>Team Registration Status</h2>
    <p>Unfortunately, your team registration for the BGMI Tournament has been rejected.</p>
    <p>Reason: ${reason || 'Not specified by admin'}</p>
  `;
  await sendEmail({ email, subject: 'Registration Rejected - BGMI Tournament', html });
};
