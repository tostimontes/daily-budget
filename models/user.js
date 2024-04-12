const mongoose = require('mongoose');

const { DateTime } = require('luxon');

const { Schema } = mongoose;

const userSchema = new mongoose.Schema({
  clerkId: String, // Unique identifier from Clerk
  displayName: String,
  email: String,
  // Add any other fields you find necessary
});

module.exports = mongoose.model('User', userSchema);
