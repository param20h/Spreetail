require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const errorHandler = require('./src/middleware/errorHandler');

// Route files
const authRoutes = require('./src/routes/auth');
const groupsRoutes = require('./src/routes/groups');
const expensesRoutes = require('./src/routes/expenses');
const balancesRoutes = require('./src/routes/balances');
const settlementsRoutes = require('./src/routes/settlements');
const importRoutes = require('./src/routes/import');
const fxRatesRoutes = require('./src/routes/fxRates');

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middleware
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading static assets across domains
}));

const whitelist = ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];
if (process.env.FRONTEND_URL) {
  whitelist.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (whitelist.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api', expensesRoutes); // Mounts /groups/:id/expenses and /expenses/:id
app.use('/api/groups', balancesRoutes); // Mounts /groups/:id/balance and /groups/:id/balance/breakdown
app.use('/api/groups', settlementsRoutes); // Mounts /groups/:id/settlements
app.use('/api/import', importRoutes); // Mounts /import/preview, /import/confirm, /import/:session_id/report
app.use('/api/fx-rates', fxRatesRoutes); // Mounts /fx-rates and /fx-rates/current

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Centralized error handler middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
