// models/LeaveHours.js

import mongoose from 'mongoose';

const LeaveHoursSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  leaveType: {
    type: String,
    required: true,
    enum: [
      'annual',
      'sick',
      'personal',
      'maternity',
      'paternity',
      'bereavement',
      'emergency',
      'unpaid',
      'other'
    ],
  },
  date: {
    type: Date,
    required: true,
  },
  hours: {
    type: Number,
    required: true,
    min: 0.5,
    max: 24,
  },
  reason: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected'],
    default: 'pending',
  },
  isDraft: {
    type: Boolean,
    default: false,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  deletedBy: {
    type: String,
    default: null,
  },
  deletionReason: {
    type: String,
    default: null,
  },
  approvedBy: {
    type: String,
    default: null,
  },
  approvedAt: {
    type: Date,
    default: null,
  },
  rejectedBy: {
    type: String,
    default: null,
  },
  rejectedAt: {
    type: Date,
    default: null,
  },
  rejectionReason: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for better query performance
LeaveHoursSchema.index({ userId: 1, date: -1 });
LeaveHoursSchema.index({ status: 1 });
LeaveHoursSchema.index({ leaveType: 1 });
LeaveHoursSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
LeaveHoursSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for formatted date
LeaveHoursSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-GB');
});

// Virtual for leave type display
LeaveHoursSchema.virtual('leaveTypeDisplay').get(function() {
  const typeMap = {
    annual: 'Annual Leave',
    sick: 'Sick Leave',
    personal: 'Personal Leave',
    maternity: 'Maternity Leave',
    paternity: 'Paternity Leave',
    bereavement: 'Bereavement Leave',
    emergency: 'Emergency Leave',
    unpaid: 'Unpaid Leave',
    other: 'Other'
  };
  return typeMap[this.leaveType] || this.leaveType;
});

// Ensure virtual fields are serialized
LeaveHoursSchema.set('toJSON', { virtuals: true });
LeaveHoursSchema.set('toObject', { virtuals: true });

const LeaveHours = mongoose.models.LeaveHours || mongoose.model('LeaveHours', LeaveHoursSchema);

export default LeaveHours;