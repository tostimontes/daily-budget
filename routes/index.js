const express = require('express');

const router = express.Router();

const Expenses = require('../models/expense');
const Budget = require('../models/budget');

/* GET home page. */
// router.get('/', function (req, res, next) {
//   res.render('index', { title: 'Daily Budget' });
// });

// Routes
// Dashboard Route
router.get('/', async (req, res, next) => {
  const { latestBudget, expenses } = req;

  // Calculate total ongoing expenses
  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  // Calculate remaining days in the month and days passed
  const today = new Date();
  const month = new Date(today.getFullYear(), today.getMonth()).toLocaleString(
    'default',
    { month: 'long' }
  );
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
  const ongoingExpensesPerDay = daysPassed > 0 ? totalExpenses / daysPassed : 0;

  res.render('dashboard', {
    month: month,
    budget: latestBudget,
    expenses: expenses,
    averageDailyBudget,
    remainingBudget,
    remainingBudgetPerDay,
    ongoingExpensesPerDay,
    date: today.toDateString(),
  });
});

// History Route
router.get('/history', async (req, res, next) => {
  const { expenses } = req;
  res.render('history', { expenses: expenses, expenseToEdit: null });
});

// Add Expense Route
router.post('/add-expense', async (req, res, next) => {
  const { name, amount } = req.body;
  const newExpense = new Expenses({ name, amount });
  await newExpense.save();
  res.redirect('/');
});

// Update Budget Route
router.post('/update-budget', async (req, res, next) => {
  const newBudget = new Budget({ totalBudget: req.body.budget });
  await newBudget.save();
  res.redirect('/');
});

// Edit Expense Route
router.get('/history/edit-expense/:id', async (req, res, next) => {
  try {
    const expenseToEdit = await Expenses.findById(req.params.id);
    const expenses = await Expenses.find({}).sort({ date: -1 }); // Fetch all expenses for history view
    if (!expenseToEdit) {
      return res.status(404).send('Expense not found');
    }
    res.render('history', { expenses, expenseToEdit });
  } catch (error) {
    next(error);
  }
});
// Update Expense POST route
router.post('/update-expense/:id', async (req, res, next) => {
  try {
    const { amount } = req.body;
    await Expenses.findByIdAndUpdate(req.params.id, { amount });
    res.redirect('/');
  } catch (error) {
    next(error);
  }
});

// Delete Expense Route
router.get('/delete-expense/:id', async (req, res, next) => {
  // Delete the expense by ID and redirect
  await Expenses.findByIdAndDelete(req.params.id);
  res.redirect('/history');
});

module.exports = router;
