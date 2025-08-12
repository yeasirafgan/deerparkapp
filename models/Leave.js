//models/Leave.js

import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  leaveType: {
    type: String,
    required: true,
    enum: ['annual', 'sick', 'maternity', 'paternity'],
    message: 'Leave type must be annual, sick, maternity, or paternity'
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalDays: {
    type: Number,
    required: true,
    min: [0.5, 'Total days must be at least 0.5'],
    max: [365, 'Total days cannot exceed 365']
  },
  reason: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: { type: String, default: null },
  approvedAt: { type: Date, default: null },
  comments: { type: String, default: '' },
  isDraft: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add database indexes for performance
leaveSchema.index({ userId: 1, startDate: -1 });
leaveSchema.index({ username: 1, startDate: -1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ leaveType: 1 });
leaveSchema.index({ startDate: -1 });
leaveSchema.index({ endDate: -1 });
leaveSchema.index({ isDraft: 1 });

// Update the updatedAt field before saving
leaveSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Validate that end date is after start date
leaveSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

export default mongoose.models.Leave || mongoose.model('Leave', leaveSchema);