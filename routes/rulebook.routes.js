import express from 'express';
import { 
  uploadRulebook, 
  getRulebooks, 
  publishRulebook, 
  getCurrentRulebook,
  updateRulebook,
  deleteRulebook
} from '../controllers/rulebook.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/current', getCurrentRulebook); // Publicly accessible

router.route('/')
  .get(protect, admin, getRulebooks)
  .post(protect, admin, uploadRulebook);

router.put('/:id/publish', protect, admin, publishRulebook);

router.route('/:id')
  .put(protect, admin, updateRulebook)
  .delete(protect, admin, deleteRulebook);

export default router;
