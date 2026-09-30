import express from 'express';
import { 
  createAnnouncement, 
  getAnnouncements, 
  publishAnnouncement,
  deleteAnnouncement
} from '../controllers/announcement.controller.js';
import { protect, admin, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.route('/')
  .get(optionalAuth, getAnnouncements) // public or team can view
  .post(protect, admin, createAnnouncement);

router.put('/:id/publish', protect, admin, publishAnnouncement);
router.delete('/:id', protect, admin, deleteAnnouncement);

export default router;
