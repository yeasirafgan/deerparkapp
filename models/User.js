import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  kindeUserId: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
