const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const { DateTime } = require('luxon');

const { Schema } = mongoose;

const userSchema = new Schema({
  username: String,
  hash: String,
  salt: String,
});

module.exports = mongoose.model('User', userSchema);
