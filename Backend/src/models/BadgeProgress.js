import mongoose from 'mongoose';

const badgeProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  badgeName: {
    type: String,
    enum: [
      'pull_shark',
      'yolo',
      'quickdraw',
      'pair_extraordinaire',
      'galaxy_brain',
      'starstruck',
      'public_sponsor'
    ],
    required: true
  },
  currentCount: {
    type: Number,
    default: 0
  },
  tier: {
    type: String,
    enum: ['none', 'default', 'bronze', 'silver', 'gold', 'manual'],
    default: 'none'
  },
  earnedAt: Date,
  lastChecked: Date,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

badgeProgressSchema.index({ userId: 1, badgeName: 1 }, { unique: true });

export default mongoose.model('BadgeProgress', badgeProgressSchema);
