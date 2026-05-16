// MongoDB Models - src/models/Automation.js
import mongoose from 'mongoose';

const automationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  repoName: {
    type: String,
    required: true
  },
  repoOwner: {
    type: String,
    required: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  targetFile: {
    type: String,
    default: 'README.md'
  },
  maxCommitsPerDay: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  timeRange: {
    startTime: {
      type: String,
      required: true, // Format: "HH:mm" (24-hour)
    },
    endTime: {
      type: String,
      required: true // Format: "HH:mm" (24-hour)
    }
  },
  commitPhrases: [{
    type: String,
    maxlength: 100
  }],
  status: {
    type: String,
    enum: ['active', 'paused', 'stopped'],
    default: 'active'
  },
  badgeAutomation: {
    enabled: {
      type: Boolean,
      default: false
    },
    prCycleEnabled: {
      type: Boolean,
      default: false
    },
    quickdrawEnabled: {
      type: Boolean,
      default: false
    },
    includeCoAuthor: {
      type: Boolean,
      default: false
    },
    galaxyBrainHelper: {
      type: Boolean,
      default: false
    },
    starstruckTracking: {
      type: Boolean,
      default: true
    }
  },
  lastCommit: {
    timestamp: Date,
    message: String,
    sha: String
  },
  statistics: {
    totalCommits: {
      type: Number,
      default: 0
    },
    commitsThisWeek: {
      type: Number,
      default: 0
    },
    commitsThisMonth: {
      type: Number,
      default: 0
    },
    lastReset: {
      type: Date,
      default: Date.now
    }
  },
  schedule: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6 // 0 = Sunday, 6 = Saturday
    }]
  }
}, {
  timestamps: true
});

// Indexes for better query performance
automationSchema.index({ userId: 1 });
automationSchema.index({ status: 1 });
automationSchema.index({ 'schedule.daysOfWeek': 1 });
automationSchema.index({ userId: 1, repoOwner: 1, repoName: 1 }, { unique: true });

// Methods
automationSchema.methods.incrementCommitCount = function() {
  this.statistics.totalCommits += 1;
  this.statistics.commitsThisWeek += 1;
  this.statistics.commitsThisMonth += 1;
  return this.save();
};

automationSchema.methods.resetWeeklyStats = function() {
  this.statistics.commitsThisWeek = 0;
  return this.save();
};

automationSchema.methods.resetMonthlyStats = function() {
  this.statistics.commitsThisMonth = 0;
  return this.save();
};

export default mongoose.model('Automation', automationSchema);
