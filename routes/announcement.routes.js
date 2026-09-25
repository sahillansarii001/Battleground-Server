import express from 'express';
import { 
  createAnnouncement, 
  getAnnouncements, 
  publishAnnouncement 
} from '../controllers/announcement.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.route('/')
  .get(getAnnouncements) // public or team can view
  .post(protect, admin, createAnnouncement);

router.put('/:id/publish', protect, admin, publishAnnouncement);

export default router;
