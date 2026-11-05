import express from 'express';
import { getPublicStats, getPublicSettings } from '../controllers/public.controller.js';

const router = express.Router();

router.get('/stats', getPublicStats);
router.get('/settings', getPublicSettings);

export default router;
