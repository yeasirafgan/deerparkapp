// mainfolder/models/WeeklySummary.js

import mongoose from 'mongoose';

const WeeklySummarySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    username: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalHours: {
      type: Number,
      default: 0,
      min: [0, 'Total hours cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.WeeklySummary ||
  mongoose.model('WeeklySummary', WeeklySummarySchema);
