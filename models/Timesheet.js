//models/Timesheet.js

import mongoose from 'mongoose';
const timesheetSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  date: { type: Date, required: true },
  start: {
    type: String,
    required: true,
    validate: {
      validator: (v) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
      message: (props) => `${props.value} is not a valid time format!`,
    },
  },
  end: {
    type: String,
    required: true,
    validate: {
      validator: (v) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
      message: (props) => `${props.value} is not a valid time format!`,
    },
  },
  isDraft: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add database indexes for performance
timesheetSchema.index({ username: 1, date: -1 });
timesheetSchema.index({ userId: 1, date: -1 });
timesheetSchema.index({ date: -1 });
timesheetSchema.index({ username: 1, isDraft: 1 });

// Update the updatedAt field before saving
timesheetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// const Timesheet =
export default mongoose.models.Timesheet ||
  mongoose.model('Timesheet', timesheetSchema);
