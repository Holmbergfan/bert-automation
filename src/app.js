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

dotenv.config();

console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('BOT_API_PORT:', process.env.BOT_API_PORT);
console.log('BOT_API_KEY:', process.env.BOT_API_KEY);
console.log('Config.mongodbUri:', config.mongodbUri);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use express-ejs-layouts
app.use(expressLayouts);
app.set('layout', 'layout'); // Default layout file

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
mongoose.connect(config.mongodbUri)
  .then(() => {
    logger.info('Connected to MongoDB successfully.');

    // Schedule the scrapers after successful DB connection
    cron.schedule(config.scrapeInterval, () => {
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

    // Start the server after DB connection
    const PORT = process.env.PORT || config.port || 3000;
    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error(`Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  });
