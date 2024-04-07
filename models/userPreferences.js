const mongoose = require('mongoose');

const { DateTime } = require('luxon');

const { Schema } = mongoose;

const userPreferencesSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true },
  currency: { type: String, default: 'EUR' },
  notificationTime: { type: String, default: '20:00' }, // HH:mm format
  budgetThreshold: { type: Number, default: 0 },
});

module.exports = mongoose.model('UserPreferences', userPreferencesSchema);
