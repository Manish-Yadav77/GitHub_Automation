import express from 'express';
import rateLimit from 'express-rate-limit';
import Automation from '../models/Automation.js';
import BadgeProgress from '../models/BadgeProgress.js';
import { BADGES, ensureBadgeRows, refreshBadgeProgress, runPrCycle, runQuickdraw } from '../services/badgeService.js';

const router = express.Router();

const refreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Badge refresh is limited to once per hour.' }
});

router.get('/', async (req, res) => {
  await ensureBadgeRows(req.userId);
  const progress = await BadgeProgress.find({ userId: req.userId }).sort({ badgeName: 1 });
  res.json({ badges: BADGES, progress });
});

router.post('/refresh', refreshLimiter, async (req, res) => {
  try {
    const progress = await refreshBadgeProgress(req.userId);
    res.json({ progress });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to refresh badge progress' });
  }
});

router.post('/trigger/:type', async (req, res) => {
  try {
    const automation = await Automation.findOne({ userId: req.userId, status: { $ne: 'stopped' } }).populate('userId');
    if (!automation) {
      return res.status(400).json({ error: 'Select and activate one repository first.' });
    }

    if (req.params.type === 'quickdraw') {
      const issue = await runQuickdraw(automation);
      await refreshBadgeProgress(req.userId);
      return res.json({ message: 'Quickdraw issue opened and closed.', issueNumber: issue.number });
    }

    if (req.params.type === 'pr_cycle') {
      const result = await runPrCycle(automation);
      await refreshBadgeProgress(req.userId);
      return res.json({ message: 'Pull request cycle completed.', pullNumber: result.pr.number });
    }

    return res.status(400).json({ error: 'Unsupported badge trigger.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Badge action failed' });
  }
});

export default router;
