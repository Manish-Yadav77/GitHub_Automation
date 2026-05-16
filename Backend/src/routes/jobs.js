import express from 'express';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import { executeJob, generateDailyJobs } from '../services/schedulerService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { page = 1, limit = 25 } = req.query;
  const jobs = await Job.find({ userId: req.userId })
    .populate('automationId', 'repoOwner repoName')
    .sort({ scheduledAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));
  const total = await Job.countDocuments({ userId: req.userId });
  res.json({ jobs, total, currentPage: Number(page), totalPages: Math.ceil(total / Number(limit)) });
});

router.get('/pending', async (req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const jobs = await Job.find({
    userId: req.userId,
    status: 'pending',
    scheduledAt: { $gte: start, $lt: end }
  }).sort({ scheduledAt: 1 });
  res.json({ jobs });
});

router.post('/generate-today', async (req, res) => {
  try {
    await generateDailyJobs();
    const jobs = await Job.find({ userId: req.userId }).sort({ scheduledAt: -1 }).limit(25);
    res.json({ message: 'Today jobs generated.', jobs });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to generate jobs' });
  }
});

router.post('/:id/retry', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid job ID' });
  }

  const job = await Job.findOne({ _id: req.params.id, userId: req.userId });
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  job.status = 'pending';
  job.nextRetryAt = new Date();
  await job.save();
  await executeJob(job);
  res.json({ job: await Job.findById(job._id) });
});

export default router;
