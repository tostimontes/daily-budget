const express = require('express');
// const passport = require('passport');

const router = express.Router();
const { DateTime } = require('luxon');
const passport = require('passport');
const { genPassword } = require('../middleware/passwordUtils'); // Assume you have this utility for hashing passwords

const Expenses = require('../models/expense');
const Budget = require('../models/budget');
const UserPreferences = require('../models/userPreferences');
const User = require('../models/user');

// Routes
// Dashboard Route
router.get('/', async (req, res, next) => {
  console.log(`User: ${req.user}`);
  if (!req.user) {
    res.redirect('/login');
  } else {
    try {
      // Fetch the latest budget and expenses for the logged-in user
      const latestBudget = await Budget.findOne({ user: req.user._id }).sort({
        date: -1,
      });
      const expenses = await Expenses.find({ user: req.user._id }).sort({
        date: -1,
      });

      // If no expenses or budget, set default values
      const totalExpenses = expenses.reduce(
        (acc, exp) => acc + exp.amount,
        0,
        expenses
      );

      // Calculate remaining days in the month and days passed
      const today = new Date();
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

      // Calculate the recommended average daily expense
      const averageDailyBudget = latestBudget
        ? latestBudget.totalBudget / daysInMonth
        : 0;

      // Calculate remaining budget
      const remainingBudget = latestBudget
        ? latestBudget.totalBudget - totalExpenses
        : 0;

      // Calculate remaining budget per day and ongoing expenses per day
      const remainingBudgetPerDay =
        daysRemaining > 0 ? remainingBudget / daysRemaining : 0;
      const ongoingExpensesPerDay =
        daysPassed > 0 ? totalExpenses / daysPassed : 0;

      const userId = req.user._id; // Replace with your method of getting the current user
      const preferences = (await UserPreferences.findOne({ userId })) || {};

      res.render('dashboard', {
        month: month,
        budget: latestBudget,
        expenses: expenses,
        averageDailyBudget,
        remainingBudget,
        remainingBudgetPerDay,
        ongoingExpensesPerDay,
        date: today.toDateString(),
        preferences, // Pass preferences to the dashboard
      });
    } catch (error) {
      next(error);
    }
  }
});

// Login Route
router.get('/login', (req, res) => res.render('login'));
router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true,
  })
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
router.get('/sign-up', (req, res) => res.render('sign-up'));
router.post('/sign-up', async (req, res) => {
  const { username, password } = req.body;
  try {
    const saltHash = genPassword(password);
    const salt = saltHash.salt;
    const hash = saltHash.hash;

    const newUser = new User({
      username,
      hash,
      salt,
    });

    await newUser.save();
    res.redirect('/login');
  } catch (error) {
    res.redirect('/sign-up');
  }
});

router.get('/settings', async (req, res) => {
  try {
    if (!req.user) {
      res.redirect('/'); // or redirect to login
      return;
    }

    const userId = req.user._id;
    const preferences = (await UserPreferences.findOne({ userId })) || {};

    res.render('settings', {
      preferences,
      user: req.user, // Pass the user data to the template
    });
  } catch (error) {
    console.error('Error loading settings:', error);
    res.status(500).send('Unable to load settings.');
  }
});

router.post('/settings', async (req, res) => {
  try {
    const userId = req.user._id; // Replace with your method of getting the current user
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
router.post('/add-expense', async (req, res) => {
  const { name, amount } = req.body;
  const newExpense = new Expenses({
    name,
    amount,
    user: req.user._id, // Save user ID with the expense
  });
  await newExpense.save();
  res.redirect('/');
});
// Update Budget Route
router.post('/update-budget', async (req, res) => {
  try {
    const { budget } = req.body;

    // Create a new budget or update the existing one for the logged-in user
    const latestBudget = await Budget.findOneAndUpdate(
      { user: req.user._id }, // Find the latest budget for this user
      { totalBudget: budget, user: req.user._id }, // Update the budget value and confirm the user
      { new: true, upsert: true } // Options to create a new one if it doesn't exist
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
