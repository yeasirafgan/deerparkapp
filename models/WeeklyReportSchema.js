// models/WeeklyReportSchema.js
import mongoose from 'mongoose';

const weeklyReportSchema = new mongoose.Schema({
  username: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalHours: { type: Number, default: 0 },
});

export default mongoose.models.WeeklyReportSchema ||
  mongoose.model('WeeklyReportSchema', weeklyReportSchema);
