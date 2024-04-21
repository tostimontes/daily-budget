const mongoose = require('mongoose');
const { DateTime } = require('luxon');

const { Schema } = mongoose;

const userSchema = new Schema({
  username: String,
  email: String,
  hash: String,
  salt: String,
});

module.exports = mongoose.model('User', userSchema);
