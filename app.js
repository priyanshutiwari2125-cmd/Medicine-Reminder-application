require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { db, dbGet } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup EJS templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'medimind-super-secret-key-135',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Auto-login default Guest User (UserId = 1)
app.use(async (req, res, next) => {
  try {
    const user = await dbGet('SELECT Name FROM Users WHERE UserId = 1');
    req.session.userId = 1;
    req.session.userName = user ? user.Name : 'Guest User';
    next();
  } catch (error) {
    console.error('Error auto-logging guest user:', error);
    req.session.userId = 1;
    req.session.userName = 'Guest User';
    next();
  }
});

// Global views context variables (adds session to locals)
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.activePage = '';
  next();
});

// Import Routes
const medicineRoutes = require('./routes/medicines');
const dashboardRoutes = require('./routes/dashboard');
const historyRoutes = require('./routes/history');

// Mount Routes
app.use('/medicines', medicineRoutes);
app.use('/', dashboardRoutes); // handles / dashboard and /history/log
app.use('/history', historyRoutes);

// Catch 404 and redirect/render error
app.use((req, res) => {
  res.redirect('/');
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`MediMind Medicine Reminder Server started!`);
  console.log(`Local Access: http://localhost:${PORT}`);
  console.log(`==================================================`);
});

// Graceful database close on shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Closed the database connection.');
    }
    process.exit(0);
  });
});
