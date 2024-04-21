require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
require('./middleware/passport');

const MongoStore = require('connect-mongo');
const Expenses = require('./models/expense');
const Budget = require('./models/budget');
const User = require('./models/user');
const engine = require('ejs-mate');
const indexRouter = require('./routes/index');

const app = express();

// Set up mongoose connection
mongoose.set('strictQuery', false);
const mongoDB = process.env.CONNECTION_STRING;
mongoose.connect(mongoDB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const sessionStore = MongoStore.create({
  mongoUrl: mongoDB,
  collection: 'sessions',
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

app.use(flash());

app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/mdi', express.static(`${__dirname}/node_modules/@mdi/font`));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Passport and session debugging middleware
app.use((req, res, next) => {
  console.log(req.session);
  console.log(req.user);
  next();
});

app.use('/', indexRouter);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
