import express from 'express';
import { 
  createMatch, 
  getMatches, 
  getMatchById, 
  updateMatchStatus,
  submitMatchResults,
  verifyMatchResults,
  publishMatchResults,
  getMatchScores,
  updateMatch,
  deleteMatch
} from '../controllers/match.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.route('/')
  .get(getMatches)
  .post(protect, admin, createMatch);

router.route('/:id')
  .get(getMatchById)
  .put(protect, admin, updateMatch)
  .delete(protect, admin, deleteMatch);

router.put('/:id/status', protect, admin, updateMatchStatus);

router.route('/:id/results')
  .get(getMatchScores)
  .post(protect, admin, submitMatchResults);

router.put('/:id/results/verify', protect, admin, verifyMatchResults);
router.put('/:id/results/publish', protect, admin, publishMatchResults);

export default router;
