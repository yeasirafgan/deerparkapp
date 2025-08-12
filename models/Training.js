//models/Training.js

import mongoose from 'mongoose';

const trainingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  trainingType: {
    type: String,
    required: true,
    enum: ['mandatory', 'professional', 'skills', 'safety'],
    message: 'Training type must be mandatory, professional, skills, or safety'
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: Date, required: true },
  duration: {
    type: Number,
    required: true,
    min: [0.5, 'Duration must be at least 0.5 hours'],
    max: [24, 'Duration cannot exceed 24 hours per day']
  },
  provider: { type: String, default: '' },
  location: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  approvedBy: { type: String, default: null },
  approvedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  comments: { type: String, default: '' },
  isDraft: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
  deletionReason: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add database indexes for performance
trainingSchema.index({ userId: 1, date: -1 });
trainingSchema.index({ username: 1, date: -1 });
trainingSchema.index({ status: 1 });
trainingSchema.index({ trainingType: 1 });
trainingSchema.index({ date: -1 });
trainingSchema.index({ isDraft: 1 });

// Update the updatedAt field before saving
trainingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-set completedAt when status changes to completed
trainingSchema.pre('save', function(next) {
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = Date.now();
  }
  next();
});

export default mongoose.models.Training || mongoose.model('Training', trainingSchema);