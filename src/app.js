const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const labRoutes = require('./routes/labRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reportRoutes = require('./routes/reportRoutes');
const couponRoutes = require('./routes/couponRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const pageRoutes = require('./routes/pageRoutes');
const blogRoutes = require('./routes/blogRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const settingRoutes = require('./routes/settingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const emailRoutes = require('./routes/emailRoutes');
const searchRoutes = require('./routes/searchRoutes');
const heroSlideRoutes = require('./routes/heroSlideRoutes');
const brandRoutes = require('./routes/brandRoutes');
const crmRoutes = require('./routes/crmRoutes');
const leadRoutes = require('./routes/leadRoutes');
const referralDoctorRoutes = require('./routes/referralDoctorRoutes');
const followUpRoutes = require('./routes/followUpRoutes');
const labCrmRoutes = require('./routes/labCrmRoutes');
const testMasterRoutes = require('./routes/testMasterRoutes');
const homeContentRoutes = require('./routes/homeContentRoutes');
const labChangeRequestRoutes = require('./routes/labChangeRequestRoutes');

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

app.use('/uploads', express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads')));

app.get('/', (req, res) => {
  res.json({
    name: 'Diagnostic Marketplace API',
    status: 'ok'
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/labs', labRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/pages', pageRoutes);
app.use('/api/v1/blogs', blogRoutes);
app.use('/api/v1/newsletter', newsletterRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/settings', settingRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/email', emailRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/hero-slides', heroSlideRoutes);
app.use('/api/v1/brands', brandRoutes);
app.use('/api/v1/crm', crmRoutes);
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/referral-doctors', referralDoctorRoutes);
app.use('/api/v1/follow-ups', followUpRoutes);
app.use('/api/v1/lab-crm', labCrmRoutes);
app.use('/api/v1/test-master', testMasterRoutes);
app.use('/api/v1/home-content', homeContentRoutes);
app.use('/api/v1/lab-change-requests', labChangeRequestRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
