import fs from 'fs';
import path from 'path';

const dir = path.join('c:/Users/ADMIN/BGMI-Portal/Server/src/templates/email');
fs.mkdirSync(dir, { recursive: true });

const approved = `<h2>Your Team {{teamName}} is Approved!</h2>
<p>Congratulations, your team has been approved for the BGMI Tournament.</p>
<p>Your temporary password is: <strong>{{temporaryPassword}}</strong></p>
<p>Please login and change your password immediately at <a href='{{loginUrl}}'>{{loginUrl}}</a>.</p>`;
fs.writeFileSync(path.join(dir, 'team-approved.html'), approved);

const rejected = `<h2>Team {{teamName}} Registration Status</h2>
<p>Unfortunately, your team registration for the BGMI Tournament has been rejected.</p>
<p>Reason: {{reason}}</p>`;
fs.writeFileSync(path.join(dir, 'team-rejected.html'), rejected);

const reset = `<h2>Admin Password Reset</h2>
<p>You requested a password reset. Click the link below to reset your password.</p>
<p><a href='{{resetUrl}}'>Reset Password</a></p>
<p>If you did not request this, please ignore this email.</p>`;
fs.writeFileSync(path.join(dir, 'password-reset.html'), reset);

const tempPwd = `<h2>Your Temporary Password</h2>
<p>Your new temporary password is: <strong>{{temporaryPassword}}</strong></p>
<p>Please login and change your password immediately at <a href='{{loginUrl}}'>{{loginUrl}}</a>.</p>`;
fs.writeFileSync(path.join(dir, 'temporary-password.html'), tempPwd);

const announcement = `<h2>Tournament Announcement</h2>
<p>{{announcementText}}</p>`;
fs.writeFileSync(path.join(dir, 'announcement.html'), announcement);

const playerChange = `<h2>Player Change {{status}}</h2>
<p>Your request to change player {{playerName}} has been <strong>{{status}}</strong>.</p>
<p>Reason: {{reason}}</p>`;
fs.writeFileSync(path.join(dir, 'player-change.html'), playerChange);

console.log('Templates created');
