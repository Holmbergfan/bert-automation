// src/app.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const cron = require('node-cron');
const expressLayouts = require('express-ejs-layouts');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const flash = require('connect-flash');

const config = require('./config/config');
const logger = require('./utils/logger');
const scrapeWhoIsOnline = require('./scrapers/WhoIsOnlineScraper');
const scrapePlayerDetails = require('./scrapers/playerDetailsScraper');
const scrapeDeathRecorder = require('./scrapers/deathRecorder'); // Import the deathRecorder
const routes = require('./routes/index');
const ts3Routes = require('./routes/ts3');
const deathRoutes = require('./routes/deaths'); // Death Routes
const bodyParser = require('body-parser');
const apiPlayersRouter = require('./routes/api/players');
const botController = require('./controllers/botController'); // Adjust the path
const botRoutes = require('./routes/bot'); // Adjust the path

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use the bot controller routes
app.use('/api', botController); // '/api' is a base path you can change as needed

// Use express-ejs-layouts
app.use(expressLayouts);
app.set('layout', 'layout'); // Default layout file

app.use('/bot', botRoutes);  // Adjust this to match your project setup

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Middleware to parse URL-encoded data and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API Routes
app.use('/api/players', apiPlayersRouter);

// Express session middleware
app.use(session({
  secret: 'your_secret_key', // Replace with a strong secret in production
  resave: false,
  saveUninitialized: false,
}));

// Connect flash
app.use(flash());

// Middleware to set flash messages to res.locals
app.use((req, res, next) => {
  res.locals.message = req.flash('message'); // For success messages
  res.locals.error = req.flash('error'); // For error messages
  next();
});

// Use Routes
app.use('/', routes);
app.use('/ts3', ts3Routes);
app.use('/deaths', deathRoutes); // Use Death Routes

// Socket.io for real-time updates (optional)
io.on('connection', (socket) => {
  logger.info('New client connected');
  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB successfully.');

    // Schedule the scrapers after successful DB connection
    cron.schedule('*/30 * * * *', () => {
      logger.info('Running Who Is Online Scraper...');
      scrapeWhoIsOnline(); // Removed 'io' parameter as it's not used in the scraper
    });

    cron.schedule('0 * * * *', () => {
      logger.info('Running Player Details Scraper...');
      scrapePlayerDetails();
    });

    cron.schedule('*/5 * * * *', () => { // Runs every 5 minutes
      logger.info('Running Death Recorder Scraper...');
      scrapeDeathRecorder();
    });
  })
  .catch(err => {
    logger.error('Failed to connect to MongoDB:', err);
    process.exit(1); // Exit if DB connection fails
  });

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});