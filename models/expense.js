const mongoose = require('mongoose');

const { DateTime } = require('luxon');

const { Schema } = mongoose;

const expenseSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, default: null }, // Optional name field
  amount: {
    type: Number,
    required: [true, 'An expense needs an amount.'],
  },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Expense', expenseSchema);
