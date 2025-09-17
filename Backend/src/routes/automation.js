// Fixed Backend Routes - Automation API - src/routes/automation.js
import express from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Automation from '../models/Automation.js';
import CommitLog from '../models/CommitLog.js';
import User from '../models/User.js';

const router = express.Router();

// IMPORTANT: Specific routes MUST come before parameterized routes (:id)

// Get automation statistics
router.get('/stats', async (req, res) => {
  try {
    const automations = await Automation.find({ userId: req.userId });
    
    const stats = {
      totalAutomations: automations.length,
      activeAutomations: automations.filter(a => a.status === 'active').length,
      totalCommits: automations.reduce((sum, a) => sum + (a.statistics?.totalCommits || 0), 0),
      commitsThisWeek: automations.reduce((sum, a) => sum + (a.statistics?.commitsThisWeek || 0), 0)
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    
    // Calculate date range
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get commit logs for the date range
    const commitLogs = await CommitLog.find({
      userId: req.userId,
      createdAt: { $gte: startDate },
      status: 'success'
    });

    // Process data for charts
    const commitsByDay = [];
    const commitsByHour = Array(24).fill(0);
    const commitsByRepo = {};

    // Initialize days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      commitsByDay.push({
        date: date.toISOString().split('T')[0],
        commits: 0
      });
    }

    // Process commit logs
    commitLogs.forEach(log => {
      const date = log.createdAt.toISOString().split('T')[0];
      const hour = log.createdAt.getHours();

      // Count by day
      const dayIndex = commitsByDay.findIndex(d => d.date === date);
      if (dayIndex !== -1) {
        commitsByDay[dayIndex].commits++;
      }

      // Count by hour
      commitsByHour[hour]++;

      // Count by repository
      const repoName = log.repoName || 'Unknown';
      if (commitsByRepo[repoName]) {
        commitsByRepo[repoName]++;
      } else {
        commitsByRepo[repoName] = 1;
      }
    });

    // Format data for charts
    const commitsByHourFormatted = commitsByHour.map((count, hour) => ({
      hour: hour.toString().padStart(2, '0') + ':00',
      commits: count
    }));

    const commitsByRepoFormatted = Object.entries(commitsByRepo).map(([name, commits]) => ({
      name,
      commits
    }));

    // Calculate total stats
    const totalCommits = commitLogs.length;
    const averagePerDay = totalCommits > 0 ? Math.round(totalCommits / days * 10) / 10 : 0;
    
    // Find most active day and hour
    const mostActiveDay = commitsByDay.reduce((max, day) => 
      day.commits > max.commits ? day : max, commitsByDay[0] || { date: 'N/A', commits: 0 }
    );
    
    const mostActiveHour = commitsByHourFormatted.reduce((max, hour) => 
      hour.commits > max.commits ? hour : max, commitsByHourFormatted[0] || { hour: '00:00', commits: 0 }
    );

    const analytics = {
      commitsByDay,
      commitsByHour: commitsByHourFormatted,
      commitsByRepo: commitsByRepoFormatted,
      totalStats: {
        totalCommits,
        averagePerDay,
        mostActiveDay: mostActiveDay.date !== 'N/A' ? 
          new Date(mostActiveDay.date).toLocaleDateString('en-US', { weekday: 'long' }) : 
          'No data',
        mostActiveHour: parseInt(mostActiveHour.hour.split(':')[0])
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all automations for user
router.get('/', async (req, res) => {
  try {
    const automations = await Automation.find({ userId: req.userId })
      .sort({ createdAt: -1 });

    res.json({ automations });
  } catch (error) {
    console.error('Get automations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new automation
router.post('/', [
  body('repoName').trim().notEmpty().withMessage('Repository name is required'),
  body('repoOwner').trim().notEmpty().withMessage('Repository owner is required'),
  body('maxCommitsPerDay').isInt({ min: 1, max: 50 }).withMessage('Max commits per day must be between 1 and 50'),
  body('commitPhrases').isArray({ min: 1, max: 5 }).withMessage('Must have 1-5 commit phrases'),
  body('timeRange.startTime').notEmpty().withMessage('Start time is required'),
  body('timeRange.endTime').notEmpty().withMessage('End time is required'),
  body('schedule.daysOfWeek').isArray({ min: 1 }).withMessage('At least one day must be selected')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const automation = new Automation({
      ...req.body,
      userId: req.userId
    });

    await automation.save();
    res.status(201).json({ automation });
  } catch (error) {
    console.error('Create automation error:', error);
    res.status(500).json({ error: 'Failed to create automation' });
  }
});

// Update automation
router.put('/:id', [
  body('repoName').trim().notEmpty().withMessage('Repository name is required'),
  body('repoOwner').trim().notEmpty().withMessage('Repository owner is required'),
  body('maxCommitsPerDay').isInt({ min: 1, max: 50 }).withMessage('Max commits per day must be between 1 and 50'),
  body('commitPhrases').isArray({ min: 1, max: 5 }).withMessage('Must have 1-5 commit phrases'),
  body('timeRange.startTime').notEmpty().withMessage('Start time is required'),
  body('timeRange.endTime').notEmpty().withMessage('End time is required'),
  body('schedule.daysOfWeek').isArray({ min: 1 }).withMessage('At least one day must be selected')
], async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid automation ID' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const automation = await Automation.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    res.json({ automation });
  } catch (error) {
    console.error('Update automation error:', error);
    res.status(500).json({ error: 'Failed to update automation' });
  }
});

// Update automation status
router.patch('/:id/status', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid automation ID' });
    }

    const { status } = req.body;
    
    if (!['active', 'paused', 'stopped'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const automation = await Automation.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { status },
      { new: true }
    );

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    res.json({ automation });
  } catch (error) {
    console.error('Update automation status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get commit logs for automation
router.get('/:id/logs', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid automation ID' });
    }

    const { page = 1, limit = 20 } = req.query;
    
    const logs = await CommitLog.find({
      automationId: req.params.id,
      userId: req.userId
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await CommitLog.countDocuments({
      automationId: req.params.id,
      userId: req.userId
    });

    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get commit logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete automation
router.delete('/:id', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid automation ID' });
    }

    const automation = await Automation.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    // Also delete related commit logs
    await CommitLog.deleteMany({ automationId: automation._id });

    res.json({ message: 'Automation deleted successfully' });
  } catch (error) {
    console.error('Delete automation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single automation by ID (MUST be last among GET routes with :id)
router.get('/:id', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid automation ID' });
    }

    const automation = await Automation.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    res.json({ automation });
  } catch (error) {
    console.error('Get automation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;