// MongoDB Models - src/models/CommitLog.js
import mongoose from 'mongoose';

const commitLogSchema = new mongoose.Schema({
  automationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Automation',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  repoName: {
    type: String,
    required: true
  },
  commitMessage: {
    type: String,
    required: true
  },
  commitSha: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  },
  error: {
    message: String,
    code: String
  },
  metadata: {
    scheduledTime: Date,
    executedTime: Date,
    timeZone: String,
    dayOfWeek: Number
  }
}, {
  timestamps: true
});

// Indexes
commitLogSchema.index({ automationId: 1 });
commitLogSchema.index({ userId: 1 });
commitLogSchema.index({ status: 1 });
commitLogSchema.index({ createdAt: -1 });

export default mongoose.model('CommitLog', commitLogSchema);