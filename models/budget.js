const mongoose = require('mongoose');

const { DateTime } = require('luxon');

const { Schema } = mongoose;

const budgetSchema = new mongoose.Schema({
  totalBudget: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Budget', budgetSchema);
