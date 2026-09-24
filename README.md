# BGMI Tournament Management Platform - Backend

This is the backend for the BGMI Tournament Management Platform.

## Features
- Team and Player Registration (SOLO/DUO/SQUAD)
- Admin Approvals
- Secure Authentication (JWT, bcrypt)
- Match Management & Scheduling
- Scoring & Leaderboard
- Announcements & Rules Management
- Email Notifications (via Gmail API OAuth 2.0)
- Cloudinary Image Uploads

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and configure it.
3. Start MongoDB.
4. `npm run dev` to start the server.
5. `npm run create:admin` to create the initial admin account interactively.

## Google Cloud Console Setup (Gmail API)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services > Library** and enable the **Gmail API**.
4. Go to **APIs & Services > OAuth consent screen** and configure it.
5. Go to **APIs & Services > Credentials**.
6. Create **OAuth client ID** (Web application).
7. Add `https://developers.google.com/oauthplayground` as a **Redirect URI**.
8. Go to the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
9. In step 1, select the **Gmail API v1** and authorize the scopes (e.g., `https://mail.google.com/`).
10. Click the settings gear icon, check "Use your own OAuth credentials", and input your Client ID and Secret.
11. In step 2, exchange the authorization code for tokens to get the **Refresh Token**.
12. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_REFRESH_TOKEN`, and `GOOGLE_EMAIL` to your `.env` file. (Note: These are application credentials, do not commit them to Git).

## Cloudinary Setup (Image Uploads)

1. Create a free account at [Cloudinary](https://cloudinary.com/).
2. Get your `Cloud Name`, `API Key`, and `API Secret` from the dashboard.
3. Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to your `.env` file.
4. Images (like Team Logos) are automatically uploaded and stored in Cloudinary via the backend, and not stored permanently on the local filesystem.

## Admin Account Creation
Use the script to securely create an admin account directly in the database:
```sh
npm run create:admin
```
This prompts for email and password. Admins can log in, manage teams, change their password, and request a password reset if forgotten. Admin passwords are not stored in environment variables.

## Team Logo Upload Flow
1. Frontend sends a `multipart/form-data` request with the logo file and team data to `/api/team/register` or the logo update endpoint.
2. The backend (`upload.middleware.js`) handles it via Multer's memory storage.
3. The image is validated for size and type, then uploaded directly to Cloudinary.
4. The backend stores the returned Cloudinary URL and `publicId` in MongoDB.
5. If the logo is replaced later, the old one is deleted from Cloudinary using its `publicId`.

## Email Configuration
Emails are sent via the `src/services/email.service.js` which uses Google OAuth 2.0. HTML templates for emails are located in `src/templates/email/`.

## Structure
- `src/controllers`: Request handlers
- `src/services`: Business logic
- `src/models`: Mongoose models
- `src/routes`: Express routes
- `src/middleware`: Custom middleware
- `src/templates/email`: Email HTML templates
- `scripts`: Utilities like `createAdmin.js`
