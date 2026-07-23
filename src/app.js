const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const timeout    = require('connect-timeout');
const path       = require('path');

const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { publicLimiter, authLimiter, otpLimiter } = require('./middleware/rateLimiter');

// ── Routes ──────────────────────────────────────────────────────────────────
const authRoutes           = require('./routes/authRoutes');
const userRoutes           = require('./routes/userRoutes');
const labRoutes            = require('./routes/labRoutes');
const categoryRoutes       = require('./routes/categoryRoutes');
const productRoutes        = require('./routes/productRoutes');
const bookingRoutes        = require('./routes/bookingRoutes');
const reportRoutes         = require('./routes/reportRoutes');
const couponRoutes         = require('./routes/couponRoutes');
const reviewRoutes         = require('./routes/reviewRoutes');
const pageRoutes           = require('./routes/pageRoutes');
const blogRoutes           = require('./routes/blogRoutes');
const newsletterRoutes     = require('./routes/newsletterRoutes');
const ticketRoutes         = require('./routes/ticketRoutes');
const settingRoutes        = require('./routes/settingRoutes');
const dashboardRoutes      = require('./routes/dashboardRoutes');
const uploadRoutes         = require('./routes/uploadRoutes');
const emailRoutes          = require('./routes/emailRoutes');
const searchRoutes         = require('./routes/searchRoutes');
const heroSlideRoutes      = require('./routes/heroSlideRoutes');
const brandRoutes          = require('./routes/brandRoutes');
const crmRoutes            = require('./routes/crmRoutes');
const leadRoutes           = require('./routes/leadRoutes');
const referralDoctorRoutes = require('./routes/referralDoctorRoutes');
const followUpRoutes       = require('./routes/followUpRoutes');
const labCrmRoutes         = require('./routes/labCrmRoutes');
const testMasterRoutes     = require('./routes/testMasterRoutes');
const homeContentRoutes    = require('./routes/homeContentRoutes');
const labChangeRequestRoutes = require('./routes/labChangeRequestRoutes');

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS — whitelist only (never open to any origin) ─────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (!ALLOWED_ORIGINS.length) {
  // Dev fallback — allow localhost only
  ALLOWED_ORIGINS.push('http://localhost:3000', 'http://localhost:3001');
}

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Gzip compression — reduces payload size 5-8× ────────────────────────────
app.use(compression());

// ── Request timeout — prevent slow DB queries from holding connections forever
app.use(timeout('20s'));
app.use((req, res, next) => {
  if (!req.timedout) next();
});

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));   // Apache-format for log aggregators
} else {
  app.use(morgan('dev'));
}

// ── Static files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads')));

// ── Health check (no rate limit, no auth) ────────────────────────────────────
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const { isReady } = require('./config/redis');
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    pid: process.pid,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: isReady() ? 'connected' : 'unavailable',
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    env: process.env.NODE_ENV || 'development',
  });
});

app.get('/', (req, res) => res.json({ name: 'Diagnostic Marketplace API', status: 'ok' }));

// ── Auth routes (strict rate limits) ─────────────────────────────────────────
app.use('/api/v1/auth/send-otp',    otpLimiter);
app.use('/api/v1/auth/verify-otp',  otpLimiter);
app.use('/api/v1/auth/login',       authLimiter);
app.use('/api/v1/auth/register',    authLimiter);
app.use('/api/v1/auth',             authRoutes);

// ── Public API routes (standard rate limit) ───────────────────────────────────
app.use(publicLimiter);

app.use('/api/v1/users',              userRoutes);
app.use('/api/v1/labs',               labRoutes);
app.use('/api/v1/categories',         categoryRoutes);
app.use('/api/v1/products',           productRoutes);
app.use('/api/v1/bookings',           bookingRoutes);
app.use('/api/v1/reports',            reportRoutes);
app.use('/api/v1/coupons',            couponRoutes);
app.use('/api/v1/reviews',            reviewRoutes);
app.use('/api/v1/pages',              pageRoutes);
app.use('/api/v1/blogs',              blogRoutes);
app.use('/api/v1/newsletter',         newsletterRoutes);
app.use('/api/v1/tickets',            ticketRoutes);
app.use('/api/v1/settings',           settingRoutes);
app.use('/api/v1/dashboard',          dashboardRoutes);
app.use('/api/v1/uploads',            uploadRoutes);
app.use('/api/v1/email',              emailRoutes);
app.use('/api/v1/search',             searchRoutes);
app.use('/api/v1/hero-slides',        heroSlideRoutes);
app.use('/api/v1/brands',             brandRoutes);
app.use('/api/v1/crm',                crmRoutes);
app.use('/api/v1/leads',              leadRoutes);
app.use('/api/v1/referral-doctors',   referralDoctorRoutes);
app.use('/api/v1/follow-ups',         followUpRoutes);
app.use('/api/v1/lab-crm',            labCrmRoutes);
app.use('/api/v1/test-master',        testMasterRoutes);
app.use('/api/v1/home-content',       homeContentRoutes);
app.use('/api/v1/lab-change-requests', labChangeRequestRoutes);

// ── Error handlers ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
