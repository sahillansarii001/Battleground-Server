import express from 'express';
import { getLeaderboard } from '../controllers/leaderboard.controller.js';

const router = express.Router();

router.get('/', getLeaderboard); // Public route

export default router;
