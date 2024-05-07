const express = require('express');
const router = express.Router();
const { DateTime } = require('luxon');
const passport = require('passport');
const { genPassword } = require('../middleware/passwordUtils');

const Expenses = require('../models/expense');
const Budget = require('../models/budget');
const UserPreferences = require('../models/userPreferences');
const User = require('../models/user');

// Routes
router.get('/', async (req, res, next) => {
  if (!req.user) {
    res.redirect('/login');
  } else {
    try {
      const latestBudget = await Budget.findOne({ user: req.user._id }).sort({
        date: -1,
      });
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const expenses = await Expenses.find({
        user: req.user._id,
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      }).sort({
        date: -1,
      });

      const totalExpenses = expenses.reduce(
        (acc, exp) => acc + exp.amount,
        0,
        expenses
      );

      const month = new Date(
        today.getFullYear(),
        today.getMonth()
      ).toLocaleString('default', { month: 'long' });
      const daysInMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).getDate();
      const daysPassed = today.getDate();
      const daysRemaining = daysInMonth - daysPassed;

      const averageDailyBudget = latestBudget
        ? latestBudget.totalBudget / daysInMonth
        : 0;

      const remainingBudget = latestBudget
        ? latestBudget.totalBudget - totalExpenses
        : 0;

      const remainingBudgetPerDay =
        daysRemaining > 0 ? remainingBudget / daysRemaining : 0;
      const ongoingExpensesPerDay =
        daysPassed > 0 ? totalExpenses / daysPassed : 0;

      const userId = req.user._id;
      const preferences = (await UserPreferences.findOne({ userId })) || {};

      res.render('dashboard', {
        month,
        budget: latestBudget,
        expenses,
        averageDailyBudget,
        remainingBudget,
        remainingBudgetPerDay,
        ongoingExpensesPerDay,
        date: today.toDateString(),
        preferences,
      });
    } catch (error) {
      next(error);
    }
  }
});

// Login Route
router.get('/login', (req, res) => {
  var messages = req.flash('error');
  res.render('login', { messages: messages, hasErrors: messages.length > 0 });
});

router.post(
  '/login',
  passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true,
  }),
  function (req, res) {
    res.redirect('/');
  }
);

router.post('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

// Signup Route
router.get('/sign-up', (req, res, next) => res.render('sign-up'));

router.post('/sign-up', async (req, res, next) => {
  const { username, email, password } = req.body;
  try {
    const saltHash = genPassword(password);
    const salt = saltHash.salt;
    const hash = saltHash.hash;

    const newUser = new User({
      username,
      email,
      hash,
      salt,
    });

    await newUser.save();
    res.redirect('/login');
  } catch (error) {
    res.redirect('/sign-up');
  }
});

router.get('/settings', async (req, res, next) => {
  try {
    if (!req.user) {
      res.redirect('/');
      return;
    }

    const userId = req.user._id;
    const preferences = (await UserPreferences.findOne({ userId })) || {};

    res.render('settings', {
      preferences,
      user: req.user,
    });
  } catch (error) {
    console.error('Error loading settings:', error);
    res.status(500).send('Unable to load settings.');
  }
});

router.post('/settings', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { currency, notificationTime, budgetThreshold } = req.body;
    await UserPreferences.findOneAndUpdate(
      { userId },
      { currency, notificationTime, budgetThreshold },
      { upsert: true }
    );
    res.redirect('/settings');
  } catch (error) {
    res.status(500).send(error);
  }
});

// History Route
router.get('/history', async (req, res, next) => {
  if (!req.user) {
    res.redirect('/');
    return;
  }

  const expenses = await Expenses.find({ user: req.user._id }).sort({
    date: -1,
  });

  let monthlyExpenses = {};
  expenses.forEach((exp) => {
    const monthYear = DateTime.fromJSDate(exp.date).toFormat('MMMM yyyy');
    if (!monthlyExpenses[monthYear]) {
      monthlyExpenses[monthYear] = [];
    }
    monthlyExpenses[monthYear].push(exp);
  });

  res.render('history', { monthlyExpenses, expenseToEdit: null });
});

// Add Expense Route
router.post('/add-expense', async (req, res, next) => {
  const { name, amount } = req.body;
  const newExpense = new Expenses({
    name,
    amount,
    user: req.user._id,
  });
  await newExpense.save();
  res.redirect('/');
});
// Update Budget Route
router.post('/update-budget', async (req, res, next) => {
  try {
    const { budget } = req.body;

    const latestBudget = await Budget.findOneAndUpdate(
      { user: req.user._id },
      { totalBudget: budget, user: req.user._id },
      { new: true, upsert: true }
    );

    res.redirect('/');
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).send('Unable to update budget.');
  }
});

// Edit Expense Route
router.get('/history/edit-expense/:id', async (req, res, next) => {
  try {
    const expenseToEdit = await Expenses.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    const expenses = await Expenses.find({ user: req.user._id }).sort({
      date: -1,
    });

    if (!expenseToEdit) {
      return res.status(404).send('Expense not found or access denied');
    }

    let monthlyExpenses = {};
    expenses.forEach((exp) => {
      const monthYear = DateTime.fromJSDate(exp.date).toFormat('MMMM yyyy');
      if (!monthlyExpenses[monthYear]) {
        monthlyExpenses[monthYear] = [];
      }
      monthlyExpenses[monthYear].push(exp);
    });

    res.render('history', { monthlyExpenses, expenseToEdit });
  } catch (error) {
    next(error);
  }
});

router.get('/get-expense/:id', async (req, res, next) => {
  try {
    const expense = await Expenses.findById(req.params.id);
    if (!expense) {
      return res.status(404).send('Expense not found');
    }
    res.json(expense);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Update Expense POST route
router.post('/update-expense/:id', async (req, res, next) => {
  try {
    const { amount } = req.body;
    const expense = await Expenses.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!expense) {
      return res.status(404).send('Expense not found or access denied');
    }

    expense.amount = amount;
    await expense.save();

    res.redirect('/history');
  } catch (error) {
    next(error);
  }
});

// Delete Expense Route
router.get('/delete-expense/:id', async (req, res, next) => {
  await Expenses.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.redirect('/history');
});

module.exports = router;
