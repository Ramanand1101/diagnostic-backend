# Diagnostic Lab Marketplace Backend

Backend for a diagnostic lab booking marketplace built with Node.js, Express, MongoDB, and Mongoose.

## Included modules
- Authentication and role-based access
- Super admin / sub admin / lab / customer support
- Labs, categories, tests, packages, medicines
- Booking and guest checkout support
- Coupon system
- Reviews and sentiment tags
- Report upload and shareable links
- Prescription upload to S3
- Email sending with OTP
- OTP login / signup / email verification
- Algolia search integration
- Pages and blogs for SEO content
- Newsletter and support tickets
- Dashboard stats
- Seed data

## Upload storage
Uploads use **AWS S3** instead of local disk storage.

## Email and OTP
Set these env variables:
- EMAIL_HOST
- EMAIL_PORT
- EMAIL_USER
- EMAIL_PASS
- EMAIL_FROM
- OTP_EXPIRY_MINUTES
- OTP_LENGTH

### OTP endpoints
- POST /api/v1/auth/send-otp
- POST /api/v1/auth/verify-otp

### Test email endpoint
- POST /api/v1/email/test

## Algolia search
Set these env variables:
- ALGOLIA_APP_ID
- ALGOLIA_ADMIN_API_KEY
- ALGOLIA_SEARCH_API_KEY
- ALGOLIA_INDEX_PREFIX

### Search endpoints
- GET /api/v1/search?q=cbc&type=all
- POST /api/v1/search/reindex/labs
- POST /api/v1/search/reindex/products
- POST /api/v1/search/reindex/pages

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Seed demo data

```bash
npm run seed
```

## Main endpoints
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/send-otp
- POST /api/v1/auth/verify-otp
- GET /api/v1/labs
- GET /api/v1/labs/nearby
- GET /api/v1/labs/compare?ids=id1,id2
- GET /api/v1/products
- GET /api/v1/bookings
- POST /api/v1/bookings
- POST /api/v1/reports
- POST /api/v1/uploads/prescription
- GET /api/v1/pages/:slug
- GET /api/v1/blogs/:slug
- POST /api/v1/newsletter/subscribe
- GET /api/v1/dashboard/stats
