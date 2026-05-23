const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { sendMail } = require('../config/email');

router.post('/test', protect, allowRoles('superadmin'), async (req, res) => {
  const { to, subject, message } = req.body;
  await sendMail({
    to,
    subject: subject || 'Test Email',
    text: message || 'This is a test email from the diagnostic backend.'
  });
  res.json({ message: 'Email sent' });
});

module.exports = router;
