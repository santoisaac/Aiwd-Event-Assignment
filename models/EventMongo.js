const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  summary: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  capacity: { type: Number, required: true, min: 1 },
  heroImage: { type: String, default: '' },
  published: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

eventSchema.index({ startAt: 1 });
eventSchema.index({ category: 1 });

module.exports = mongoose.model('Event', eventSchema);