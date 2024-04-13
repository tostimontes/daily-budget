require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const { ensureUser } = require('./middleware/auth');

const Expenses = require('./models/expense');
const Budget = require('./models/budget');
const User = require('./models/user'); // Import the User model

const engine = require('ejs-mate');
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

// Set up mongoose connection
mongoose.set('strictQuery', false);
// Load configuration from .env file
const mongoDB = process.env.CONNECTION_STRING;

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(mongoDB);
}

// Middleware to fetch common data
async function fetchData(req, res, next) {
  if (req.user) {
    try {
      const latestBudget = await Budget.findOne({ user: req.user._id }).sort({
        date: -1,
      });
      const expenses = await Expenses.find({ user: req.user._id }).sort({
        date: -1,
      });

      req.latestBudget = latestBudget;
      req.expenses = expenses;
    } catch (error) {
      res.status(500).send(error);
    }
  }
  next();
}

app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(fetchData);
app.use(ensureUser);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/mdi', express.static(`${__dirname}/node_modules/@mdi/font`));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
