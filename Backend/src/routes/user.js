// Backend Routes - User API - src/routes/user.js
import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Automation from '../models/Automation.js';
import CommitLog from '../models/CommitLog.js';

const router = express.Router();

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.patch('/profile', [
  body('username').optional().trim().isLength({ min: 3 }),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email } = req.body;
    const updateData = {};

    if (username) updateData.username = username;
    if (email) updateData.email = email;

    // Check if username or email already exists (excluding current user)
    if (username || email) {
      const existingUser = await User.findOne({
        $and: [
          { _id: { $ne: req.userId } },
          {
            $or: [
              ...(username ? [{ username }] : []),
              ...(email ? [{ email }] : [])
            ]
          }
        ]
      });

      if (existingUser) {
        return res.status(400).json({ 
          error: 'Username or email already exists' 
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true }
    );

    res.json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        plan: user.plan,
        githubConnected: !!user.githubAccessToken,
        githubUsername: user.githubUsername
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.patch('/password', [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    
    await User.findByIdAndUpdate(req.userId, {
      password: hashedNewPassword
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get user settings
router.get('/settings', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      settings: user.settings || {
        notifications: {
          email: true,
          automationStatus: true,
          commitFailures: true,
          weeklyReport: true
        },
        preferences: {
          theme: 'light',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          language: 'en'
        },
        automation: {
          maxConcurrentRules: 5,
          defaultCommitFile: 'README.md',
          defaultTimeRange: {
            start: '09:00',
            end: '17:00'
          }
        }
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user settings
router.patch('/settings', async (req, res) => {
  try {
    const { settings } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { settings },
      { new: true }
    );

    res.json({ 
      message: 'Settings updated successfully',
      settings: user.settings 
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Disconnect GitHub account
router.post('/disconnect-github', async (req, res) => {
  try {
    // Stop all active automations
    await Automation.updateMany(
      { userId: req.userId, status: 'active' },
      { status: 'stopped' }
    );

    // Remove GitHub connection
    await User.findByIdAndUpdate(req.userId, {
      $unset: {
        githubAccessToken: 1,
        githubId: 1,
        githubUsername: 1
      }
    });

    res.json({ message: 'GitHub account disconnected successfully' });
  } catch (error) {
    console.error('Disconnect GitHub error:', error);
    res.status(500).json({ error: 'Failed to disconnect GitHub account' });
  }
});

// Export user data
router.get('/export', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const automations = await Automation.find({ userId: req.userId });
    const commitLogs = await CommitLog.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(1000); // Limit to recent 1000 logs

    const exportData = {
      user: {
        username: user.username,
        email: user.email,
        plan: user.plan,
        createdAt: user.createdAt,
        settings: user.settings
      },
      automations: automations.map(auto => ({
        repoName: auto.repoName,
        repoOwner: auto.repoOwner,
        targetFile: auto.targetFile,
        maxCommitsPerDay: auto.maxCommitsPerDay,
        timeRange: auto.timeRange,
        commitPhrases: auto.commitPhrases,
        status: auto.status,
        statistics: auto.statistics,
        createdAt: auto.createdAt
      })),
      commitLogs: commitLogs.map(log => ({
        repoName: log.repoName,
        commitMessage: log.commitMessage,
        fileName: log.fileName,
        status: log.status,
        createdAt: log.createdAt
      })),
      exportDate: new Date().toISOString()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=github-automation-export.json');
    res.json(exportData);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Delete user account
router.delete('/account', async (req, res) => {
  try {
    // Delete all user's automations and commit logs
    await Automation.deleteMany({ userId: req.userId });
    await CommitLog.deleteMany({ userId: req.userId });
    
    // Delete user account
    await User.findByIdAndDelete(req.userId);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const automations = await Automation.find({ userId: req.userId });
    const totalCommits = await CommitLog.countDocuments({ 
      userId: req.userId, 
      status: 'success' 
    });

    const stats = {
      totalAutomations: automations.length,
      activeAutomations: automations.filter(a => a.status === 'active').length,
      totalCommits,
      accountAge: Math.floor((new Date() - new Date(req.user.createdAt)) / (1000 * 60 * 60 * 24))
    };

    res.json(stats);
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update avatar
router.patch('/avatar', [
  body('avatar').isURL().withMessage('Avatar must be a valid URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { avatar } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatar },
      { new: true }
    );

    res.json({
      message: 'Avatar updated successfully',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

export default router;